import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanupPipelineIntermediates } from '@/lib/pipeline-storage';

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
