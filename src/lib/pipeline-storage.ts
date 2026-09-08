import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCENE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const INTERMEDIATE_PREFIXES = ['audio_', 'kling_', 'sync_', 'anchor_', 'lastframe_'];

export type SceneCheckpoint = {
    audioExists: boolean;
    videoExists: boolean;
    audioPath?: string;
    videoPath?: string;
};

// ponytail: Helper direto para checagem e reuso de checkpoint de cena sem dependências extras
export function getSceneCheckpoint(storageDir: string, jobId: string, sceneId: string): SceneCheckpoint {
    if (!JOB_ID_PATTERN.test(jobId)) {
        throw new Error(`Invalid pipeline job ID: ${jobId}`);
    }
    if (!SCENE_ID_PATTERN.test(sceneId)) {
        throw new Error(`Invalid scene ID for checkpoint: ${sceneId}`);
    }

    const audioPath = path.join(storageDir, `audio_${jobId}_${sceneId}.mp3`);
    const videoPath = path.join(storageDir, `sync_${jobId}_${sceneId}.mp4`);

    const audioExists = existsSync(audioPath) && statSync(audioPath).size > 0;
    const videoExists = existsSync(videoPath) && statSync(videoPath).size > 0;

    return {
        audioExists,
        videoExists,
        audioPath: audioExists ? audioPath : undefined,
        videoPath: videoExists ? videoPath : undefined,
    };
}

// BK-16: arquivo não vazio não é garantia de mídia íntegra. Antes de reutilizar um
// checkpoint (e economizar geração paga), confere com ffprobe se o stream esperado
// existe e tem duração real — checkpoint corrompido não é reutilizado.
export type ValidatedSceneCheckpoint = {
    audioValid: boolean;
    videoValid: boolean;
    audioPath?: string;
    videoPath?: string;
};

function probeMediaDuration(filePath: string, stream: 'audio' | 'video'): Promise<number | null> {
    return new Promise((resolve) => {
        const fp = spawn('ffprobe', [
            '-v', 'error',
            '-select_streams', stream === 'video' ? 'v:0' : 'a:0',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            filePath,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        fp.stdout.on('data', (d) => (out += d));
        fp.on('error', () => resolve(null));
        fp.on('close', (code) => {
            const duration = parseFloat(out.trim());
            resolve(code === 0 && Number.isFinite(duration) ? duration : null);
        });
    });
}

export async function validateSceneArtifacts(checkpoint: SceneCheckpoint): Promise<ValidatedSceneCheckpoint> {
    const audioDuration = checkpoint.audioExists && checkpoint.audioPath
        ? await probeMediaDuration(checkpoint.audioPath, 'audio')
        : null;
    const videoDuration = checkpoint.videoExists && checkpoint.videoPath
        ? await probeMediaDuration(checkpoint.videoPath, 'video')
        : null;
    const audioValid = audioDuration !== null && audioDuration > 0.1;
    const videoValid = videoDuration !== null && videoDuration > 0.1;
    return {
        audioValid,
        videoValid,
        audioPath: audioValid ? checkpoint.audioPath : undefined,
        videoPath: videoValid ? checkpoint.videoPath : undefined,
    };
}

// BK-16 (fala inteira): duração real de um áudio sintetizado, para dimensionar o
// clipe do Kling sem truncar a fala no mux (-shortest). null = não medível.
export function probeAudioDuration(filePath: string): Promise<number | null> {
    return probeMediaDuration(filePath, 'audio');
}

export function cleanupPipelineIntermediates(storageDir: string, jobId: string) {
    if (!JOB_ID_PATTERN.test(jobId)) {
        throw new Error(`Invalid pipeline cleanup job ID: ${jobId}`);
    }

    const prefixes = INTERMEDIATE_PREFIXES.map(prefix => `${prefix}${jobId}_`);
    const removed: string[] = [];
    for (const filename of readdirSync(storageDir)) {
        if (!prefixes.some(prefix => filename.startsWith(prefix))) continue;
        unlinkSync(path.join(storageDir, filename));
        removed.push(filename);
    }
    return removed;
}
