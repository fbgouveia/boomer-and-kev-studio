import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchPredictionOutcome, reconciliationAction } from '../src/lib/reconciliation';

const stubClient = (response: Record<string, unknown> | Error) => ({
    predictions: {
        get: async () => {
            if (response instanceof Error) throw response;
            return response;
        },
    },
});

describe('fetchPredictionOutcome + reconciliationAction — BK-17', () => {
    it('succeeded com output em array => REUSE com a primeira URL', async () => {
        const outcome = await fetchPredictionOutcome(
            stubClient({ status: 'succeeded', output: ['https://video.example/a.mp4'] }),
            'pred-1',
        );
        assert.deepEqual(outcome, { kind: 'succeeded', outputUrl: 'https://video.example/a.mp4' });
        assert.equal(reconciliationAction(outcome), 'REUSE');
    });

    it('succeeded com output string única => REUSE', async () => {
        const outcome = await fetchPredictionOutcome(
            stubClient({ status: 'succeeded', output: 'https://video.example/b.mp4' }),
            'pred-2',
        );
        assert.equal(reconciliationAction(outcome), 'REUSE');
    });

    it('succeeded sem output utilizável => falha confirmada => RELAUNCH', async () => {
        const outcome = await fetchPredictionOutcome(stubClient({ status: 'succeeded', output: [] }), 'pred-3');
        assert.equal(reconciliationAction(outcome), 'RELAUNCH');
    });

    it('failed e canceled => RELAUNCH (falha confirmada permite nova predição)', async () => {
        const failed = await fetchPredictionOutcome(
            stubClient({ status: 'failed', error: 'gpu oom' }),
            'pred-4',
        );
        assert.equal(reconciliationAction(failed), 'RELAUNCH');

        const canceled = await fetchPredictionOutcome(stubClient({ status: 'canceled' }), 'pred-5');
        assert.equal(reconciliationAction(canceled), 'RELAUNCH');
    });

    it('processing e starting => KEEP_POLLING (sem nova cobrança)', async () => {
        const processing = await fetchPredictionOutcome(stubClient({ status: 'processing' }), 'pred-6');
        assert.equal(reconciliationAction(processing), 'KEEP_POLLING');

        const starting = await fetchPredictionOutcome(stubClient({ status: 'starting' }), 'pred-7');
        assert.equal(reconciliationAction(starting), 'KEEP_POLLING');
    });

    it('erro de rede na consulta => RECONCILE_UNAVAILABLE (nunca predição nova às cegas)', async () => {
        const outcome = await fetchPredictionOutcome(stubClient(new Error('connection refused')), 'pred-8');
        assert.equal(outcome.kind, 'unknown');
        assert.equal(reconciliationAction(outcome), 'RECONCILE_UNAVAILABLE');
    });

    it('status desconhecido do provedor => RECONCILE_UNAVAILABLE', async () => {
        const outcome = await fetchPredictionOutcome(stubClient({ status: 'weird_state' }), 'pred-9');
        assert.equal(reconciliationAction(outcome), 'RECONCILE_UNAVAILABLE');
    });
});
