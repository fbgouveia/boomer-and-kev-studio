import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
    planHiggsfieldRecovery,
    prepareHiggsfieldAnchorImage,
    launchHiggsfieldScene,
    pollHiggsfieldScene,
    resubmitHiggsfieldScene,
    sumReservedMicros,
    higgsfieldIdempotencyKey,
    higgsfieldOperationKey,
    type HiggsfieldSceneRequest,
} from '@/lib/higgsfield-scene';
import { HiggsfieldClient } from '@/lib/higgsfield';
import { HiggsfieldSceneError } from '@/lib/higgsfield-scene';
import { readBudgetSummary } from '@/lib/cost-ledger';
import { MICRO_PER_USD } from '@/lib/money';

const API_KEY = 'hf-scene-test-key-9876543210';
const OFFICIAL = 'https://api.higgsfield.ai';
const MODEL = 'kling-video/v3.0/pro/image-to-video';
const CAP = 30 * MICRO_PER_USD;
const STATUS_URL = `${OFFICIAL}/v1/requests/req-1`;

type CapturedCall = { url: string; init: RequestInit };

type Harness = {
    ledgerDir: string;
    calls: CapturedCall[];
    persisted: HiggsfieldSceneRequest[];
    logs: string[];
    handler: (url: string, init: RequestInit) => Response | Promise<Response>;
    setHandler: (next: Harness['handler']) => void;
    client: HiggsfieldClient;
    capMicros: number;
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function buildHarness(initial: Harness['handler'], capMicros = CAP): Promise<Harness> {
    const ledgerDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-hf-scene-'));
    const state: { handler: Harness['handler'] } = { handler: initial };
    const calls: CapturedCall[] = [];
    const persisted: HiggsfieldSceneRequest[] = [];
    const logs: string[] = [];
    const impl = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const captured: CapturedCall = { url, init: (init ?? {}) as RequestInit };
        calls.push(captured);
        return state.handler(url, captured.init);
    }) as typeof fetch;
    return {
        ledgerDir,
        calls,
        persisted,
        logs,
        handler: initial,
        setHandler: (next) => { state.handler = next; },
        client: new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl }),
        capMicros,
    };
}

const estimateOkHandler: Harness['handler'] = (url, init) => {
    if (url.startsWith(`${OFFICIAL}/estimate/`)) {
        return jsonResponse({ type: 'estimate', usd: '0.714' });
    }
    if (url === `${OFFICIAL}/${MODEL}`) {
        return jsonResponse({
            request_id: 'req-1',
            status_url: STATUS_URL,
            cancel_url: `${STATUS_URL}/cancel`,
        });
    }
    return jsonResponse({ error: 'unexpected ' + url + ' ' + init.method }, 500);
};

const launchParams = (harness: Harness, over: Partial<Parameters<typeof launchHiggsfieldScene>[0]> = {}) => ({
    jobId: '11111111-1111-4111-8111-111111111111',
    sceneId: 'scene1',
    attempt: 1,
    anchor: 'https://cdn.example/anchor.jpg',
    prompt: 'SPEECH: says hi',
    duration: 5,
    sound: 'on' as const,
    client: harness.client,
    model: MODEL,
    ledgerDir: harness.ledgerDir,
    capMicros: harness.capMicros,
    persistRequest: (record: HiggsfieldSceneRequest) => { harness.persisted.push(structuredClone(record)); },
    log: (message: string) => { harness.logs.push(message); },
    ...over,
});

async function cleanup(harness?: Harness | Harness[]) {
    const list = Array.isArray(harness) ? harness : harness ? [harness] : [];
    for (const h of list) await rm(h.ledgerDir, { recursive: true, force: true });
}

describe('launchHiggsfieldScene — fluxo completo com transporte simulado', () => {
    let harness: Harness;

    beforeEach(async () => {
        harness = await buildHarness(estimateOkHandler);
    });

    afterEach(async () => {
        await cleanup(harness);
    });

    it('cota → reserva → persiste ANTES do POST → submete → persiste requestId', async () => {
        const record = await launchHiggsfieldScene(launchParams(harness));

        assert.equal(record.requestId, 'req-1');
        assert.equal(record.statusUrl, STATUS_URL);
        assert.equal(record.estimatedUsdMicros, 714_000);
        assert.equal(record.reservedUsdMicros, 714_000);
        assert.equal(record.provider, 'higgsfield');
        assert.equal(record.model, MODEL);

        // Ordem: estimativa ANTES da submissão; persistência crítica antes/depois.
        const estimateAt = harness.calls.findIndex((c) => c.url.includes('/estimate/'));
        const submitAt = harness.calls.findIndex((c) => c.url === `${OFFICIAL}/${MODEL}`);
        assert.ok(estimateAt >= 0 && submitAt > estimateAt);
        assert.equal(harness.persisted.length, 2);
        assert.equal(harness.persisted[0].requestId, null); // pré-POST
        assert.equal(harness.persisted[1].requestId, 'req-1'); // pós-aceitação

        // Payload exato: apenas chaves do contrato; âncora https reutilizada.
        const body = JSON.parse(String(harness.calls[submitAt].init.body));
        assert.equal(body.image_url, 'https://cdn.example/anchor.jpg');
        assert.equal(body.duration, 5);
        assert.equal(body.sound, 'on');
        assert.equal(body.cfg_scale, 0.5);
        assert.equal(body.multi_shots, false);
        assert.equal(body.aspect_ratio, undefined);
        assert.equal(body.generate_audio, undefined);
        assert.equal(harness.calls[submitAt].init.headers && (harness.calls[submitAt].init.headers as Record<string, string>)['Idempotency-Key'], record.idempotencyKey);

        // Reserva durável no ledger.
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000);
    });

    it('data URI da âncora é enviado via upload (PUT sem Authorization) e o payload usa public_url', async () => {
        harness.setHandler((url, init) => {
            if (url === `${OFFICIAL}/files/generate-upload-url`) {
                return jsonResponse({
                    upload_url: 'https://uploads.higgsfield.ai/put/tok',
                    upload_headers: { 'x-store-token': 't0k', 'content-type': 'image/jpeg' },
                    public_url: 'https://cdn.higgsfield.ai/pub/tok.jpg',
                });
            }
            if (url === 'https://uploads.higgsfield.ai/put/tok') {
                assert.equal(init.method, 'PUT');
                const headers = init.headers as Record<string, string>;
                assert.equal(headers.Authorization, undefined); // credencial NUNCA vai ao storage
                assert.equal(headers['x-store-token'], 't0k');
                return new Response(null, { status: 200 });
            }
            return estimateOkHandler(url, init);
        });

        const jpegByte = Buffer.from('fakejpeg', 'utf8').toString('base64');
        const record = await launchHiggsfieldScene(launchParams(harness, {
            anchor: `data:image/jpeg;base64,${jpegByte}`,
        }));

        assert.equal(record.payload.image_url, 'https://cdn.higgsfield.ai/pub/tok.jpg');
        const submitCall = harness.calls.find((c) => c.url === `${OFFICIAL}/${MODEL}`);
        assert.equal(JSON.parse(String(submitCall?.init.body)).image_url, 'https://cdn.higgsfield.ai/pub/tok.jpg');
        // Ordem: upload ANTES da estimativa (payload real contém a public_url).
        const uploadAt = harness.calls.findIndex((c) => c.url.includes('uploads.higgsfield.ai'));
        const estimateAt = harness.calls.findIndex((c) => c.url.includes('/estimate/'));
        assert.ok(uploadAt >= 0 && uploadAt < estimateAt);
    });

    it('preço desconhecido (Seedance-style) falha ANTES de reservar ou submeter', async () => {
        harness.setHandler(() => jsonResponse({ type: 'pricing', pricing_description: 'varies' }));
        await assert.rejects(
            launchHiggsfieldScene(launchParams(harness)),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'PRICE_UNKNOWN',
        );
        assert.equal(harness.calls.filter((c) => c.url === `${OFFICIAL}/${MODEL}`).length, 0);
        const files = await readdir(harness.ledgerDir);
        assert.equal(files.filter((n) => n.startsWith('budget_')).length, 0);
    });

    it('teto estourado falha ANTES da submissão, sem resíduo de reserva', async () => {
        // Teto de US$0.50 < estimativa de US$0.714 ⇒ reserva abortada antes do POST.
        const tight = await buildHarness(estimateOkHandler, 500_000);
        try {
            await assert.rejects(
                launchHiggsfieldScene(launchParams(tight)),
                (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'BUDGET_EXCEEDED',
            );
            assert.equal(tight.calls.filter((c) => c.url === `${OFFICIAL}/${MODEL}`).length, 0);
            const files = await readdir(tight.ledgerDir);
            assert.equal(files.filter((n) => n.startsWith('budget_')).length, 0);
            const summary = readBudgetSummary(tight.ledgerDir, tight.capMicros);
            assert.equal(summary.reservedMicros, 0);
        } finally {
            await cleanup(tight);
        }
    });

    it('FALHA DE PERSISTÊNCIA antes do POST impede a chamada paga e retém a reserva', async () => {
        let persistedCalls = 0;
        const failing = launchParams(harness, {
            persistRequest: () => {
                persistedCalls += 1;
                throw new Error('disco cheio');
            },
        });
        await assert.rejects(launchHiggsfieldScene(failing), /disco cheio/);
        assert.equal(persistedCalls, 1);
        assert.equal(harness.calls.filter((c) => c.url === `${OFFICIAL}/${MODEL}`).length, 0);
        // Reserva ficou retida (dinheiro conservado; retomada decide com o provedor).
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000);
    });

    it('submissão 4xx rejeitada libera a reserva (sem geração ⇒ sem cobrança)', async () => {
        harness.setHandler((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) return jsonResponse({ error: 'quota exceeded' }, 402);
            return estimateOkHandler(url, {});
        });
        await assert.rejects(
            launchHiggsfieldScene(launchParams(harness)),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'SUBMISSION_REJECTED',
        );
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros + summary.chargedMicros, 0);
        // Registro RELEASED permanece em disco p/ auditoria (e bloqueia reuso da chave).
        const files = (await readdir(harness.ledgerDir)).filter((n) => n.startsWith('budget_'));
        assert.equal(files.length, 1);
        const raw = JSON.parse(await readFile(path.join(harness.ledgerDir, files[0]), 'utf8'));
        assert.equal(raw.state, 'RELEASED');
        assert.equal(raw.releaseReason, 'submission_rejected_no_generation');
    });

    it('submissão ambígua (5xx) RETÉM a reserva e persiste estado incerto', async () => {
        harness.setHandler((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) return jsonResponse({ error: 'bad gateway' }, 502);
            return estimateOkHandler(url, {});
        });
        await assert.rejects(
            launchHiggsfieldScene(launchParams(harness)),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'SUBMISSION_UNKNOWN',
        );
        assert.equal(harness.persisted.length, 2);
        assert.equal(harness.persisted[1].submissionUnknown, true);
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000); // incerto ⇒ NUNCA libera
    });

    it('chave de idempotência é determinística por (job, cena, tentativa, payload)', () => {
        const opKey = higgsfieldOperationKey('job', 'scene1', 2);
        const digest = 'a'.repeat(64);
        assert.equal(higgsfieldIdempotencyKey(opKey, digest), higgsfieldIdempotencyKey(opKey, digest));
        assert.notEqual(higgsfieldIdempotencyKey(opKey, digest), higgsfieldIdempotencyKey(higgsfieldOperationKey('job', 'scene1', 3), digest));
        assert.match(higgsfieldIdempotencyKey(opKey, digest), /^hfk-[0-9a-f]{64}$/);
    });
});

describe('resubmitHiggsfieldScene — recuperação de POST ambíguo com a MESMA chave', () => {
    it('resubmete com MESMA chave/payload; ledger não reserva duas vezes', async () => {
        const harness = await buildHarness(estimateOkHandler);

        // 1ª submissão fica ambígua (5xx): registro persistido sem requestId.
        harness.setHandler((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) return jsonResponse({}, 503);
            return estimateOkHandler(url, {});
        });
        let stuck: HiggsfieldSceneRequest;
        try {
            await launchHiggsfieldScene(launchParams(harness));
            assert.fail('deveria ter falhado');
        } catch (error) {
            assert.ok(error instanceof HiggsfieldSceneError);
            stuck = harness.persisted[harness.persisted.length - 1];
            assert.equal(stuck.requestId, null);
        }

        // 2ª tentativa (retomada): provedor aceita — MESMA chave, MESMO payload.
        harness.setHandler(estimateOkHandler);
        const recovered = await resubmitHiggsfieldScene({
            record: stuck,
            client: harness.client,
            ledgerDir: harness.ledgerDir,
            capMicros: CAP,
            persistRequest: (record) => { harness.persisted.push(structuredClone(record)); },
            log: (m) => { harness.logs.push(m); },
        });

        assert.equal(recovered.requestId, 'req-1');
        assert.equal(recovered.idempotencyKey, stuck.idempotencyKey); // MESMA chave
        assert.equal(recovered.operationKey, stuck.operationKey);
        const submits = harness.calls.filter((c) => c.url === `${OFFICIAL}/${MODEL}`);
        assert.equal(submits.length, 2);
        assert.deepEqual(JSON.parse(String(submits[0].init.body)), JSON.parse(String(submits[1].init.body)));
        // Somente UMA reserva (retomada adota a existente — nunca duplica verba).
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000);
        await cleanup(harness);
    });
});

describe('pollHiggsfieldScene — conclusão, término e prazo', () => {
    it('completed cobra (fica retida) e devolve a URL', async () => {
        const harness = await buildHarness((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) {
                return jsonResponse({ request_id: 'req-1', status_url: STATUS_URL });
            }
            if (url.includes('/estimate/')) return jsonResponse({ type: 'estimate', usd: '0.714' });
            return jsonResponse({ status: 'completed', video: { url: 'https://cdn.higgsfield.ai/v.mp4' } });
        });
        const record = await launchHiggsfieldScene(launchParams(harness));

        const result = await pollHiggsfieldScene({
            record,
            client: harness.client,
            ledgerDir: harness.ledgerDir,
            log: (m) => harness.logs.push(m),
        });
        assert.equal(result.outputUrl, 'https://cdn.higgsfield.ai/v.mp4');
        assert.equal(result.charge, 'charged');
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.chargedMicros, 714_000); // confirmado: fica no teto
        assert.equal(summary.reservedMicros, 0);
        await cleanup(harness);
    });

    it('término terminal (nsfw/failed/canceled) libera a reserva com motivo documentado', async () => {
        const harness = await buildHarness((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) {
                return jsonResponse({ request_id: 'req-1', status_url: STATUS_URL });
            }
            if (url.includes('/estimate/')) return jsonResponse({ type: 'estimate', usd: '0.714' });
            return jsonResponse({ status: 'nsfw' });
        });
        const record = await launchHiggsfieldScene(launchParams(harness));
        await assert.rejects(
            pollHiggsfieldScene({
                record,
                client: harness.client,
                ledgerDir: harness.ledgerDir,
                log: (m) => harness.logs.push(m),
            }),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'TERMINAL_FAILURE',
        );
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros + summary.chargedMicros, 0);
        await cleanup(harness);
    });

    it('prazo de polling estoura com reserva RETIDA (nunca relança às cegas)', async () => {
        const harness = await buildHarness((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) return jsonResponse({ request_id: 'req-1', status_url: STATUS_URL });
            if (url.includes('/estimate/')) return jsonResponse({ type: 'estimate', usd: '0.714' });
            return jsonResponse({ status: 'in_progress' });
        });
        const record = await launchHiggsfieldScene(launchParams(harness));
        await assert.rejects(
            pollHiggsfieldScene({
                record,
                client: harness.client,
                ledgerDir: harness.ledgerDir,
                deadlineMs: 20,
                intervalMs: 1,
                sleep: async () => {},
                log: () => {},
            }),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'POLL_TIMEOUT',
        );
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000);
        await cleanup(harness);
    });

    it('status_url não confiável (origem alternativa) para SEM contato e retém reserva', async () => {
        const harness = await buildHarness((url) => {
            if (url === `${OFFICIAL}/${MODEL}`) return jsonResponse({ request_id: 'req-1', status_url: STATUS_URL });
            if (url.includes('/estimate/')) return jsonResponse({ type: 'estimate', usd: '0.714' });
            return jsonResponse({ status: 'in_progress' });
        });
        const record = await launchHiggsfieldScene(launchParams(harness));
        // Estado persistido adulterado/corrompido com origem alternativa:
        // a defesa para ANTES de qualquer contato com a origem estranha.
        record.statusUrl = 'https://evil.example/poll';
        await assert.rejects(
            pollHiggsfieldScene({
                record,
                client: harness.client,
                ledgerDir: harness.ledgerDir,
                log: () => {},
            }),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'PROVIDER_UNKNOWN',
        );
        assert.equal(harness.calls.filter((c) => c.url.includes('evil.example')).length, 0);
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000);
        await cleanup(harness);
    });
});

describe('planHiggsfieldRecovery — tabela de decisão', () => {
    const base = { statusUrl: STATUS_URL, submissionUnknown: false };

    it('sem registro => fresh_launch; sem requestId => resubmit_same_key', () => {
        assert.deepEqual(planHiggsfieldRecovery(undefined, null), { kind: 'fresh_launch' });
        assert.deepEqual(
            planHiggsfieldRecovery({ ...base, requestId: null }, null),
            { kind: 'resubmit_same_key' },
        );
        // Mesmo sem flag de incerteza, registro sem requestId é recuperado pela MESMA chave.
        assert.deepEqual(
            planHiggsfieldRecovery({ ...base, requestId: null }, undefined),
            { kind: 'resubmit_same_key' },
        );
    });

    it('requestId + resultados do provedor', () => {
        assert.deepEqual(
            planHiggsfieldRecovery({ ...base, requestId: 'r1' }, { kind: 'succeeded', outputUrl: 'https://cdn/x.mp4' }),
            { kind: 'reuse_result', outputUrl: 'https://cdn/x.mp4' },
        );
        assert.deepEqual(
            planHiggsfieldRecovery({ ...base, requestId: 'r1' }, { kind: 'processing', rawStatus: 'queued' }),
            { kind: 'keep_polling' },
        );
        assert.deepEqual(
            planHiggsfieldRecovery({ ...base, requestId: 'r1' }, { kind: 'failed_terminal', terminalStatus: 'failed' }),
            { kind: 'relaunch_new_attempt' },
        );
        const stopped = planHiggsfieldRecovery({ ...base, requestId: 'r1' }, { kind: 'unknown', reason: 'offline' });
        assert.equal(stopped.kind, 'stop_unresolved');
        // Consulta indisponível => parar (reserva retida), nunca relançar às cegas.
        assert.equal(planHiggsfieldRecovery({ ...base, requestId: 'r1' }, null).kind, 'stop_unresolved');
    });
});

describe('prepareHiggsfieldAnchorImage — âncoras', () => {
    it('https é reutilizada sem upload; esquemas não suportados falham claro', async () => {
        const harness = await buildHarness(() => jsonResponse({}, 500));
        const url = await prepareHiggsfieldAnchorImage('https://cdn.example/a.jpg', harness.client, () => {});
        assert.equal(url, 'https://cdn.example/a.jpg');
        assert.equal(harness.calls.length, 0); // sem busca de arquivo privado
        await assert.rejects(
            prepareHiggsfieldAnchorImage('http://cdn.example/a.jpg', harness.client, () => {}),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'INVALID_ANCHOR',
        );
        await assert.rejects(
            prepareHiggsfieldAnchorImage(undefined, harness.client, () => {}),
            HiggsfieldSceneError,
        );
        await cleanup(harness);
    });

    it('data URI enorme é rejeitada antes de qualquer rede', async () => {
        const harness = await buildHarness(() => jsonResponse({}, 500));
        const big = `data:image/jpeg;base64,${'A'.repeat(9_000_000)}`;
        await assert.rejects(
            prepareHiggsfieldAnchorImage(big, harness.client, () => {}),
            (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'INVALID_ANCHOR',
        );
        assert.equal(harness.calls.length, 0);
        await cleanup(harness);
    });
});

describe('sumReservedMicros', () => {
    it('soma apenas valores finitos das reservas', () => {
        const records = [
            { reservedUsdMicros: 714_000 },
            { reservedUsdMicros: Number.NaN },
            undefined,
        ] as never as HiggsfieldSceneRequest[];
        assert.equal(sumReservedMicros(records.filter(Boolean)), 714_000);
    });
});

describe('P0-1 replay após POST desconhecido (revisão 08/11)', () => {
    it('5xx → retomada recebe 401/409/422 → reserva e MESMA chave mantidas → sucesso posterior cobra uma vez', async () => {
        const harness = await buildHarness(estimateOkHandler);
        harness.setHandler((url) => (url === `${OFFICIAL}/${MODEL}` ? jsonResponse({}, 503) : estimateOkHandler(url, {})));
        await assert.rejects(launchHiggsfieldScene(launchParams(harness)));
        let record = harness.persisted[harness.persisted.length - 1];
        assert.equal(record.requestId, null);
        const resubmit = (rec: HiggsfieldSceneRequest) => resubmitHiggsfieldScene({
            record: rec,
            client: harness.client,
            ledgerDir: harness.ledgerDir,
            capMicros: CAP,
            persistRequest: (r) => { harness.persisted.push(structuredClone(r)); },
            log: (m) => { harness.logs.push(m); },
        });

        for (const status of [401, 409, 422]) {
            harness.setHandler((url) => (url === `${OFFICIAL}/${MODEL}` ? jsonResponse({ error: 'x' }, status) : estimateOkHandler(url, {})));
            await assert.rejects(resubmit(record), (error: unknown) => error instanceof HiggsfieldSceneError && error.code === 'SUBMISSION_UNKNOWN');
            record = harness.persisted[harness.persisted.length - 1];
            assert.equal(record.submissionUnknown, true);
            assert.equal(record.requestId, null);
            const summary = readBudgetSummary(harness.ledgerDir, CAP);
            assert.equal(summary.reservedMicros, 714_000, `reserva liberada após HTTP ${status}`);
        }

        // Provedor finalmente responde: MESMA chave em todas as submissões.
        harness.setHandler((url) => {
            if (url === STATUS_URL) return jsonResponse({ status: 'completed', video: { url: 'https://cdn.higgsfield.ai/v.mp4' } });
            return estimateOkHandler(url, {});
        });
        const accepted = await resubmit(record);
        assert.equal(accepted.requestId, 'req-1');
        const keys = new Set(harness.calls
            .filter((c) => c.url === `${OFFICIAL}/${MODEL}`)
            .map((c) => (c.init.headers as Record<string, string>)['Idempotency-Key']));
        assert.equal(keys.size, 1);
        const result = await pollHiggsfieldScene({ record: accepted, client: harness.client, ledgerDir: harness.ledgerDir, log: () => {} });
        assert.equal(result.charge, 'charged');
        const summary = readBudgetSummary(harness.ledgerDir, CAP);
        assert.deepEqual([summary.reservedMicros, summary.chargedMicros], [0, 714_000]);
        await cleanup(harness);
    });

    it('P0-6: modelo fora do contrato não chega a cotar nem submeter', async () => {
        const harness = await buildHarness(estimateOkHandler);
        await assert.rejects(launchHiggsfieldScene(launchParams(harness, { model: 'bytedance/seedance/v1/pro/image-to-video' })));
        assert.equal(harness.calls.length, 0);
        await cleanup(harness);
    });
});

describe('Revisão 24/11 — retomada após 1º POST recusado', () => {
    it('1º POST 422 libera; retomada vira KEY_RELEASED e a tentativa 2 lança com chave nova', async () => {
        const harness = await buildHarness((url) => (url === `${OFFICIAL}/${MODEL}` ? jsonResponse({ error: 'bad' }, 422) : estimateOkHandler(url, {})));
        await assert.rejects(launchHiggsfieldScene(launchParams(harness)), (e: unknown) => e instanceof HiggsfieldSceneError && e.code === 'SUBMISSION_REJECTED');
        const stuck = harness.persisted[0];
        harness.setHandler(estimateOkHandler);
        await assert.rejects(
            resubmitHiggsfieldScene({ record: stuck, client: harness.client, ledgerDir: harness.ledgerDir, capMicros: CAP, persistRequest: () => {}, log: () => {} }),
            (e: unknown) => e instanceof HiggsfieldSceneError && e.code === 'KEY_RELEASED',
        );
        const before = harness.calls.length;
        const relaunched = await launchHiggsfieldScene(launchParams(harness, { attempt: stuck.attempt + 1 }));
        assert.notEqual(relaunched.idempotencyKey, stuck.idempotencyKey);
        assert.equal(relaunched.requestId, 'req-1');
        assert.ok(harness.calls.length > before);
        assert.equal(readBudgetSummary(harness.ledgerDir, CAP).reservedMicros, 714_000);
        await cleanup(harness);
    });
});

describe('Revisão 24/11 — registro da cena perdido após liberação', () => {
    it('retomada recomeça em attempt 1, pula chaves liberadas e lança na próxima livre', async () => {
        const harness = await buildHarness((url) => (url === `${OFFICIAL}/${MODEL}` ? jsonResponse({ error: 'bad' }, 422) : estimateOkHandler(url, {})));
        await assert.rejects(launchHiggsfieldScene(launchParams(harness)));                  // a1 liberada
        await assert.rejects(launchHiggsfieldScene(launchParams(harness, { attempt: 2 }))); // a2 liberada
        harness.setHandler(estimateOkHandler);
        // Rota perdeu o registro: pending undefined ⇒ attempt 1 de novo.
        const record = await launchHiggsfieldScene(launchParams(harness, { attempt: 1 }));
        assert.equal(record.attempt, 3);
        assert.equal(record.operationKey, higgsfieldOperationKey('11111111-1111-4111-8111-111111111111', 'scene1', 3));
        assert.equal(readBudgetSummary(harness.ledgerDir, CAP).reservedMicros, 714_000);
        await cleanup(harness);
    });
});

describe('Revisão 24/11 — chave liberada com payload diferente', () => {
    it('a1 liberada com âncora A; relançar com âncora B a partir de attempt 1 cai em a2', async () => {
        const harness = await buildHarness((url) => (url === `${OFFICIAL}/${MODEL}` ? jsonResponse({ error: 'bad' }, 422) : estimateOkHandler(url, {})));
        await assert.rejects(launchHiggsfieldScene(launchParams(harness, { anchor: 'https://cdn.example/a.jpg' })));
        harness.setHandler(estimateOkHandler);
        const record = await launchHiggsfieldScene(launchParams(harness, { attempt: 1, anchor: 'https://cdn.example/b.jpg' }));
        assert.equal(record.attempt, 2);
        assert.equal(record.requestId, 'req-1');
        await cleanup(harness);
    });
});
