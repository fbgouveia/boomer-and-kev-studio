import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanupPipelineIntermediates, getSceneCheckpoint, validateSceneArtifacts } from '@/lib/pipeline-storage';

const execFileAsync = promisify(execFile);
// CI pode não ter ffmpeg; validação de mídia exige ffprobe. Local (macOS do projeto) tem.
const hasFfmpeg = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;

describe('cleanupPipelineIntermediates', () => {
    let storageDir = '';
    const jobId = '123e4567-e89b-42d3-a456-426614174000';
    const otherJobId = '123e4567-e89b-42d3-a456-426614174001';

    beforeEach(async () => {
        storageDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-pipeline-storage-'));
    });

    afterEach(async () => {
        await rm(storageDir, { recursive: true, force: true });
    });

    it('remove apenas intermediários do job e preserva estado/final/outros jobs', async () => {
        const removable = [
            `audio_${jobId}_scene-1.mp3`,
            `kling_${jobId}_scene-1.mp4`,
            `sync_${jobId}_scene-1.mp4`,
            `anchor_${jobId}_scene-1.jpg`,
            `lastframe_${jobId}_scene-2.jpg`,
        ];
        const preserved = [
            `job_${jobId}.json`,
            `final_${jobId}.mp4`,
            'idempotency_aabbcc.json',
            `audio_${otherJobId}_scene-1.mp3`,
            'operator-evidence.png',
        ];
        await Promise.all([...removable, ...preserved].map(filename =>
            writeFile(path.join(storageDir, filename), 'test'),
        ));

        assert.deepEqual(cleanupPipelineIntermediates(storageDir, jobId).sort(), removable.sort());
        assert.deepEqual((await readdir(storageDir)).sort(), preserved.sort());
    });

    it('recusa job ID inválido antes de tocar no diretório', async () => {
        await writeFile(path.join(storageDir, 'operator-evidence.png'), 'test');
        assert.throws(
            () => cleanupPipelineIntermediates(storageDir, '../../escape'),
            /Invalid pipeline cleanup job ID/,
        );
        assert.deepEqual(await readdir(storageDir), ['operator-evidence.png']);
    });
});

describe('getSceneCheckpoint', () => {
    let storageDir = '';
    const jobId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(async () => {
        storageDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-pipeline-storage-'));
    });

    afterEach(async () => {
        await rm(storageDir, { recursive: true, force: true });
    });

    it('identifica áudio e vídeo existentes e com tamanho maior que zero', async () => {
        const audioFile = path.join(storageDir, `audio_${jobId}_scene-1.mp3`);
        const videoFile = path.join(storageDir, `sync_${jobId}_scene-1.mp4`);
        await writeFile(audioFile, 'audio-data');
        await writeFile(videoFile, 'video-data');

        const checkpoint = getSceneCheckpoint(storageDir, jobId, 'scene-1');
        assert.equal(checkpoint.audioExists, true);
        assert.equal(checkpoint.videoExists, true);
        assert.equal(checkpoint.audioPath, audioFile);
        assert.equal(checkpoint.videoPath, videoFile);
    });

    it('retorna false quando arquivo não existe ou está vazio', async () => {
        const emptyAudio = path.join(storageDir, `audio_${jobId}_scene-2.mp3`);
        await writeFile(emptyAudio, ''); // 0 bytes

        const checkpoint = getSceneCheckpoint(storageDir, jobId, 'scene-2');
        assert.equal(checkpoint.audioExists, false);
        assert.equal(checkpoint.videoExists, false);
        assert.equal(checkpoint.audioPath, undefined);
        assert.equal(checkpoint.videoPath, undefined);
    });

    it('rejeita job ID ou scene ID inválidos para prevenir traversal', () => {
        assert.throws(
            () => getSceneCheckpoint(storageDir, 'invalid-id', 'scene-1'),
            /Invalid pipeline job ID/,
        );
        assert.throws(
            () => getSceneCheckpoint(storageDir, jobId, '../escape'),
            /Invalid scene ID for checkpoint/,
        );
    });
});

describe('validateSceneArtifacts — checkpoint por conteúdo, não por existência (BK-16)', () => {
    let storageDir = '';
    const jobId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(async () => {
        storageDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-checkpoint-validate-'));
    });

    afterEach(async () => {
        await rm(storageDir, { recursive: true, force: true });
    });

    const makeRealMedia = async (outPath: string, kind: 'audio' | 'video') => {
        const args = kind === 'audio'
            ? ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.5', outPath]
            : ['-f', 'lavfi', '-i', 'testsrc=duration=0.5:size=128x128:rate=15', outPath];
        await execFileAsync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
    };

    (hasFfmpeg ? it : it.skip)('valida áudio e vídeo reais gerados por ffmpeg', async () => {
        const audioFile = path.join(storageDir, `audio_${jobId}_scene-1.mp3`);
        const videoFile = path.join(storageDir, `sync_${jobId}_scene-1.mp4`);
        await makeRealMedia(audioFile, 'audio');
        await makeRealMedia(videoFile, 'video');

        const validated = await validateSceneArtifacts(getSceneCheckpoint(storageDir, jobId, 'scene-1'));
        assert.equal(validated.audioValid, true);
        assert.equal(validated.videoValid, true);
        assert.equal(validated.audioPath, audioFile);
        assert.equal(validated.videoPath, videoFile);
    });

    (hasFfmpeg ? it : it.skip)('rejeita arquivo não vazio que não é mídia íntegra', async () => {
        const fakeAudio = path.join(storageDir, `audio_${jobId}_scene-2.mp3`);
        const fakeVideo = path.join(storageDir, `sync_${jobId}_scene-2.mp4`);
        await writeFile(fakeAudio, 'texto qualquer não é mp3');
        await writeFile(fakeVideo, 'texto qualquer não é mp4');

        const validated = await validateSceneArtifacts(getSceneCheckpoint(storageDir, jobId, 'scene-2'));
        assert.equal(validated.audioValid, false);
        assert.equal(validated.videoValid, false);
        assert.equal(validated.audioPath, undefined);
        assert.equal(validated.videoPath, undefined);
    });

    it('checkpoint ausente => inválido sem tocar em ffprobe', async () => {
        const validated = await validateSceneArtifacts(getSceneCheckpoint(storageDir, jobId, 'scene-3'));
        assert.equal(validated.audioValid, false);
        assert.equal(validated.videoValid, false);
    });
});
