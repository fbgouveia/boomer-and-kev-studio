import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    HiggsfieldClient,
    ProviderUrlError,
    SubmissionAmbiguousError,
    SubmissionRejectedError,
    buildHiggsfieldPayload,
    computePayloadHash,
    parseImageUploadGrant,
    parseStatusResponse,
    parseUsdEstimate,
    validateMediaUrl,
    validateProviderApiUrl,
    type ImageUploadGrant,
} from '@/lib/higgsfield';

const API_KEY = 'hf-test-key-abcdef123456';
const OFFICIAL = 'https://api.higgsfield.ai';

type CapturedCall = { url: string; init: RequestInit };

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
    const calls: CapturedCall[] = [];
    const impl = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const captured: CapturedCall = { url, init: (init ?? {}) as RequestInit };
        calls.push(captured);
        return handler(url, captured.init);
    }) as typeof fetch;
    return { calls, impl };
}

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });

const redirectResponse = () =>
    new Response(null, { status: 302, headers: { location: 'https://evil.example/steal' } });

const samplePayload = buildHiggsfieldPayload({
    imageUrl: 'https://cdn.example/anchor.jpg',
    prompt: 'talking head',
    duration: 5,
    sound: 'on',
});

describe('parseUsdEstimate — cotação autoritativa', () => {
    it('usd numérico válido autoriza (0.714 => 714000 micros)', () => {
        const parsed = parseUsdEstimate({ type: 'estimate', usd: '0.714', credits: '11.424' });
        assert.deepEqual(parsed, { ok: true, usdMicros: 714_000 });
    });

    it('usd numérico (number) é aceito', () => {
        const parsed = parseUsdEstimate({ type: 'estimate', usd: 0.75 });
        assert.deepEqual(parsed, { ok: true, usdMicros: 750_000 });
    });

    it('resposta sem type=estimate (ex.: pricing_description) NUNCA autoriza', () => {
        const parsed = parseUsdEstimate({ type: 'pricing', pricing_description: 'about a dollar' });
        assert.equal(parsed.ok, false);
        if (!parsed.ok) assert.equal(parsed.code, 'UNKNOWN_PRICE');
    });

    it('type=estimate sem usd NUNCA autoriza (nunca adivinhar preço)', () => {
        const parsed = parseUsdEstimate({ type: 'estimate' });
        assert.equal(parsed.ok, false);
        if (!parsed.ok) assert.equal(parsed.code, 'UNKNOWN_PRICE');
    });

    it('usd inválido (não-numérico, negativo, zero) NUNCA autoriza', () => {
        for (const bad of ['abc', '-1.00', '0', '1e3', '', null, [], {}]) {
            const parsed = parseUsdEstimate({ type: 'estimate', usd: bad as never });
            assert.equal(parsed.ok, false, JSON.stringify(bad));
            if (!parsed.ok) assert.equal(parsed.code, 'UNKNOWN_PRICE');
        }
    });
});

describe('buildHiggsfieldPayload — chaves exatas do contrato', () => {
    it('payload com apenas as chaves documentadas (sem aspect_ratio/start_image/generate_audio)', () => {
        const payload = buildHiggsfieldPayload({ imageUrl: 'https://cdn.example/a.jpg', prompt: 'fala', duration: 10, sound: 'off' });
        const keys = Object.keys(payload).sort();
        assert.deepEqual(keys, ['cfg_scale', 'duration', 'image_url', 'multi_shots', 'prompt', 'sound']);
        assert.equal(payload.cfg_scale, 0.5);
        assert.equal(payload.multi_shots, false);
    });

    it('duration inteiro 3..15; fora disso ou não-inteiro é rejeitado', () => {
        for (const good of [3, 5, 10, 15]) {
            assert.equal(buildHiggsfieldPayload({ imageUrl: 'https://c.example/a.jpg', duration: good, sound: 'on' }).duration, good);
        }
        for (const bad of [2, 16, 7.5, NaN]) {
            assert.throws(() => buildHiggsfieldPayload({ imageUrl: 'https://c.example/a.jpg', duration: bad, sound: 'on' }));
        }
    });

    it('image_url precisa ser HTTPS público (data URI é upload primeiro)', () => {
        assert.throws(() => buildHiggsfieldPayload({ imageUrl: 'http://cdn.example/a.jpg', duration: 5, sound: 'on' }));
        assert.throws(() => buildHiggsfieldPayload({ imageUrl: 'data:image/jpeg;base64,AAAA', duration: 5, sound: 'on' }));
    });

    it('hash do payload é estável sob reordenação de chaves (retomada idempotente)', () => {
        const a = { ...samplePayload } as Record<string, unknown>;
        const reordered: Record<string, unknown> = {};
        for (const key of Object.keys(a).reverse()) reordered[key] = a[key];
        assert.equal(computePayloadHash(samplePayload), computePayloadHash(reordered as never));
    });
});

describe('validação de URLs — credencial nunca sai da origem oficial', () => {
    it('validateProviderApiUrl aceita apenas a origem oficial HTTPS', () => {
        assert.doesNotThrow(() => validateProviderApiUrl(`${OFFICIAL}/kling-video/v3.0/pro/image-to-video?x=1`));
        assert.throws(() => validateProviderApiUrl('http://api.higgsfield.ai/x'), ProviderUrlError);
        assert.throws(() => validateProviderApiUrl('https://evil.example/status'), ProviderUrlError);
        assert.throws(() => validateProviderApiUrl('https://user:pass@api.higgsfield.ai/x'), ProviderUrlError);
        assert.throws(() => validateProviderApiUrl(`${OFFICIAL}/a/../b`), ProviderUrlError);
        assert.throws(() => validateProviderApiUrl('não é url'), ProviderUrlError);
    });

    it('validateMediaUrl aceita CDN HTTPS sem userinfo; rejeita o resto', () => {
        assert.doesNotThrow(() => validateMediaUrl('https://cdn.vendor.net/video/abc.mp4'));
        assert.throws(() => validateMediaUrl('http://cdn.vendor.net/video/abc.mp4'), ProviderUrlError);
        assert.throws(() => validateMediaUrl('https://user:pass@cdn.vendor.net/v.mp4'), ProviderUrlError);
        assert.throws(() => validateMediaUrl('javascript:alert(1)'), ProviderUrlError);
        assert.throws(() => validateMediaUrl('data:text/html,x'), ProviderUrlError);
    });
});

describe('HiggsfieldClient.estimate', () => {
    it('envia Authorization Key na origem oficial com o payload preparado', async () => {
        const { calls, impl } = mockFetch(() => jsonResponse({ type: 'estimate', usd: '0.714' }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const estimate = await client.estimate('kling-video/v3.0/pro/image-to-video', samplePayload);
        assert.deepEqual(estimate, { ok: true, usdMicros: 714_000 });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, `${OFFICIAL}/estimate/kling-video/v3.0/pro/image-to-video`);
        assert.equal((calls[0].init.headers as Record<string, string>).Authorization, `Key ${API_KEY}`);
        assert.equal(calls[0].init.redirect, 'manual');
        assert.deepEqual(JSON.parse(String(calls[0].init.body)), samplePayload);
    });

    it('401/403 viram AUTH (configuração), não preço desconhecido genérico', async () => {
        const { impl } = mockFetch(() => jsonResponse({ error: 'nope' }, 401));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const estimate = await client.estimate('m', samplePayload);
        assert.deepEqual(estimate, { ok: false, code: 'AUTH', status: 401 });
    });

    it('redirect é recusado sem seguir (credencial não reenviada)', async () => {
        const { calls, impl } = mockFetch(() => redirectResponse());
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const estimate = await client.estimate('m', samplePayload);
        assert.equal(estimate.ok, false);
        assert.equal(calls.length, 1); // NÃO houve segunda chamada ao redirect
    });

    it('falha de rede vira HTTP/UNKNOWN_PRICE, nunca autorização', async () => {
        const { impl } = mockFetch(() => { throw new TypeError('fetch failed'); });
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const estimate = await client.estimate('m', samplePayload);
        assert.equal(estimate.ok, false);
    });
});

describe('HiggsfieldClient.submit', () => {
    const acceptance = {
        request_id: 'req-123',
        status_url: `${OFFICIAL}/v1/requests/req-123`,
        cancel_url: `${OFFICIAL}/v1/requests/req-123/cancel`,
    };

    it('aceita com request_id/status_url e envia Idempotency-Key', async () => {
        const { calls, impl } = mockFetch(() => jsonResponse(acceptance));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const result = await client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64));
        assert.equal(result.requestId, 'req-123');
        assert.equal(result.statusUrl, acceptance.status_url);
        assert.equal(result.cancelUrl, acceptance.cancel_url);
        assert.equal((calls[0].init.headers as Record<string, string>)['Idempotency-Key'], 'hfk-' + 'a'.repeat(64));
    });

    it('4xx definitivo = SubmissionRejectedError (pedido não aceito ⇒ sem cobrança)', async () => {
        const { impl } = mockFetch(() => jsonResponse({ error: 'quota' }, 402));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(
            client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64)),
            (error: unknown) => error instanceof SubmissionRejectedError && error.status === 402,
        );
    });

    it('5xx = SubmissionAmbiguousError (pode ter sido aceito)', async () => {
        const { impl } = mockFetch(() => jsonResponse({ error: 'oops' }, 502));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(
            client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64)),
            (error: unknown) => error instanceof SubmissionAmbiguousError && error.stage === 'server',
        );
    });

    it('timeout (AbortError) é ambíguo, não rejeição', async () => {
        const { impl } = mockFetch(() => { throw new DOMException('This operation was aborted', 'AbortError'); });
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(
            client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64)),
            (error: unknown) => error instanceof SubmissionAmbiguousError && error.stage === 'timeout',
        );
    });

    it('200 com corpo ilegível é ambíguo (mesma chave na retomada)', async () => {
        const { impl } = mockFetch(() => jsonResponse({ foo: 'bar' }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(
            client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64)),
            (error: unknown) => error instanceof SubmissionAmbiguousError && error.stage === 'malformed_response',
        );
    });

    it('status_url fora da origem oficial NUNCA é seguido nem aceito', async () => {
        const { impl } = mockFetch(() => jsonResponse({
            request_id: 'req-x',
            status_url: 'https://evil.example/collect',
        }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(
            client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64)),
            SubmissionAmbiguousError,
        );
    });

    it('a chave da API nunca aparece em mensagens de erro', async () => {
        const { impl } = mockFetch(() => new Response(`leak ${API_KEY}`, { status: 400 }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        try {
            await client.submit('m', samplePayload, 'hfk-' + 'a'.repeat(64));
            assert.fail('deveria ter rejeitado');
        } catch (error) {
            assert.ok(error instanceof SubmissionRejectedError);
            assert.ok(!error.message.includes(API_KEY));
            assert.ok(error.message.includes('[redacted]'));
        }
    });
});

describe('HiggsfieldClient.getStatus', () => {
    it('mapeia queued/in_progress => processing', async () => {
        for (const status of ['queued', 'in_progress']) {
            const { impl } = mockFetch(() => jsonResponse({ status }));
            const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
            const outcome = await client.getStatus(`${OFFICIAL}/v1/requests/r`);
            assert.deepEqual(outcome, { kind: 'processing', rawStatus: status });
        }
    });

    it('completed com video.url => succeeded com URL validada', async () => {
        const { impl } = mockFetch(() => jsonResponse({ status: 'completed', video: { url: 'https://cdn.hf.example/v.mp4' } }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const outcome = await client.getStatus(`${OFFICIAL}/v1/requests/r`);
        assert.deepEqual(outcome, { kind: 'succeeded', outputUrl: 'https://cdn.hf.example/v.mp4' });
    });

    it('completed sem video.url utilizável => unknown (nunca inventar saída)', async () => {
        const { impl } = mockFetch(() => jsonResponse({ status: 'completed' }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const outcome = await client.getStatus(`${OFFICIAL}/v1/requests/r`);
        assert.equal(outcome.kind, 'unknown');
    });

    it('failed/nsfw/canceled são terminais distintos', async () => {
        for (const status of ['failed', 'nsfw', 'canceled']) {
            const { impl } = mockFetch(() => jsonResponse({ status, error: 'boom' }));
            const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
            const outcome = await client.getStatus(`${OFFICIAL}/v1/requests/r`);
            assert.deepEqual(outcome, { kind: 'failed_terminal', terminalStatus: status, error: 'boom' });
        }
    });

    it('status_url de origem ALTERNATIVA lança ANTES do fetch (zero vazamento)', async () => {
        const { calls, impl } = mockFetch(() => jsonResponse({ status: 'completed' }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(
            client.getStatus('https://evil.example/status'),
            ProviderUrlError,
        );
        assert.equal(calls.length, 0); // nenhum contato — nem sem credencial
    });

    it('redirect no status é unknown (não segue)', async () => {
        const { impl } = mockFetch(() => redirectResponse());
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const outcome = await client.getStatus(`${OFFICIAL}/v1/requests/r`);
        assert.equal(outcome.kind, 'unknown');
    });
});

describe('upload de imagem — sem encaminhamento de credenciais', () => {
    const grant: ImageUploadGrant = {
        uploadUrl: 'https://uploads.higgsfield.ai/put/token-abc',
        uploadHeaders: { 'x-store-token': 't', 'content-type': 'image/jpeg' },
        publicUrl: 'https://cdn.higgsfield.ai/pub/token-abc.jpg',
    };

    it('parse do grant válido preserva campos', () => {
        const parsed = parseImageUploadGrant({
            upload_url: grant.uploadUrl,
            upload_headers: grant.uploadHeaders,
            public_url: grant.publicUrl,
        });
        assert.deepEqual(parsed, grant);
    });

    it('grant com Authorization/cookie é rejeitado', () => {
        assert.throws(() => parseImageUploadGrant({
            upload_url: grant.uploadUrl,
            upload_headers: { Authorization: 'Key stolen' },
            public_url: grant.publicUrl,
        }));
        assert.throws(() => parseImageUploadGrant({
            upload_url: grant.uploadUrl,
            upload_headers: { cookie: 'session=x' },
            public_url: grant.publicUrl,
        }));
    });

    it('grant com upload_url http ou incompleto é rejeitado', () => {
        assert.throws(() => parseImageUploadGrant({
            upload_url: 'http://uploads.higgsfield.ai/put/x',
            upload_headers: {},
            public_url: grant.publicUrl,
        }));
        assert.throws(() => parseImageUploadGrant({ upload_url: grant.uploadUrl }));
    });

    it('uploadImageBytes faz PUT com os headers do grant e SEM Authorization', async () => {
        const { calls, impl } = mockFetch(() => new Response(null, { status: 200 }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        const bytes = new Uint8Array([1, 2, 3, 4]);
        await client.uploadImageBytes(grant, bytes);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].init.method, 'PUT');
        assert.equal(calls[0].init.redirect, 'manual');
        const headers = calls[0].init.headers as Record<string, string>;
        assert.equal(headers.Authorization, undefined);
        assert.equal(headers['x-store-token'], 't');
        assert.deepEqual(Buffer.from(calls[0].init.body as Uint8Array), Buffer.from(bytes));
    });

    it('createImageUpload valida grant antes de devolver (malformado rejeita)', async () => {
        const { impl } = mockFetch(() => jsonResponse({ error: 'broken' }));
        const client = new HiggsfieldClient({ apiKey: API_KEY, fetchImpl: impl });
        await assert.rejects(client.createImageUpload('image/jpeg'));
    });
});

describe('parseStatusResponse — direto (sem rede)', () => {
    it('status inesperado => unknown com motivo', () => {
        const outcome = parseStatusResponse({ status: 'weird_state' });
        assert.equal(outcome.kind, 'unknown');
    });

    it('corpo não-objeto => unknown', () => {
        assert.equal(parseStatusResponse('não é json objeto').kind, 'unknown');
        assert.equal(parseStatusResponse(null).kind, 'unknown');
    });
});
