import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { mergeJobUpdate, writeJsonAtomic } from '@/lib/pipeline-job-state';

describe('writeJsonAtomic — persistência crítica do job', () => {
    let dir = '';

    beforeEach(async () => {
        dir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-jobstate-'));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it('grava JSON válido atomicamente e não deixa temporário', async () => {
        const filePath = path.join(dir, 'job_x.json');
        writeJsonAtomic(filePath, { status: 'PROCESSING', logs: ['a'] });
        assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')), { status: 'PROCESSING', logs: ['a'] });
        assert.equal((await readdir(dir)).filter((name) => name.includes('.tmp.')).length, 0);
    });

    it('FALHA PROPAGA quando a gravação é impossível (sem diretório) — sem falso sucesso', async () => {
        const filePath = path.join(dir, 'nao-existe', 'job_x.json');
        assert.throws(() => writeJsonAtomic(filePath, { a: 1 }));
    });

    it('substituição preserva o conteúdo anterior quando a nova gravação falha', async () => {
        const filePath = path.join(dir, 'job_x.json');
        writeJsonAtomic(filePath, { v: 1 });
        assert.throws(() => writeJsonAtomic(path.join(dir, 'sub', 'outro.json'), {}));
        assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')), { v: 1 });
    });
});

describe('mergeJobUpdate — mescla imutável com logs anexados', () => {
    it('mantém logs anteriores e anexa os novos, sem mutar entrada', () => {
        const current = { status: 'PROCESSING', logs: ['um'] };
        const merged = mergeJobUpdate(current, { progress: 40, logs: ['dois'] });
        assert.equal(merged.progress, 40);
        assert.deepEqual(merged.logs, ['um', 'dois']);
        assert.deepEqual(current.logs, ['um']);
        assert.equal(typeof merged.updatedAt, 'string');
    });

    it('update sem logs conserva logs existentes', () => {
        const merged = mergeJobUpdate({ logs: ['x'] }, { progress: 1 });
        assert.deepEqual(merged.logs, ['x']);
        assert.equal(merged.progress, 1);
    });
});
