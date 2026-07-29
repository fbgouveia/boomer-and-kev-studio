import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { beginPaidOperation, completePaidOperation } from '@/lib/paid-operation';

describe('paid operation contract', () => {
    let storageDir = '';
    const now = Date.parse('2026-07-29T12:00:00.000Z');
    const approval = {
        confirmed: true,
        source: 'studio_ui',
        approvedAt: new Date(now).toISOString(),
    };

    beforeEach(async () => {
        storageDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-paid-test-'));
    });

    afterEach(async () => {
        await rm(storageDir, { recursive: true, force: true });
    });

    it('exige chave idempotente e aprovação humana recente', () => {
        const missingKey = beginPaidOperation({
            scope: 'video-generate',
            idempotencyKey: null,
            approval,
            payload: { prompt: 'test', approval },
            storageDir,
            now,
        });
        assert.equal(missingKey.kind, 'error');
        if (missingKey.kind === 'error') {
            assert.equal(missingKey.status, 400);
            assert.equal(missingKey.body.error, 'IDEMPOTENCY_KEY_REQUIRED');
        }

        const missingApproval = beginPaidOperation({
            scope: 'video-generate',
            idempotencyKey: 'test-key-1234567890',
            approval: undefined,
            payload: { prompt: 'test' },
            storageDir,
            now,
        });
        assert.equal(missingApproval.kind, 'error');
        if (missingApproval.kind === 'error') {
            assert.equal(missingApproval.status, 403);
            assert.equal(missingApproval.body.error, 'PAID_OPERATION_APPROVAL_REQUIRED');
        }
    });

    it('rejeita aprovação expirada ou no futuro', () => {
        for (const approvedAt of [
            new Date(now - 11 * 60_000).toISOString(),
            new Date(now + 61_000).toISOString(),
        ]) {
            const result = beginPaidOperation({
                scope: 'render',
                idempotencyKey: `test-key-${approvedAt}`,
                approval: { ...approval, approvedAt },
                payload: { approvedAt },
                storageDir,
                now,
            });
            assert.equal(result.kind, 'error');
            if (result.kind === 'error') {
                assert.equal(result.body.error, 'PAID_OPERATION_APPROVAL_EXPIRED');
            }
        }
    });

    it('reserva uma vez, bloqueia estado incerto e reproduz resposta concluída', () => {
        const input = {
            scope: 'render',
            idempotencyKey: 'test-key-1234567890',
            approval,
            payload: { scene: 1, approval },
            storageDir,
            now,
        };
        const first = beginPaidOperation(input);
        assert.equal(first.kind, 'reserved');

        const concurrent = beginPaidOperation(input);
        assert.equal(concurrent.kind, 'error');
        if (concurrent.kind === 'error') {
            assert.equal(concurrent.body.error, 'IDEMPOTENCY_IN_PROGRESS');
        }

        assert.equal(first.kind, 'reserved');
        if (first.kind !== 'reserved') return;
        completePaidOperation(first.reservation, {
            status: 200,
            body: { predictionId: 'provider-job-1' },
        });

        const replay = beginPaidOperation({
            ...input,
            now: now + 20 * 60_000,
        });
        assert.equal(replay.kind, 'replay');
        if (replay.kind === 'replay') {
            assert.deepEqual(replay.response.body, { predictionId: 'provider-job-1' });
        }
    });

    it('rejeita reutilização da chave com payload diferente', () => {
        const first = beginPaidOperation({
            scope: 'ai-sync',
            idempotencyKey: 'test-key-1234567890',
            approval,
            payload: { scene: 1, approval },
            storageDir,
            now,
        });
        assert.equal(first.kind, 'reserved');

        const conflict = beginPaidOperation({
            scope: 'ai-sync',
            idempotencyKey: 'test-key-1234567890',
            approval,
            payload: { scene: 2, approval },
            storageDir,
            now,
        });
        assert.equal(conflict.kind, 'error');
        if (conflict.kind === 'error') {
            assert.equal(conflict.body.error, 'IDEMPOTENCY_CONFLICT');
        }
    });

    it('remove registros com mais de sete dias antes de reservar novos', async () => {
        const oldInput = {
            scope: 'ai-voice',
            idempotencyKey: 'old-test-key-123456',
            approval: {
                ...approval,
                approvedAt: new Date(now - 8 * 24 * 60 * 60_000).toISOString(),
            },
            payload: { text: 'old' },
            storageDir,
            now: now - 8 * 24 * 60 * 60_000,
        };
        const old = beginPaidOperation(oldInput);
        assert.equal(old.kind, 'reserved');
        if (old.kind !== 'reserved') return;
        completePaidOperation(old.reservation, { status: 200, body: { kind: 'audio' } });

        const fresh = beginPaidOperation({
            scope: 'ai-voice',
            idempotencyKey: 'fresh-test-key-1234',
            approval,
            payload: { text: 'fresh', approval },
            storageDir,
            now,
        });
        assert.equal(fresh.kind, 'reserved');
        assert.equal((await readdir(storageDir)).filter(name => name.startsWith('paid_')).length, 1);
    });
});
