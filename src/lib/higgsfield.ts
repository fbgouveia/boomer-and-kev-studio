// Cliente HTTP NATIVO do Higgsfield (sem SDK). Contrato: architecture/higgsfield-api.md.
//
// Segurança da credencial:
// - `Authorization: Key <HF_API_KEY>` vai SOMENTE para a origem oficial HTTPS,
//   validada antes de qualquer envio.
// - Redirecionamentos NUNCA são seguidos (redirect: 'manual' + rejeição 3xx):
//   um redirect para origem alternativa vazaria a credencial.
// - Downloads de mídia (storage/CDN) NUNCA recebem credenciais da API.
// - A chave nunca aparece em mensagens de erro (scrub defensivo).

import crypto from 'node:crypto';
import { fetchWithRetry, fetchWithTimeout } from '@/lib/fetch-retry';
import { canonicalJson } from '@/lib/canonical-json';
import { parseUsdToMicros } from '@/lib/money';

export const HIGGSFIELD_API_ORIGIN = 'https://api.higgsfield.ai';

export type HiggsfieldSound = 'on' | 'off';

export type HiggsfieldGenerationPayload = {
    image_url: string;
    prompt?: string;
    duration: number;
    sound: HiggsfieldSound;
    cfg_scale: number;
    multi_shots: false;
};

// ── Erros tipados ────────────────────────────────────────────────────────────

export class ProviderUrlError extends Error {
    readonly code = 'URL_UNTRUSTED';
    constructor(message: string) {
        super(message);
        this.name = 'ProviderUrlError';
    }
}

export class MalformedProviderResponseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MalformedProviderResponseError';
    }
}

export class ProviderHttpError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
        this.name = 'ProviderHttpError';
    }
}

// 4xx (pedido NÃO aceito ⇒ sem geração ⇒ sem cobrança, contrato documentado).
export class SubmissionRejectedError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
        this.name = 'SubmissionRejectedError';
    }
}

// Resultado DESCONHECIDO (rede/timeout/5xx/corpo ilegível): a submissão pode ter
// sido aceita — retomar com a MESMA chave e o MESMO payload, nunca chave nova.
export class SubmissionAmbiguousError extends Error {
    constructor(readonly stage: 'network' | 'timeout' | 'server' | 'malformed_response', message: string) {
        super(message);
        this.name = 'SubmissionAmbiguousError';
    }
}

// ── Validação de URLs ────────────────────────────────────────────────────────

function assertSafeUrlShape(url: URL, label: string, rawUrl: string): void {
    if (url.protocol !== 'https:') {
        throw new ProviderUrlError(`${label}: somente HTTPS é aceito (origem ${url.origin || url.protocol})`);
    }
    if (url.username || url.password) {
        throw new ProviderUrlError(`${label}: URL com credenciais embutidas rejeitada`);
    }
    // O construtor URL normaliza '/a/../b' para '/b' — a travessia precisa ser
    // detectada na STRING bruta também (segmento '..' no caminho).
    if (url.pathname.split('/').includes('..') || /(^|\/)\.\.(\/|$|\?|#)/.test(rawUrl)) {
        throw new ProviderUrlError(`${label}: travessia de caminho rejeitada`);
    }
    if (url.href.length > 2048) {
        throw new ProviderUrlError(`${label}: URL excessivamente longa`);
    }
}

// Chamadas autenticadas: origem EXATA da API oficial, sob pena de vazamento.
export function validateProviderApiUrl(rawUrl: string, label = 'url'): string {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new ProviderUrlError(`${label}: URL malformada`);
    }
    if (url.origin !== HIGGSFIELD_API_ORIGIN) {
        throw new ProviderUrlError(
            `${label}: origem não oficial "${url.origin}" — a credencial NÃO é enviada para origens alternativas`,
        );
    }
    assertSafeUrlShape(url, label, rawUrl);
    return url.toString();
}

// Mídia/CDN: qualquer host serve download SEM credenciais; https e sem userinfo.
export function validateMediaUrl(rawUrl: string, label = 'url'): string {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new ProviderUrlError(`${label}: URL malformada`);
    }
    if (!url.hostname) throw new ProviderUrlError(`${label}: URL sem hostname`);
    assertSafeUrlShape(url, label, rawUrl);
    return url.toString();
}

function isRedirect(response: Response): boolean {
    return (response.status >= 300 && response.status < 400) || response.type === 'opaqueredirect';
}

function readString(target: unknown, key: string): string | undefined {
    if (!target || typeof target !== 'object') return undefined;
    const value = (target as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
}

// ── Payload (chaves EXATAS do contrato desta fase) ───────────────────────────

const PAYLOAD_MIN_DURATION = 3;
const PAYLOAD_MAX_DURATION = 15;
const PAYLOAD_MAX_PROMPT_CHARS = 8_000;

export function buildHiggsfieldPayload(input: {
    imageUrl: string;
    prompt?: string;
    duration: number;
    sound: HiggsfieldSound;
}): HiggsfieldGenerationPayload {
    if (typeof input.imageUrl !== 'string' || !input.imageUrl.startsWith('https://')) {
        throw new Error('buildHiggsfieldPayload: image_url deve ser HTTPS pública (faça upload de data URI antes)');
    }
    if (!Number.isInteger(input.duration)) {
        throw new Error(`buildHiggsfieldPayload: duration deve ser inteiro (recebido ${input.duration})`);
    }
    const duration = input.duration;
    if (duration < PAYLOAD_MIN_DURATION || duration > PAYLOAD_MAX_DURATION) {
        throw new Error(
            `buildHiggsfieldPayload: duration deve ser inteiro ${PAYLOAD_MIN_DURATION}..${PAYLOAD_MAX_DURATION} (recebido ${input.duration})`,
        );
    }
    if (input.sound !== 'on' && input.sound !== 'off') {
        throw new Error("buildHiggsfieldPayload: sound deve ser 'on' ou 'off'");
    }
    const prompt = input.prompt?.trim();
    if (prompt && prompt.length > PAYLOAD_MAX_PROMPT_CHARS) {
        throw new Error('buildHiggsfieldPayload: prompt excede o limite de caracteres');
    }
    // Sem aspect_ratio/start_image/generate_audio: proporção vem da imagem já
    // preparada; som é a chave `sound` do contrato REST desta fase.
    const payload: HiggsfieldGenerationPayload = {
        image_url: input.imageUrl,
        duration,
        sound: input.sound,
        cfg_scale: 0.5,
        multi_shots: false,
    };
    if (prompt) payload.prompt = prompt;
    return payload;
}

export function computePayloadHash(payload: HiggsfieldGenerationPayload): string {
    return crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

// ── Cotação ──────────────────────────────────────────────────────────────────

export type UsdEstimate =
    | { ok: true; usdMicros: number }
    | { ok: false; code: 'AUTH' | 'HTTP' | 'UNKNOWN_PRICE'; status?: number; reason?: string };

// Só type=estimate + usd finito/positivo autoriza geração. Respostas com
// pricing_description sem usd (ex.: Seedance) NUNCA têm preço adivinhado.
export function parseUsdEstimate(body: unknown): UsdEstimate {
    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    if (!record || record.type !== 'estimate') {
        return { ok: false, code: 'UNKNOWN_PRICE', reason: 'resposta sem type=estimate — preço não autoritativo' };
    }
    const usd = record.usd;
    if (usd === undefined || usd === null || usd === '') {
        return { ok: false, code: 'UNKNOWN_PRICE', reason: 'cotação sem campo usd — nunca adivinhar preço' };
    }
    const micros = parseUsdToMicros(usd);
    if (micros === null || micros <= 0) {
        const preview = typeof usd === 'string' ? `"${usd.slice(0, 32)}"` : typeof usd;
        return { ok: false, code: 'UNKNOWN_PRICE', reason: `usd inválido (${preview})` };
    }
    return { ok: true, usdMicros: micros };
}

// ── Status ───────────────────────────────────────────────────────────────────

export type HiggsfieldTerminalStatus = 'failed' | 'nsfw' | 'canceled';

export type HiggsfieldStatusOutcome =
    | { kind: 'processing'; rawStatus: string }
    | { kind: 'succeeded'; outputUrl: string }
    | { kind: 'failed_terminal'; terminalStatus: HiggsfieldTerminalStatus; error?: string }
    | { kind: 'unknown'; reason: string };

export function parseStatusResponse(body: unknown): HiggsfieldStatusOutcome {
    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    if (!record) return { kind: 'unknown', reason: 'corpo do status ilegível' };

    const status = record.status;
    if (status === 'queued' || status === 'in_progress') {
        return { kind: 'processing', rawStatus: status };
    }
    if (status === 'completed') {
        const video = record.video;
        const outputUrl = video && typeof video === 'object' ? readString(video, 'url') : undefined;
        if (!outputUrl) return { kind: 'unknown', reason: 'completed sem video.url utilizável' };
        try {
            return { kind: 'succeeded', outputUrl: validateMediaUrl(outputUrl, 'video.url') };
        } catch (error) {
            return { kind: 'unknown', reason: error instanceof Error ? error.message : String(error) };
        }
    }
    if (status === 'failed' || status === 'nsfw' || status === 'canceled') {
        const errorText = readString(record, 'error') ?? readString(record, 'message');
        return {
            kind: 'failed_terminal',
            terminalStatus: status,
            error: errorText ? errorText.slice(0, 300) : undefined,
        };
    }
    return { kind: 'unknown', reason: `status inesperado: ${String(status)}` };
}

// ── Upload de imagem ─────────────────────────────────────────────────────────

export type ImageUploadGrant = {
    uploadUrl: string;
    uploadHeaders: Record<string, string>;
    publicUrl: string;
};

const FORBIDDEN_UPLOAD_HEADER = /^(authorization|cookie|proxy-authorization|x-api-key|api-key)$/i;
const MAX_UPLOAD_HEADERS = 8;

// Grant malformado OU contendo header de credencial é rejeitado: o PUT de bytes
// não pode carregar autorização da API nem seguir instruções suspeitas.
export function parseImageUploadGrant(body: unknown): ImageUploadGrant {
    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const uploadUrl = readString(record, 'upload_url');
    const publicUrl = readString(record, 'public_url');
    const rawHeaders = record?.upload_headers;
    if (!uploadUrl || !publicUrl || !rawHeaders || typeof rawHeaders !== 'object') {
        throw new MalformedProviderResponseError('grant de upload incompleto (upload_url/public_url/upload_headers)');
    }
    const headers: Record<string, string> = {};
    let count = 0;
    for (const [key, value] of Object.entries(rawHeaders as Record<string, unknown>)) {
        count += 1;
        if (count > MAX_UPLOAD_HEADERS) {
            throw new MalformedProviderResponseError('grant com headers demais');
        }
        if (!/^[A-Za-z0-9-]{1,64}$/.test(key)) {
            throw new MalformedProviderResponseError(`header com nome suspeito: "${key.slice(0, 32)}"`);
        }
        if (FORBIDDEN_UPLOAD_HEADER.test(key)) {
            throw new MalformedProviderResponseError(`header de credencial rejeitado no grant: ${key}`);
        }
        if (typeof value !== 'string' || value.length > 2048 || value.length === 0) {
            throw new MalformedProviderResponseError(`valor de header inválido: ${key}`);
        }
        headers[key] = value;
    }
    return {
        uploadUrl: validateMediaUrl(uploadUrl, 'upload_url'),
        uploadHeaders: headers,
        publicUrl: validateMediaUrl(publicUrl, 'public_url'),
    };
}

// ── Cliente ──────────────────────────────────────────────────────────────────

export type SubmitAcceptance = {
    requestId: string;
    statusUrl: string;
    cancelUrl?: string;
};

export type HiggsfieldClientOptions = {
    apiKey: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    sleep?: (delayMs: number) => Promise<void>;
};

export class HiggsfieldClient {
    private readonly apiKey: string;
    private readonly fetchImpl: typeof fetch;
    private readonly timeoutMs: number;
    private readonly sleep: (delayMs: number) => Promise<void>;

    constructor(options: HiggsfieldClientOptions) {
        this.apiKey = options.apiKey;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.timeoutMs = options.timeoutMs ?? 60_000;
        this.sleep = options.sleep ?? ((delay) => new Promise((resolve) => setTimeout(resolve, delay)));
    }

    // Defesa em profundidade: a chave jamais aparece em mensagens de erro/estado.
    private scrub(text: string): string {
        return this.apiKey ? text.split(this.apiKey).join('[redacted]') : text;
    }

    // POST idempotente-friendly com retry apenas no 429 (mesma chave é seguro).
    private async postJsonWithRetry(
        rawUrl: string,
        payload: unknown,
        extraHeaders: Record<string, string> = {},
    ): Promise<Response> {
        const url = validateProviderApiUrl(rawUrl);
        const { response } = await fetchWithRetry(
            url,
            {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Key ${this.apiKey}`,
                    ...extraHeaders,
                },
                body: JSON.stringify(payload),
            },
            3,
            { fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs, sleep: this.sleep },
        );
        if (isRedirect(response)) {
            throw new ProviderHttpError(
                response.status,
                `redirecionamento proibido (${response.status}) — origem não confirmada, credencial não reenviada`,
            );
        }
        return response;
    }

    async estimate(model: string, payload: HiggsfieldGenerationPayload): Promise<UsdEstimate> {
        try {
            const response = await this.postJsonWithRetry(
                `${HIGGSFIELD_API_ORIGIN}/estimate/${model}`,
                payload,
            );
            if (response.status === 401 || response.status === 403) {
                return { ok: false, code: 'AUTH', status: response.status };
            }
            if (!response.ok) {
                return { ok: false, code: 'HTTP', status: response.status };
            }
            const body = await response.json().catch(() => undefined);
            return parseUsdEstimate(body);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            return { ok: false, code: 'HTTP', reason: this.scrub(reason) };
        }
    }

    async submit(
        model: string,
        payload: HiggsfieldGenerationPayload,
        idempotencyKey: string,
    ): Promise<SubmitAcceptance> {
        let response: Response;
        try {
            response = await this.postJsonWithRetry(
                `${HIGGSFIELD_API_ORIGIN}/${model}`,
                payload,
                { 'Idempotency-Key': idempotencyKey },
            );
        } catch (error) {
            throw this.asAmbiguous(error);
        }

        if (response.ok) {
            const body = await response.json().catch(() => undefined);
            const requestId = readString(body, 'request_id');
            const statusUrl = readString(body, 'status_url');
            const cancelUrl = readString(body, 'cancel_url');
            if (!requestId || !statusUrl) {
                throw new SubmissionAmbiguousError(
                    'malformed_response',
                    'submissão aceita com corpo ilegível — tratar como incerto (mesma chave na retomada)',
                );
            }
            try {
                validateProviderApiUrl(statusUrl, 'status_url');
                if (cancelUrl) validateProviderApiUrl(cancelUrl, 'cancel_url');
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new SubmissionAmbiguousError('malformed_response', `submissão aceita com ${message}`);
            }
            return { requestId, statusUrl, cancelUrl };
        }

        if (response.status >= 500 || response.status === 408) {
            throw new SubmissionAmbiguousError(
                'server',
                `HTTP ${response.status} na submissão — resultado desconhecido; retomar com a MESMA chave`,
            );
        }
        // 4xx definitivos: pedido não aceito ⇒ sem geração ⇒ sem cobrança.
        const snippet = (await response.text().catch(() => '')).slice(0, 200);
        throw new SubmissionRejectedError(
            response.status,
            this.scrub(`submissão rejeitada com HTTP ${response.status}: ${snippet}`),
        );
    }

    private asAmbiguous(error: unknown): SubmissionAmbiguousError {
        if (error instanceof SubmissionAmbiguousError) return error;
        if (error instanceof ProviderHttpError && error.status >= 300 && error.status < 400) {
            return new SubmissionAmbiguousError('server', `redirecionamento proibido (${error.status}) — resultado desconhecido`);
        }
        const message = error instanceof Error ? error.message : String(error);
        const stage = /timeout|abort/i.test(message) ? 'timeout' as const : 'network' as const;
        return new SubmissionAmbiguousError(stage, this.scrub(message));
    }

    // Valida a origem ANTES do fetch: URL não confiável lança sem contato algum.
    async getStatus(statusUrl: string): Promise<HiggsfieldStatusOutcome> {
        const url = validateProviderApiUrl(statusUrl, 'status_url');
        let response: Response;
        try {
            response = await fetchWithTimeout(
                url,
                {
                    redirect: 'manual',
                    headers: { Authorization: `Key ${this.apiKey}` },
                },
                this.timeoutMs,
                this.fetchImpl,
            );
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            return { kind: 'unknown', reason: this.scrub(reason) };
        }
        if (isRedirect(response)) {
            return { kind: 'unknown', reason: `redirecionamento proibido (${response.status}) no status` };
        }
        if (!response.ok) {
            return { kind: 'unknown', reason: `HTTP ${response.status} na consulta de status` };
        }
        const body = await response.json().catch(() => undefined);
        return parseStatusResponse(body);
    }

    async createImageUpload(contentType: 'image/png' | 'image/jpeg'): Promise<ImageUploadGrant> {
        const response = await this.postJsonWithRetry(
            `${HIGGSFIELD_API_ORIGIN}/files/generate-upload-url`,
            { content_type: contentType },
        );
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new ProviderHttpError(response.status, 'autenticação Higgsfield recusada no upload-url');
            }
            throw new ProviderHttpError(response.status, `generate-upload-url HTTP ${response.status}`);
        }
        const body = await response.json().catch(() => undefined);
        return parseImageUploadGrant(body);
    }

    // PUT dos bytes decodificados com os headers do grant — SEM Authorization da API.
    async uploadImageBytes(grant: ImageUploadGrant, bytes: Uint8Array): Promise<void> {
        const url = validateMediaUrl(grant.uploadUrl, 'upload_url');
        const response = await fetchWithTimeout(
            url,
            {
                method: 'PUT',
                redirect: 'manual',
                headers: grant.uploadHeaders,
                body: bytes as unknown as BodyInit,
            },
            120_000,
            this.fetchImpl,
        );
        if (isRedirect(response)) {
            throw new ProviderHttpError(response.status, 'redirecionamento proibido no upload de imagem');
        }
        if (!response.ok) {
            throw new ProviderHttpError(response.status, `upload de imagem HTTP ${response.status}`);
        }
    }
}
