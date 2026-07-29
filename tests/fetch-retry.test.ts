import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchWithRetry, fetchWithTimeout } from '@/lib/fetch-retry';

describe('fetchWithRetry', () => {
    it('devolve sucesso sem repetir', async () => {
        let calls = 0;
        const fetchImpl = async () => {
            calls += 1;
            return new Response('ok', { status: 200 });
        };

        const { response } = await fetchWithRetry('https://example.test', {}, 3, {
            fetchImpl: fetchImpl as typeof fetch,
        });
        assert.equal(response.status, 200);
        assert.equal(calls, 1);
    });

    it('respeita Retry-After curto antes de repetir 429', async () => {
        let calls = 0;
        let clock = 1_000;
        const delays: number[] = [];
        const fetchImpl = async () => {
            calls += 1;
            return calls === 1
                ? new Response('limited', { status: 429, headers: { 'Retry-After': '2' } })
                : new Response('ok', { status: 200 });
        };

        const { response } = await fetchWithRetry('https://example.test', { method: 'POST' }, 3, {
            fetchImpl: fetchImpl as typeof fetch,
            now: () => clock,
            sleep: async delayMs => {
                delays.push(delayMs);
                clock += delayMs;
            },
        });
        assert.equal(response.status, 200);
        assert.equal(calls, 2);
        assert.deepEqual(delays, [2_000]);
    });

    it('não repete antes de um Retry-After maior que o limite automático', async () => {
        let calls = 0;
        const fetchImpl = async () => {
            calls += 1;
            return new Response('limited', { status: 429, headers: { 'Retry-After': '30' } });
        };

        const result = await fetchWithRetry('https://example.test', {}, 3, {
            fetchImpl: fetchImpl as typeof fetch,
            maxRetryDelayMs: 5_000,
        });
        assert.equal(result.response.status, 429);
        assert.equal(result.retryAfter, 30);
        assert.equal(calls, 1);
    });

    it('não mascara 429 com corpo que não seja JSON', async () => {
        const result = await fetchWithRetry('https://example.test', {}, 0, {
            fetchImpl: (async () => new Response('<html>limited</html>', { status: 429 })) as typeof fetch,
        });
        assert.equal(result.response.status, 429);
        assert.equal(result.retryAfter, 30);
    });

    it('não repete erro de rede ambíguo em requisição mutável', async () => {
        let calls = 0;
        const fetchImpl = async () => {
            calls += 1;
            throw new TypeError('socket closed');
        };

        await assert.rejects(
            fetchWithRetry('https://example.test', { method: 'POST' }, 3, {
                fetchImpl: fetchImpl as typeof fetch,
            }),
            /socket closed/,
        );
        assert.equal(calls, 1);
    });
});

describe('fetchWithTimeout', () => {
    it('aborta uma chamada pendurada dentro do prazo', async () => {
        const fetchImpl = (_url: string | URL | Request, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true });
        });

        await assert.rejects(
            fetchWithTimeout('https://example.test', {}, 10, fetchImpl as typeof fetch),
            error => error instanceof DOMException && error.name === 'TimeoutError',
        );
    });

    it('preserva cancelamento explícito do chamador', async () => {
        const controller = new AbortController();
        const fetchImpl = (_url: string | URL | Request, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true });
        });
        const pending = fetchWithTimeout('https://example.test', { signal: controller.signal }, 5_000, fetchImpl as typeof fetch);
        controller.abort(new Error('caller cancelled'));

        await assert.rejects(pending, /caller cancelled/);
    });
});
