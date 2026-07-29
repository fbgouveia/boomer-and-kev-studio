import { readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTERMEDIATE_PREFIXES = ['audio_', 'kling_', 'sync_', 'anchor_', 'lastframe_'];

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
