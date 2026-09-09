import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
    acquireResumeLease,
    evaluateResume,
    LEASE_TTL_MS,
    pipelineConfigHash,
    releaseResumeLease,
    resumeLeasePath,
} from '@/lib/resume-policy';
import type { RunPipelineInput } from '@/lib/validations';

const basePayload = {
    engine: 'kling',
    aspect: '9:16',
    voiceMode: 'kling_native',
    directorIdea: '',
    directorSnippet: '',
    wardrobe: {},
    voiceIds: { boomer: undefined, kev: undefined },
    script: [
        {
            id: 'scene-1',
            characterId: 'boomer',
            text: 'Fair dinkum!',
            shotType: 'WIDE',
            action: 'Boxes the air',
            emotion: 'Explosive',
            durationEst: 5,
            characterReference: undefined,
            studioReference: undefined,
        },
    ],
} satisfies Omit<RunPipelineInput, 'approval' | 'resumeJobId'>;

describe('pipelineConfigHash — identidade da versão aprovada (BK-16)', () => {
    it('mesma configuração => mesmo hash', () => {
        assert.equal(pipelineConfigHash(basePayload), pipelineConfigHash({ ...basePayload }));
    });

    it('texto do roteiro alterado => hash diferente', () => {
        const changed = { ...basePayload, script: [{ ...basePayload.script[0], text: 'Changed line!' }] };
        assert.notEqual(pipelineConfigHash(basePayload), pipelineConfigHash(changed));
    });

    it('aspect, wardrobe e voiceIds fazem parte da identidade', () => {
        assert.notEqual(
            pipelineConfigHash(basePayload),
            pipelineConfigHash({ ...basePayload, aspect: '16:9' }),
        );
        assert.notEqual(
            pipelineConfigHash(basePayload),
            pipelineConfigHash({ ...basePayload, wardrobe: { boomer: 'party hat' } }),
        );
        assert.notEqual(
            pipelineConfigHash(basePayload),
            pipelineConfigHash({ ...basePayload, voiceIds: { boomer: 'other-voice', kev: undefined } }),
        );
    });

    it('approval e resumeJobId NÃO fazem parte da identidade', () => {
        const withNoise = { ...basePayload, approval: undefined, resumeJobId: undefined } as Omit<RunPipelineInput, 'approval' | 'resumeJobId'> & { approval?: undefined; resumeJobId?: undefined };
        assert.equal(pipelineConfigHash(basePayload), pipelineConfigHash(withNoise));
    });
});

describe('evaluateResume — decisão de retomada (BK-16)', () => {
    const configHash = pipelineConfigHash(basePayload);

    it('resume idêntico sem worker ativo => takeover', () => {
        assert.deepEqual(
            evaluateResume({ configHash }, { configHash }, { isRunActive: false }),
            { action: 'takeover' },
        );
    });

    it('resume com conteúdo alterado => conflito explícito, nunca mistura de cache', () => {
        const otherHash = pipelineConfigHash({ ...basePayload, aspect: '16:9' });
        assert.deepEqual(
            evaluateResume({ configHash }, { configHash: otherHash }, { isRunActive: false }),
            { action: 'conflict', code: 'RESUME_CONFIG_CONFLICT' },
        );
    });

    it('job legado sem configHash => takeover (hash é adotado no resume)', () => {
        assert.deepEqual(
            evaluateResume({}, { configHash }, { isRunActive: false }),
            { action: 'takeover' },
        );
    });

    it('dois pedidos de resume simultâneos => no máximo um executor', () => {
        assert.deepEqual(
            evaluateResume({ configHash }, { configHash }, { isRunActive: true }),
            { action: 'conflict', code: 'RESUME_ACTIVE_WORKER' },
        );
    });
});

describe('acquireResumeLease — exclusividade entre processos (BK-16)', () => {
    let storageDir = '';
    const jobId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(async () => {
        storageDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-resume-lease-'));
    });

    afterEach(async () => {
        await rm(storageDir, { recursive: true, force: true });
    });

    it('primeiro resume adquire; segundo simultâneo é rejeitado', () => {
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-a', 1_000), { acquired: true });
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-b', 2_000), { acquired: false });
    });

    it('mesmo worker pode readquirir o próprio lease', () => {
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-a', 1_000), { acquired: true });
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-a', 2_000), { acquired: true });
    });

    it('lease vencido (worker morto) é assumido pelo novo worker', () => {
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-a', 1_000), { acquired: true });
        const afterTtl = 1_000 + LEASE_TTL_MS + 1;
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-b', afterTtl), { acquired: true });
        const lease = JSON.parse(readFileSync(resumeLeasePath(storageDir, jobId), 'utf8'));
        assert.equal(lease.workerInstanceId, 'worker-b');
    });

    it('worker vivo dentro do TTL mantém a exclusividade (painel sem contato não mata worker)', () => {
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-a', 1_000), { acquired: true });
        assert.deepEqual(
            acquireResumeLease(storageDir, jobId, 'worker-b', 1_000 + LEASE_TTL_MS - 1),
            { acquired: false },
        );
    });

    it('release libera para o próximo resume', async () => {
        acquireResumeLease(storageDir, jobId, 'worker-a', 1_000);
        assert.equal(releaseResumeLease(storageDir, jobId), true);
        assert.deepEqual(acquireResumeLease(storageDir, jobId, 'worker-b', 2_000), { acquired: true });
        // Leases liberados/estacionados não poluem o diretório de jobs com o mesmo nome.
        assert.ok(!existsSync(resumeLeasePath(storageDir, jobId).replace('.json', '')));
        assert.ok((await readdir(storageDir)).every(name => name.startsWith('lease_')));
    });

    it('lease inexistente no release => false sem lançar erro', () => {
        assert.equal(releaseResumeLease(storageDir, jobId), false);
    });
});
