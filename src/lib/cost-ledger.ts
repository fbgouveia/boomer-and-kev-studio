// Ledger durável do teto global dos testes iniciais Higgsfield (US$30 acumulados,
// não por job). Tudo em micros USD inteiros, persistido em disco e compartilhado
// entre jobs/processos/reinícios DA MESMA MÁQUINA (não é global entre máquinas).
//
// Exclusão mútua: TODA mutação (admissão de reserva, cobrança, liberação) roda sob
// um lock de diretório (`mkdir` atômico). A admissão verifica o teto ANTES de criar
// o registro, na mesma seção crítica: nenhum registro não validado chega ao disco
// e nenhuma transição sobrescreve outra.
// Lock abandonado (processo morto) NÃO é quebrado automaticamente: as operações
// falham com erro explícito e nada é liberado/gasto por suposição. Como cada falha
// deixa a verba CONTADA (nunca descontada), o modo de falha é sempre conservador.
// ponytail: lock global por diretório; trocar por banco transacional se houver
// mais de uma máquina ou volume (BK-17).

import crypto from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseUsdToMicros, MICRO_PER_USD } from '@/lib/money';

export { MICRO_PER_USD };

// Teto autorizado pelo Felipe (08/11/2026). O ambiente pode REDUZIR, nunca aumentar.
export const MAX_INITIAL_TEST_CAP_MICROS = 30 * MICRO_PER_USD;

const LOCK_NAME = 'budget.lock';
const LOCK_WAIT_MS = 5_000;
const LOCK_POLL_MS = 10;

// Liberação SÓ com contrato documentado de não-cobrança:
// - submission_rejected_no_generation: o PRIMEIRO POST desta chave recebeu 4xx
//   definitivo — nenhuma geração foi criada. NUNCA usar após POST de resultado
//   desconhecido (o 4xx da repetição não prova que o original foi recusado).
// - provider_terminal_no_charge: término confirmado failed/nsfw/canceled no
//   contrato do provedor (cobra na conclusão, não no fracasso terminal).
// Estados desconhecidos/ambíguos NUNCA liberam — a reserva fica retida.
export type ReleaseReason = 'submission_rejected_no_generation' | 'provider_terminal_no_charge';

const RELEASE_REASONS: readonly string[] = [
    'submission_rejected_no_generation',
    'provider_terminal_no_charge',
];

const LEDGER_STATES = ['RESERVED', 'CHARGED', 'RELEASED'] as const;
type LedgerState = typeof LEDGER_STATES[number];

type LedgerRecord = {
    key: string;
    amountMicros: number;
    payloadHash: string;
    state: LedgerState;
    jobId?: string;
    sceneId?: string;
    releaseReason?: ReleaseReason;
    createdAt: string;
    updatedAt: string;
};

export type CostReservation = {
    operationKey: string;
    filePath: string;
    amountMicros: number;
};

export type ReserveOutcome =
    | { kind: 'reserved'; reservation: CostReservation }
    // Mesma chave + mesmo payload: idempotente, NUNCA reserva duas vezes.
    | { kind: 'existing'; reservation: CostReservation }
    | { kind: 'conflict'; reason: 'PAYLOAD_MISMATCH' | 'KEY_RELEASED_USE_NEW_ATTEMPT' }
    | { kind: 'budget_exceeded'; requestedMicros: number; committedMicros: number; capMicros: number }
    | { kind: 'ledger_corrupt'; filePath: string };

export type ChargeOutcome =
    | { kind: 'charged' }
    | { kind: 'already_charged' }
    | { kind: 'unknown_key' }
    | { kind: 'conflict'; state: string };

export type ReleaseOutcome =
    | { kind: 'released' }
    | { kind: 'already_released' }
    | { kind: 'unknown_key' }
    | { kind: 'charged_cannot_release' }
    | { kind: 'conflict'; state: string };

export type BudgetSummary = {
    capMicros: number;
    reservedMicros: number;
    chargedMicros: number;
    remainingMicros: number;
    corruptEntries: string[];
};

const SHA256_HEX = /^[0-9a-f]{64}$/;

function reservationPath(ledgerDir: string, operationKey: string): string {
    const digest = crypto.createHash('sha256').update(operationKey).digest('hex');
    return path.join(ledgerDir, `budget_${digest}.json`);
}

function isLedgerEntry(name: string): boolean {
    return name.startsWith('budget_') && name.endsWith('.json') && !name.includes('.tmp.');
}

// ── Lock ─────────────────────────────────────────────────────────────────────

export class LedgerLockError extends Error {
    constructor(readonly lockPath: string, message: string) {
        super(message);
        this.name = 'LedgerLockError';
    }
}

function sleepSync(ms: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function describeLockHolder(lockPath: string): string {
    try {
        const pid = Number(readFileSync(path.join(lockPath, 'owner'), 'utf8').trim());
        if (!Number.isSafeInteger(pid) || pid <= 0) return 'dono ilegível';
        try {
            process.kill(pid, 0);
            return `pid ${pid} ativo`;
        } catch {
            return `pid ${pid} NÃO está mais ativo (lock abandonado)`;
        }
    } catch {
        return 'dono desconhecido';
    }
}

function withLedgerLock<T>(ledgerDir: string, fn: () => T, waitMs = LOCK_WAIT_MS): T {
    mkdirSync(ledgerDir, { recursive: true });
    const lockPath = path.join(ledgerDir, LOCK_NAME);
    const deadline = Date.now() + waitMs;
    for (;;) {
        try {
            mkdirSync(lockPath);
            break;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            if (Date.now() >= deadline) {
                throw new LedgerLockError(
                    lockPath,
                    `cost-ledger: lock ocupado (${describeLockHolder(lockPath)}). Nenhuma verba foi liberada ou gasta. `
                    + `Se o processo dono morreu, confira o ledger e remova ${lockPath} manualmente.`,
                );
            }
            sleepSync(LOCK_POLL_MS);
        }
    }
    let failed = false;
    try {
        try { writeFileSync(path.join(lockPath, 'owner'), String(process.pid)); } catch { /* diagnóstico apenas */ }
        return fn();
    } catch (error) {
        failed = true;
        throw error;
    } finally {
        try { unlinkSync(path.join(lockPath, 'owner')); } catch { /* ausente */ }
        // Falha ao soltar o lock não mascara o erro original (fail-closed: lock fica).
        try { rmdirSync(lockPath); } catch (error) { if (!failed) throw error; }
    }
}

// ── Leitura estrita ──────────────────────────────────────────────────────────

function parseRecord(raw: unknown, expectedFile: string, ledgerDir: string): LedgerRecord | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.key !== 'string' || !r.key || r.key.length > 200) return null;
    if (typeof r.amountMicros !== 'number' || !Number.isSafeInteger(r.amountMicros) || r.amountMicros <= 0) return null;
    if (typeof r.payloadHash !== 'string' || !SHA256_HEX.test(r.payloadHash)) return null;
    if (typeof r.state !== 'string' || !(LEDGER_STATES as readonly string[]).includes(r.state)) return null;
    if (typeof r.createdAt !== 'string' || !Number.isFinite(Date.parse(r.createdAt))) return null;
    if (typeof r.updatedAt !== 'string' || !Number.isFinite(Date.parse(r.updatedAt))) return null;
    if (r.state === 'RELEASED' && (typeof r.releaseReason !== 'string' || !RELEASE_REASONS.includes(r.releaseReason))) return null;
    if (r.state !== 'RELEASED' && r.releaseReason !== undefined) return null;
    // O nome do arquivo deriva da chave: registro trocado de arquivo é corrupção.
    if (reservationPath(ledgerDir, r.key) !== expectedFile) return null;
    return r as unknown as LedgerRecord;
}

type ReadResult = { kind: 'missing' } | { kind: 'ok'; record: LedgerRecord } | { kind: 'corrupt' };

function readRecord(ledgerDir: string, filePath: string): ReadResult {
    let text: string;
    try {
        text = readFileSync(filePath, 'utf8');
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'ENOENT' ? { kind: 'missing' } : { kind: 'corrupt' };
    }
    try {
        const record = parseRecord(JSON.parse(text), filePath, ledgerDir);
        return record ? { kind: 'ok', record } : { kind: 'corrupt' };
    } catch {
        return { kind: 'corrupt' };
    }
}

// Substituição atômica (temp + rename). Só chamada sob o lock.
function writeRecordAtomic(filePath: string, record: LedgerRecord): void {
    const tempPath = `${filePath}.tmp.${process.pid}.${crypto.randomUUID()}`;
    writeFileSync(tempPath, JSON.stringify(record, null, 2), { flag: 'wx' });
    try {
        renameSync(tempPath, filePath);
    } finally {
        try { unlinkSync(tempPath); } catch { /* rename moveu; nada a limpar */ }
    }
}

function scanLedger(ledgerDir: string): { reservedMicros: number; chargedMicros: number; corrupt: string[] } {
    let reservedMicros = 0;
    let chargedMicros = 0;
    const corrupt: string[] = [];
    let entries: string[];
    try {
        entries = readdirSync(ledgerDir);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { reservedMicros, chargedMicros, corrupt };
        // Falha de leitura NUNCA vira saldo livre.
        return { reservedMicros, chargedMicros, corrupt: ['<diretório ilegível>'] };
    }
    for (const name of entries) {
        if (!isLedgerEntry(name)) continue;
        const parsed = readRecord(ledgerDir, path.join(ledgerDir, name));
        if (parsed.kind !== 'ok') {
            corrupt.push(name);
            continue;
        }
        if (parsed.record.state === 'RESERVED') reservedMicros += parsed.record.amountMicros;
        if (parsed.record.state === 'CHARGED') chargedMicros += parsed.record.amountMicros;
    }
    return { reservedMicros, chargedMicros, corrupt };
}

// ── Operações ────────────────────────────────────────────────────────────────

export function reserveCost(params: {
    ledgerDir: string;
    operationKey: string;
    amountMicros: number;
    payloadHash: string;
    jobId?: string;
    sceneId?: string;
    capMicros: number;
    now?: number;
}): ReserveOutcome {
    const { ledgerDir, operationKey, payloadHash, capMicros, amountMicros } = params;
    // Quantia já em micros inteiros (arredondada para cima por parseUsdToMicros);
    // fração aqui é erro de chamador, não algo a arredondar silenciosamente.
    if (!Number.isSafeInteger(amountMicros) || amountMicros <= 0) {
        throw new Error(`cost-ledger: quantia inválida para reserva: ${amountMicros}`);
    }
    if (!operationKey || operationKey.length > 200) {
        throw new Error('cost-ledger: operationKey inválida');
    }
    if (!SHA256_HEX.test(payloadHash)) {
        throw new Error('cost-ledger: payloadHash deve ser sha256 hexadecimal');
    }
    if (!Number.isSafeInteger(capMicros) || capMicros <= 0 || capMicros > MAX_INITIAL_TEST_CAP_MICROS) {
        throw new Error('cost-ledger: capMicros inválido (máximo autorizado US$30)');
    }

    const filePath = reservationPath(ledgerDir, operationKey);
    return withLedgerLock(ledgerDir, () => {
        const existing = readRecord(ledgerDir, filePath);
        if (existing.kind === 'corrupt') return { kind: 'ledger_corrupt', filePath };
        if (existing.kind === 'ok') {
            const record = existing.record;
            if (record.key !== operationKey) return { kind: 'ledger_corrupt', filePath };
            // RELEASED antes do payload: chave liberada (não-cobrança documentada)
            // nunca é reaberta, qualquer que seja o payload — a tentativa avança.
            if (record.state === 'RELEASED') return { kind: 'conflict', reason: 'KEY_RELEASED_USE_NEW_ATTEMPT' };
            if (record.payloadHash !== payloadHash) return { kind: 'conflict', reason: 'PAYLOAD_MISMATCH' };
            return { kind: 'existing', reservation: { operationKey, filePath, amountMicros: record.amountMicros } };
        }

        // Admissão: soma e checagem ANTES de criar, na mesma seção crítica.
        const scan = scanLedger(ledgerDir);
        if (scan.corrupt.length) {
            return { kind: 'ledger_corrupt', filePath: path.join(ledgerDir, scan.corrupt[0]) };
        }
        const committed = scan.reservedMicros + scan.chargedMicros;
        if (committed + amountMicros > capMicros) {
            return { kind: 'budget_exceeded', requestedMicros: amountMicros, committedMicros: committed, capMicros };
        }
        const nowIso = new Date(params.now ?? Date.now()).toISOString();
        writeRecordAtomic(filePath, {
            key: operationKey,
            amountMicros,
            payloadHash,
            state: 'RESERVED',
            jobId: params.jobId,
            sceneId: params.sceneId,
            createdAt: nowIso,
            updatedAt: nowIso,
        });
        return { kind: 'reserved', reservation: { operationKey, filePath, amountMicros } };
    });
}

// Cobrança confirmada (geração concluída): fica retida para sempre no teto.
export function chargeCost(params: { ledgerDir: string; operationKey: string; now?: number }): ChargeOutcome {
    const filePath = reservationPath(params.ledgerDir, params.operationKey);
    return withLedgerLock(params.ledgerDir, () => {
        const parsed = readRecord(params.ledgerDir, filePath);
        if (parsed.kind === 'missing') return { kind: 'unknown_key' };
        if (parsed.kind === 'corrupt') return { kind: 'conflict', state: 'CORRUPT' };
        if (parsed.record.state === 'CHARGED') return { kind: 'already_charged' };
        if (parsed.record.state !== 'RESERVED') return { kind: 'conflict', state: parsed.record.state };
        writeRecordAtomic(filePath, {
            ...parsed.record,
            state: 'CHARGED',
            updatedAt: new Date(params.now ?? Date.now()).toISOString(),
        });
        return { kind: 'charged' };
    });
}

export function releaseCost(params: {
    ledgerDir: string;
    operationKey: string;
    reason: ReleaseReason;
    now?: number;
}): ReleaseOutcome {
    if (!RELEASE_REASONS.includes(params.reason)) {
        throw new Error(`cost-ledger: motivo de liberação não documentado: ${params.reason}`);
    }
    const filePath = reservationPath(params.ledgerDir, params.operationKey);
    return withLedgerLock(params.ledgerDir, () => {
        const parsed = readRecord(params.ledgerDir, filePath);
        if (parsed.kind === 'missing') return { kind: 'unknown_key' };
        if (parsed.kind === 'corrupt') return { kind: 'conflict', state: 'CORRUPT' };
        if (parsed.record.state === 'RELEASED') return { kind: 'already_released' };
        if (parsed.record.state === 'CHARGED') return { kind: 'charged_cannot_release' };
        writeRecordAtomic(filePath, {
            ...parsed.record,
            state: 'RELEASED',
            releaseReason: params.reason,
            updatedAt: new Date(params.now ?? Date.now()).toISOString(),
        });
        return { kind: 'released' };
    });
}

// Registros RELEASED nunca são apagados: são a memória de idempotência da chave.
export function readBudgetSummary(ledgerDir: string, capMicros: number): BudgetSummary {
    const scan = existsSync(ledgerDir) ? scanLedger(ledgerDir) : { reservedMicros: 0, chargedMicros: 0, corrupt: [] };
    const committed = scan.reservedMicros + scan.chargedMicros;
    return {
        capMicros,
        reservedMicros: scan.reservedMicros,
        chargedMicros: scan.chargedMicros,
        remainingMicros: scan.corrupt.length ? 0 : Math.max(0, capMicros - committed),
        corruptEntries: scan.corrupt,
    };
}

// Teto dos testes iniciais: US$30 acumulados por padrão (decisão do Felipe,
// 08/11/2026). O ambiente só pode reduzir; acima de US$30 ou inválido é erro.
export function budgetCapMicrosFromEnv(env: Record<string, string | undefined> = process.env): number {
    const raw = (env.HIGGSFIELD_INITIAL_TEST_CAP_USD ?? '').trim();
    if (raw === '') return MAX_INITIAL_TEST_CAP_MICROS;
    const micros = parseUsdToMicros(raw);
    if (micros === null || micros <= 0) {
        throw new Error(`HIGGSFIELD_INITIAL_TEST_CAP_USD inválido: "${raw.slice(0, 64)}" (use USD decimal, ex.: 30 ou 25.00)`);
    }
    if (micros > MAX_INITIAL_TEST_CAP_MICROS) {
        throw new Error(`HIGGSFIELD_INITIAL_TEST_CAP_USD=${raw.slice(0, 64)} excede o teto autorizado de US$30 — só é permitido reduzir`);
    }
    return micros;
}
