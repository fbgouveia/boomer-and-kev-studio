const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_AUTOMATIC_RETRY_DELAY_MS = 15_000;

type FetchRetryConfig = {
    timeoutMs?: number;
    maxRetryDelayMs?: number;
    fetchImpl?: typeof fetch;
    sleep?: (delayMs: number) => Promise<void>;
    now?: () => number;
};

const defaultSleep = (delayMs: number) => new Promise<void>(resolve => setTimeout(resolve, delayMs));

function signalWithTimeout(signal: AbortSignal | null | undefined, timeoutMs: number) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

async function retryAfterSeconds(response: Response, now: number): Promise<number | undefined> {
    const header = response.headers.get('retry-after');
    if (header) {
        const seconds = Number(header);
        if (Number.isFinite(seconds) && seconds >= 0) return seconds;

        const retryAt = Date.parse(header);
        if (Number.isFinite(retryAt)) return Math.max(0, (retryAt - now) / 1_000);
    }

    try {
        const errorData = await response.clone().json();
        const errorMessage = String(errorData?.error?.message || '');
        const match = errorMessage.match(/retry (?:in|after) ([\d.]+)s/i);
        if (match) return Number(match[1]);
    } catch {
        // A resposta 429 pode não ser JSON; o status ainda é devolvido ao chamador.
    }

    return undefined;
}

export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl: typeof fetch = fetch,
) {
    return fetchImpl(url, {
        ...options,
        signal: signalWithTimeout(options.signal, timeoutMs),
    });
}

export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES,
    config: FetchRetryConfig = {},
): Promise<{ response: Response; retryAfter?: number }> {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetryDelayMs = config.maxRetryDelayMs ?? MAX_AUTOMATIC_RETRY_DELAY_MS;
    const fetchImpl = config.fetchImpl ?? fetch;
    const sleep = config.sleep ?? defaultSleep;
    const now = config.now ?? Date.now;
    const deadline = now() + timeoutMs;

    for (let attempt = 0; ; attempt += 1) {
        const remainingMs = deadline - now();
        if (remainingMs <= 0) throw new DOMException('External request timed out', 'TimeoutError');

        const response = await fetchWithTimeout(url, options, remainingMs, fetchImpl);
        if (response.status !== 429) return { response };

        const retryAfter = await retryAfterSeconds(response, now());
        if (attempt >= retries) return { response, retryAfter: retryAfter ?? 30 };

        const delayMs = retryAfter === undefined
            ? INITIAL_RETRY_DELAY_MS * (attempt + 1)
            : retryAfter * 1_000;
        if (delayMs > maxRetryDelayMs || delayMs >= deadline - now()) {
            return { response, retryAfter: retryAfter ?? Math.ceil(delayMs / 1_000) };
        }

        console.log(`[Neural Link] Rate limit 429. Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
    }
}
