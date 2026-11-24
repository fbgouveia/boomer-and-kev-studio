// Orquestração de UMA cena no Higgsfield: preparar imagem → estimar → reservar →
// persistir (CRÍTICO) → submeter → sondar. A persistência crítica é injetada pelo
// worker: falha de gravação ANTES do POST impede a chamada paga; falha DEPOIS deixa
// estado recuperável (payload/chave/reserva já em disco ⇒ resubmissão com a MESMA chave).

import crypto from 'node:crypto';
import {
    HiggsfieldClient,
    ProviderUrlError,
    SubmissionAmbiguousError,
    SubmissionRejectedError,
    buildHiggsfieldPayload,
    computePayloadHash,
    validateMediaUrl,
    type HiggsfieldSound,
    type HiggsfieldStatusOutcome,
} from '@/lib/higgsfield';
import { chargeCost, releaseCost, reserveCost } from '@/lib/cost-ledger';
import { SUPPORTED_HIGGSFIELD_MODELS } from '@/lib/video-provider';
import { formatUsd } from '@/lib/money';

export type HiggsfieldSceneRequest = {
    provider: 'higgsfield';
    model: string;
    sceneId: string;
    attempt: number;
    // Valor do header Idempotency-Key enviado ao provedor (estável por tentativa).
    idempotencyKey: string;
    // Chave da reserva no ledger (hf:<job>:<cena>:a<tentativa>).
    operationKey: string;
    // Payload EXATO preparado — imutável; retomadas resubmetem ESTE objeto.
    payload: ReturnType<typeof buildHiggsfieldPayload>;
    payloadHash: string;
    estimatedUsdMicros: number;
    reservedUsdMicros: number;
    requestId: string | null;
    statusUrl: string | null;
    cancelUrl?: string;
    // POST com resultado desconhecido (rede/timeout/5xx). A retomada resubmete a
    // MESMA chave independentemente deste flag — ele documenta a causa.
    submissionUnknown: boolean;
    preparedAt: string;
    submittedAt?: string;
};

export type HiggsfieldSceneErrorCode =
    | 'INVALID_ANCHOR'
    | 'IMAGE_UPLOAD_FAILED'
    | 'PRICE_UNKNOWN'
    | 'BUDGET_EXCEEDED'
    | 'RESERVE_CONFLICT'
    // Chave já liberada com não-cobrança confirmada: retomar com tentativa NOVA.
    | 'KEY_RELEASED'
    | 'SUBMISSION_REJECTED'
    | 'SUBMISSION_UNKNOWN'
    | 'TERMINAL_FAILURE'
    | 'POLL_TIMEOUT'
    | 'PROVIDER_UNKNOWN';

export class HiggsfieldSceneError extends Error {
    constructor(
        readonly code: HiggsfieldSceneErrorCode,
        message: string,
        readonly details: Record<string, unknown> = {},
    ) {
        super(message);
        this.name = 'HiggsfieldSceneError';
    }
}

const MAX_ANCHOR_DATA_URI_CHARS = 8_000_000;
const DEFAULT_POLL_DEADLINE_MS = 10 * 60_000;
const MAX_SKIPPED_ATTEMPTS = 20;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const ANCHOR_DATA_URI_PATTERN = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/i;

function assertSupportedModel(model: string): void {
    if (!SUPPORTED_HIGGSFIELD_MODELS.includes(model)) {
        throw new HiggsfieldSceneError('PROVIDER_UNKNOWN', `modelo não suportado pelo payload desta fase: "${model.slice(0, 128)}" — nenhuma chamada paga feita`);
    }
}

export function higgsfieldOperationKey(jobId: string, sceneId: string, attempt: number): string {
    return `hf:${jobId}:${sceneId}:a${attempt}`;
}

export function higgsfieldIdempotencyKey(operationKey: string, payloadHashValue: string): string {
    return `hfk-${crypto.createHash('sha256').update(`${operationKey}|${payloadHashValue}`).digest('hex')}`;
}

// HTTPS público já alcançável é reutilizado sem buscar arquivo privado. Data URI
// (local, recortado pelo reframe existente) é decodificado e enviado ao storage do
// provedor; o payload guarda a public_url — nunca a URL temporária de upload.
export async function prepareHiggsfieldAnchorImage(
    anchor: string | undefined,
    client: HiggsfieldClient,
    log: (message: string) => void,
): Promise<string> {
    if (!anchor) {
        throw new HiggsfieldSceneError('INVALID_ANCHOR', 'cena sem imagem âncora (reframe ausente)');
    }
    if (anchor.startsWith('https://')) {
        return validateMediaUrl(anchor, 'âncora remota');
    }
    const match = ANCHOR_DATA_URI_PATTERN.exec(anchor);
    if (!match) {
        throw new HiggsfieldSceneError(
            'INVALID_ANCHOR',
            `âncora não suportada pela API direta (somente https ou data URI png/jpeg): "${anchor.slice(0, 48)}..."`,
        );
    }
    if (anchor.length > MAX_ANCHOR_DATA_URI_CHARS) {
        throw new HiggsfieldSceneError('INVALID_ANCHOR', `data URI da âncora grande demais (${anchor.length} caracteres)`);
    }
    const contentType = match[1].toLowerCase() === 'png' ? 'image/png' as const : 'image/jpeg' as const;
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length) {
        throw new HiggsfieldSceneError('INVALID_ANCHOR', 'data URI da âncora decodificou vazio');
    }
    try {
        const grant = await client.createImageUpload(contentType);
        await client.uploadImageBytes(grant, new Uint8Array(bytes));
        log(`📤 [Higgsfield] Âncora enviada ao storage do provedor (${contentType}, ${bytes.length} bytes).`);
        return grant.publicUrl;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new HiggsfieldSceneError('IMAGE_UPLOAD_FAILED', `upload da âncora falhou: ${message}`);
    }
}

export type LaunchHiggsfieldSceneParams = {
    jobId: string;
    sceneId: string;
    attempt: number;
    anchor: string | undefined;
    prompt: string;
    duration: number;
    sound: HiggsfieldSound;
    client: HiggsfieldClient;
    model: string;
    ledgerDir: string;
    capMicros: number;
    // Persistência CRÍTICA: deve lançar se a gravação falhar (nunca lançar geração
    // paga sem checkpoint). O worker grava o registro no estado do job.
    persistRequest: (record: HiggsfieldSceneRequest) => void;
    log: (message: string) => void;
    now?: () => Date;
};

export async function launchHiggsfieldScene(params: LaunchHiggsfieldSceneParams): Promise<HiggsfieldSceneRequest> {
    const now = params.now ?? (() => new Date());
    assertSupportedModel(params.model);

    let imageUrl: string;
    try {
        imageUrl = await prepareHiggsfieldAnchorImage(params.anchor, params.client, params.log);
    } catch (error) {
        if (error instanceof HiggsfieldSceneError) throw error;
        throw new HiggsfieldSceneError('IMAGE_UPLOAD_FAILED', error instanceof Error ? error.message : String(error));
    }

    const payload = buildHiggsfieldPayload({
        imageUrl,
        prompt: params.prompt,
        duration: params.duration,
        sound: params.sound,
    });
    const digest = computePayloadHash(payload);

    // 1. Cotação autoritativa com o payload real. Preço desconhecido/ilegível
    //    NUNCA autoriza geração (não há adivinhação de preço).
    const estimate = await params.client.estimate(params.model, payload);
    if (!estimate.ok) {
        throw new HiggsfieldSceneError(
            'PRICE_UNKNOWN',
            `cotação recusada (${estimate.code}${estimate.status ? ` HTTP ${estimate.status}` : ''})${estimate.reason ? `: ${estimate.reason}` : ''} — geração não autorizada`,
        );
    }
    params.log(`💵 [Higgsfield] Estimativa autenticada: ${formatUsd(estimate.usdMicros)} (modelo ${params.model}).`);

    // 2. Reserva durável contra o teto global dos testes iniciais. Chaves já
    //    LIBERADAS (não-cobrança documentada: 1º POST 4xx ou término terminal
    //    confirmado) são puladas: a tentativa avança, nunca reabre chave liberada.
    //    Cobre retomadas que perderam o registro da cena antes da nova tentativa.
    let attempt = params.attempt;
    let operationKey = higgsfieldOperationKey(params.jobId, params.sceneId, attempt);
    let reserve = reserveCost({
        ledgerDir: params.ledgerDir,
        operationKey,
        amountMicros: estimate.usdMicros,
        payloadHash: digest,
        jobId: params.jobId,
        sceneId: params.sceneId,
        capMicros: params.capMicros,
        now: now().getTime(),
    });
    // ponytail: limite fixo de tentativas puladas; acima disso é anomalia a revisar.
    while (reserve.kind === 'conflict' && reserve.reason === 'KEY_RELEASED_USE_NEW_ATTEMPT' && attempt < params.attempt + MAX_SKIPPED_ATTEMPTS) {
        attempt += 1;
        operationKey = higgsfieldOperationKey(params.jobId, params.sceneId, attempt);
        params.log(`↩️ [Orçamento] Tentativa ${attempt - 1} já liberada sem cobrança — usando tentativa ${attempt}.`);
        reserve = reserveCost({
            ledgerDir: params.ledgerDir,
            operationKey,
            amountMicros: estimate.usdMicros,
            payloadHash: digest,
            jobId: params.jobId,
            sceneId: params.sceneId,
            capMicros: params.capMicros,
            now: now().getTime(),
        });
    }
    const idempotencyKeyValue = higgsfieldIdempotencyKey(operationKey, digest);
    if (reserve.kind === 'budget_exceeded') {
        throw new HiggsfieldSceneError(
            'BUDGET_EXCEEDED',
            `teto de testes atingido: pedido ${formatUsd(reserve.requestedMicros)}, comprometido ${formatUsd(reserve.committedMicros)}, teto ${formatUsd(reserve.capMicros)}`,
            { requestedMicros: reserve.requestedMicros, committedMicros: reserve.committedMicros, capMicros: reserve.capMicros },
        );
    }
    if (reserve.kind === 'ledger_corrupt') {
        throw new HiggsfieldSceneError('RESERVE_CONFLICT', `ledger de orçamento ilegível (${reserve.filePath}) — intervenção manual antes de novos gastos`);
    }
    if (reserve.kind === 'conflict') {
        throw new HiggsfieldSceneError('RESERVE_CONFLICT', `reserva conflitante para ${operationKey}: ${reserve.reason}`);
    }
    const reservedMicros = reserve.reservation.amountMicros;
    params.log(`🏦 [Orçamento] Reserva de ${formatUsd(reservedMicros)} registrada (${operationKey}).`);

    const record: HiggsfieldSceneRequest = {
        provider: 'higgsfield',
        model: params.model,
        sceneId: params.sceneId,
        attempt,
        idempotencyKey: idempotencyKeyValue,
        operationKey,
        payload,
        payloadHash: digest,
        estimatedUsdMicros: estimate.usdMicros,
        reservedUsdMicros: reservedMicros,
        requestId: null,
        statusUrl: null,
        submissionUnknown: false,
        preparedAt: now().toISOString(),
    };

    // 3. Persistência CRÍTICA antes da chamada paga: gravação falhou ⇒ sem POST.
    params.persistRequest(record);

    // 4. Submissão idempotente (chave estável derivada da operação + payload).
    try {
        const acceptance = await params.client.submit(params.model, payload, idempotencyKeyValue);
        record.requestId = acceptance.requestId;
        record.statusUrl = acceptance.statusUrl;
        record.cancelUrl = acceptance.cancelUrl;
        record.submittedAt = now().toISOString();
    } catch (error) {
        if (error instanceof SubmissionRejectedError) {
            // Pedido NÃO aceito: sem geração criada ⇒ sem cobrança (contrato documentado).
            const release = releaseCost({
                ledgerDir: params.ledgerDir,
                operationKey,
                reason: 'submission_rejected_no_generation',
                now: now().getTime(),
            });
            params.log(
                release.kind === 'released'
                    ? `↩️ [Orçamento] Reserva liberada: submissão rejeitada (HTTP ${error.status}), nenhuma geração criada.`
                    : `⚠️ [Orçamento] Reserva MANTIDA (liberação indisponível: ${release.kind}) após rejeição HTTP ${error.status}.`,
            );
            throw new HiggsfieldSceneError('SUBMISSION_REJECTED', `submissão rejeitada pelo provedor (HTTP ${error.status})`, { status: error.status });
        }
        const ambiguous = error instanceof SubmissionAmbiguousError
            ? error
            : new SubmissionAmbiguousError('network', error instanceof Error ? error.message : String(error));
        record.submissionUnknown = true;
        try {
            params.persistRequest(record);
        } catch (persistError) {
            params.log(`⚠️ [Higgsfield] Falha ao persistir estado incerto: ${persistError instanceof Error ? persistError.message : String(persistError)} — a retomada usa a MESMA chave gravada antes do POST.`);
        }
        throw new HiggsfieldSceneError(
            'SUBMISSION_UNKNOWN',
            `submissão com resultado desconhecido (${ambiguous.stage}): ${ambiguous.message} — retomada resubmete a MESMA chave/payload`,
        );
    }

    // 5. Identificadores aceitos persistidos ANTES do polling.
    params.persistRequest(record);
    params.log(`🎬 [Higgsfield] Submissão aceita: ${record.requestId}.`);
    return record;
}

export type PollHiggsfieldSceneParams = {
    record: HiggsfieldSceneRequest;
    client: HiggsfieldClient;
    ledgerDir: string;
    deadlineMs?: number;
    intervalMs?: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    log: (message: string) => void;
};

export type PollHiggsfieldSceneResult = {
    outputUrl: string;
    charge: 'charged' | 'already_charged' | 'conflict';
};

// Polling com prazo e backoff fixo. Términos confirmados atualizam o ledger:
// completed ⇒ cobrado (fica retido); failed/nsfw/canceled ⇒ liberação documentada.
// Incerteza prolongada termina em POLL_TIMEOUT com reserva retida (reconciliável).
export async function pollHiggsfieldScene(params: PollHiggsfieldSceneParams): Promise<PollHiggsfieldSceneResult> {
    const { record } = params;
    if (!record.statusUrl) {
        throw new HiggsfieldSceneError(
            'PROVIDER_UNKNOWN',
            `cena ${record.sceneId}: requestId ${record.requestId} sem statusUrl persistido — reconciliar manualmente antes de gastar de novo`,
        );
    }
    const deadlineMs = params.deadlineMs ?? DEFAULT_POLL_DEADLINE_MS;
    const intervalMs = params.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const sleep = params.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    const now = params.now ?? Date.now;
    const deadline = now() + deadlineMs;

    for (;;) {
        if (now() >= deadline) {
            throw new HiggsfieldSceneError(
                'POLL_TIMEOUT',
                `polling excedeu ${Math.round(deadlineMs / 1000)}s (requestId ${record.requestId}; reserva retida; retomada reconcilia com o provedor)`,
            );
        }

        let outcome: HiggsfieldStatusOutcome;
        try {
            outcome = await params.client.getStatus(record.statusUrl);
        } catch (error) {
            if (error instanceof ProviderUrlError) {
                throw new HiggsfieldSceneError(
                    'PROVIDER_UNKNOWN',
                    `status_url não confiável: ${error.message} — credencial não enviada; reconciliar manualmente`,
                );
            }
            // Rede instável: continua tentando até o prazo (nunca relança às cegas).
            outcome = { kind: 'unknown', reason: error instanceof Error ? error.message : String(error) };
        }

        if (outcome.kind === 'succeeded') {
            const charge = chargeCost({ ledgerDir: params.ledgerDir, operationKey: record.operationKey, now: now() });
            if (charge.kind === 'charged') {
                params.log(`💰 [Orçamento] Geração concluída: ${formatUsd(record.reservedUsdMicros)} confirmados como cobrados.`);
            } else if (charge.kind === 'conflict') {
                params.log(`⚠️ [Orçamento] Cobrança de ${record.sceneId} em estado conflitante (${charge.state}) — reserve preservada, revise o ledger.`);
            }
            return {
                outputUrl: outcome.outputUrl,
                charge: charge.kind === 'charged' ? 'charged' : charge.kind === 'already_charged' ? 'already_charged' : 'conflict',
            };
        }

        if (outcome.kind === 'failed_terminal') {
            const release = releaseCost({
                ledgerDir: params.ledgerDir,
                operationKey: record.operationKey,
                reason: 'provider_terminal_no_charge',
                now: now(),
            });
            params.log(
                release.kind === 'released'
                    ? `↩️ [Orçamento] Reserva liberada: término ${outcome.terminalStatus} sem cobrança (contrato do provedor).`
                    : `⚠️ [Orçamento] Reserva MANTIDA após término ${outcome.terminalStatus} (estado ${release.kind}).`,
            );
            throw new HiggsfieldSceneError(
                'TERMINAL_FAILURE',
                `geração terminou como ${outcome.terminalStatus}${outcome.error ? `: ${outcome.error}` : ''}`,
                { terminalStatus: outcome.terminalStatus },
            );
        }

        if (outcome.kind === 'processing') {
            await sleep(intervalMs);
            continue;
        }
        params.log(`⏳ [Higgsfield] status provisoriamente ilegível: ${outcome.reason}`);
        await sleep(intervalMs);
    }
}

export type ResubmitHiggsfieldSceneParams = {
    record: HiggsfieldSceneRequest;
    client: HiggsfieldClient;
    ledgerDir: string;
    capMicros: number;
    persistRequest: (record: HiggsfieldSceneRequest) => void;
    log: (message: string) => void;
    now?: () => Date;
};

// Retomada de POST ambíguo: MESMA chave, MESMO payload persistido. Se o provedor
// já aceitou a primeira tentativa, a idempotência dele devolve o MESMO requestId.
// Nunca criar chave nova aqui — isso duplicaria geração paga.
export async function resubmitHiggsfieldScene(params: ResubmitHiggsfieldSceneParams): Promise<HiggsfieldSceneRequest> {
    const { record } = params;
    const now = params.now ?? (() => new Date());
    assertSupportedModel(record.model);
    if (record.requestId) {
        throw new HiggsfieldSceneError('PROVIDER_UNKNOWN', 'resubmissão exige registro SEM requestId — consulte o status existente em vez disso');
    }

    // Reserva original continua válida (mesma chave ⇒ nunca reserva duas vezes).
    const reserve = reserveCost({
        ledgerDir: params.ledgerDir,
        operationKey: record.operationKey,
        amountMicros: record.reservedUsdMicros,
        payloadHash: record.payloadHash,
        sceneId: record.sceneId,
        capMicros: params.capMicros,
        now: now().getTime(),
    });
    if (reserve.kind === 'budget_exceeded') {
        throw new HiggsfieldSceneError('BUDGET_EXCEEDED', `teto atingido na retomada: ${reserve.requestedMicros} micros`);
    }
    if (reserve.kind === 'ledger_corrupt') {
        throw new HiggsfieldSceneError('RESERVE_CONFLICT', `ledger ilegível na retomada (${reserve.filePath})`);
    }
    if (reserve.kind === 'conflict' && reserve.reason === 'KEY_RELEASED_USE_NEW_ATTEMPT') {
        // Só chega aqui após liberação documentada (1º POST com 4xx ou término
        // terminal confirmado): nada cobrável nesta chave ⇒ tentativa nova é segura.
        throw new HiggsfieldSceneError('KEY_RELEASED', `chave ${record.operationKey} já liberada sem cobrança — relançar com tentativa nova`);
    }
    if (reserve.kind === 'conflict') {
        throw new HiggsfieldSceneError('RESERVE_CONFLICT', `reserva conflitante na retomada (${record.operationKey}): ${reserve.reason}`);
    }

    params.log('♻️ [Higgsfield] Retomada: resubmetendo a MESMA chave e o MESMO payload persistidos.');
    try {
        const acceptance = await params.client.submit(record.model, record.payload, record.idempotencyKey);
        const updated: HiggsfieldSceneRequest = {
            ...record,
            requestId: acceptance.requestId,
            statusUrl: acceptance.statusUrl,
            cancelUrl: acceptance.cancelUrl,
            submissionUnknown: false,
            submittedAt: now().toISOString(),
        };
        params.persistRequest(updated);
        params.log(`🎬 [Higgsfield] Resubmissão aceita: ${updated.requestId}.`);
        return updated;
    } catch (error) {
        if (error instanceof SubmissionRejectedError) {
            // O POST ORIGINAL teve resultado desconhecido: um 4xx agora (401/409/422…)
            // NÃO prova que ele foi recusado — pode ter criado geração cobrável.
            // Reserva, payload e MESMA chave ficam retidos até confirmação terminal.
            try {
                params.persistRequest({ ...record, submissionUnknown: true });
            } catch (persistError) {
                params.log(`⚠️ [Higgsfield] Falha ao persistir estado incerto: ${persistError instanceof Error ? persistError.message : String(persistError)}`);
            }
            params.log(`⚠️ [Orçamento] Reserva MANTIDA: resubmissão recebeu HTTP ${error.status}, mas o POST original segue desconhecido. Reconcilie com o provedor; a próxima retomada usa a MESMA chave.`);
            throw new HiggsfieldSceneError(
                'SUBMISSION_UNKNOWN',
                `resubmissão recebeu HTTP ${error.status} após POST original desconhecido — reserva e chave mantidas até reconciliação`,
                { status: error.status },
            );
        }
        const ambiguous = error instanceof SubmissionAmbiguousError
            ? error
            : new SubmissionAmbiguousError('network', error instanceof Error ? error.message : String(error));
        try {
            params.persistRequest({ ...record, submissionUnknown: true });
        } catch (persistError) {
            params.log(`⚠️ [Higgsfield] Falha ao persistir estado incerto: ${persistError instanceof Error ? persistError.message : String(persistError)}`);
        }
        throw new HiggsfieldSceneError('SUBMISSION_UNKNOWN', `resubmissão incerta (${ambiguous.stage}) — manter a MESMA chave na próxima retomada`);
    }
}

// ── Plano de recuperação (puro, testável) ────────────────────────────────────

export type HiggsfieldRecoveryPlan =
    | { kind: 'fresh_launch' }
    | { kind: 'resubmit_same_key' }
    | { kind: 'keep_polling' }
    | { kind: 'reuse_result'; outputUrl: string }
    | { kind: 'relaunch_new_attempt' }
    | { kind: 'stop_unresolved'; reason: string };

export function planHiggsfieldRecovery(
    record: Pick<HiggsfieldSceneRequest, 'requestId' | 'statusUrl'> | undefined,
    outcome: HiggsfieldStatusOutcome | null | undefined,
): HiggsfieldRecoveryPlan {
    if (!record) return { kind: 'fresh_launch' };
    if (!record.requestId) return { kind: 'resubmit_same_key' };
    if (!outcome) {
        return { kind: 'stop_unresolved', reason: 'consulta ao provedor indisponível — reserva retida; reconcilie antes de relançar' };
    }
    if (outcome.kind === 'succeeded') return { kind: 'reuse_result', outputUrl: outcome.outputUrl };
    if (outcome.kind === 'processing') return { kind: 'keep_polling' };
    if (outcome.kind === 'failed_terminal') return { kind: 'relaunch_new_attempt' };
    return { kind: 'stop_unresolved', reason: outcome.reason };
}

// Consulta tolerante: erro de rede/URL vira null (o plano decide parar com segurança).
export async function fetchHiggsfieldOutcomeOrNull(
    client: HiggsfieldClient,
    record: Pick<HiggsfieldSceneRequest, 'requestId' | 'statusUrl'>,
): Promise<HiggsfieldStatusOutcome | null> {
    if (!record.requestId || !record.statusUrl) return null;
    try {
        return await client.getStatus(record.statusUrl);
    } catch {
        return null;
    }
}

// ── Reconciliação em lote (GET de status pós-restart) ────────────────────────

export type HiggsfieldRequestReconciliation = {
    sceneId: string;
    requestId: string;
    action: 'REUSE' | 'KEEP_POLLING' | 'RELAUNCH' | 'RECONCILE_UNAVAILABLE';
    detail?: string;
};

export async function reconcileHiggsfieldRequests(
    client: HiggsfieldClient,
    requests: Record<string, Pick<HiggsfieldSceneRequest, 'requestId' | 'statusUrl'>>,
): Promise<Record<string, HiggsfieldRequestReconciliation>> {
    const results: Record<string, HiggsfieldRequestReconciliation> = {};
    for (const [sceneId, request] of Object.entries(requests)) {
        if (!request?.requestId || !request?.statusUrl) continue;
        const outcome = await fetchHiggsfieldOutcomeOrNull(client, request);
        const plan = planHiggsfieldRecovery(request, outcome);
        const action = plan.kind === 'reuse_result'
            ? 'REUSE'
            : plan.kind === 'keep_polling'
                ? 'KEEP_POLLING'
                : plan.kind === 'relaunch_new_attempt'
                    ? 'RELAUNCH'
                    : 'RECONCILE_UNAVAILABLE';
        results[sceneId] = {
            sceneId,
            requestId: request.requestId,
            action,
            detail: plan.kind === 'reuse_result'
                ? plan.outputUrl
                : plan.kind === 'stop_unresolved'
                    ? plan.reason
                    : undefined,
        };
    }
    return results;
}

export function sumReservedMicros(requests: Iterable<HiggsfieldSceneRequest>): number {
    let total = 0;
    for (const record of requests) {
        total += Number.isFinite(record?.reservedUsdMicros) ? record.reservedUsdMicros : 0;
    }
    return total;
}
