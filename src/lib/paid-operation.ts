import crypto from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const APPROVAL_MAX_AGE_MS = 10 * 60_000;
const RECORD_RETENTION_MS = 7 * 24 * 60 * 60_000;
const MAX_OPERATION_RECORDS = 1_000;

export const paidApprovalSchema = z.object({
    confirmed: z.literal(true),
    source: z.enum(['studio_ui', 'n8n_manual', 'operator_cli']),
    approvedAt: z.iso.datetime(),
});

const idempotencyKeySchema = z.string()
    .min(16)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/);

type StoredResponse = {
    status: number;
    body: unknown;
};

type OperationRecord = {
    scope: string;
    payloadHash: string;
    status: 'RESERVED' | 'COMPLETED';
    createdAt: string;
    response?: StoredResponse;
};

export type PaidOperationReservation = {
    filePath: string;
    record: OperationRecord;
};

export type PaidOperationResult =
    | { kind: 'reserved'; reservation: PaidOperationReservation }
    | { kind: 'replay'; response: StoredResponse }
    | { kind: 'error'; status: number; body: { error: string; details?: string } };

function writeJsonAtomic(filePath: string, value: unknown) {
    const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    writeFileSync(tempPath, JSON.stringify(value, null, 2));
    renameSync(tempPath, filePath);
}

function maintainOperationStore(storageDir: string, now: number) {
    const records = readdirSync(storageDir)
        .filter(filename => filename.startsWith('paid_') && filename.endsWith('.json'))
        .map(filename => {
            const filePath = path.join(storageDir, filename);
            try {
                const record = JSON.parse(readFileSync(filePath, 'utf8')) as OperationRecord;
                return { filePath, record, createdAt: Date.parse(record.createdAt) };
            } catch {
                return null;
            }
        })
        .filter(record => record !== null);

    for (const entry of records) {
        if (Number.isFinite(entry.createdAt) && now - entry.createdAt > RECORD_RETENTION_MS) {
            unlinkSync(entry.filePath);
        }
    }

    const remaining = records
        .filter(entry => existsSync(entry.filePath))
        .sort((left, right) => left.createdAt - right.createdAt);
    let remainingCount = remaining.length;
    for (const entry of remaining) {
        if (remainingCount < MAX_OPERATION_RECORDS) break;
        if (entry.record.status === 'COMPLETED') {
            unlinkSync(entry.filePath);
            remainingCount -= 1;
        }
    }

    return remainingCount;
}

export function beginPaidOperation({
    scope,
    idempotencyKey,
    approval,
    payload,
    storageDir = path.resolve(process.cwd(), '.tmp'),
    now = Date.now(),
}: {
    scope: string;
    idempotencyKey: string | null;
    approval: unknown;
    payload: unknown;
    storageDir?: string;
    now?: number;
}): PaidOperationResult {
    const keyValidation = idempotencyKeySchema.safeParse(idempotencyKey);
    if (!keyValidation.success) {
        return {
            kind: 'error',
            status: 400,
            body: {
                error: 'IDEMPOTENCY_KEY_REQUIRED',
                details: 'Envie Idempotency-Key com 16-128 caracteres seguros.',
            },
        };
    }

    if (!/^[a-z0-9-]+$/.test(scope)) {
        throw new Error(`Invalid paid operation scope: ${scope}`);
    }

    mkdirSync(storageDir, { recursive: true });
    const keyHash = crypto.createHash('sha256').update(keyValidation.data).digest('hex');
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const filePath = path.resolve(storageDir, `paid_${scope}_${keyHash}.json`);

    if (existsSync(filePath)) {
        const existing = JSON.parse(readFileSync(filePath, 'utf8')) as OperationRecord;
        if (existing.scope !== scope || existing.payloadHash !== payloadHash) {
            return { kind: 'error', status: 409, body: { error: 'IDEMPOTENCY_CONFLICT' } };
        }
        if (existing.status === 'COMPLETED' && existing.response) {
            return { kind: 'replay', response: existing.response };
        }
        return {
            kind: 'error',
            status: 409,
            body: {
                error: 'IDEMPOTENCY_IN_PROGRESS',
                details: 'A operação anterior pode ter alcançado o provedor; confirme seu estado antes de tentar novamente.',
            },
        };
    }

    if (maintainOperationStore(storageDir, now) >= MAX_OPERATION_RECORDS) {
        return {
            kind: 'error',
            status: 503,
            body: {
                error: 'PAID_OPERATION_STORE_FULL',
                details: 'Há operações incertas demais para reservar outra com segurança.',
            },
        };
    }

    const approvalValidation = paidApprovalSchema.safeParse(approval);
    if (!approvalValidation.success) {
        return { kind: 'error', status: 403, body: { error: 'PAID_OPERATION_APPROVAL_REQUIRED' } };
    }

    const approvalAgeMs = now - Date.parse(approvalValidation.data.approvedAt);
    if (approvalAgeMs < -60_000 || approvalAgeMs > APPROVAL_MAX_AGE_MS) {
        return { kind: 'error', status: 403, body: { error: 'PAID_OPERATION_APPROVAL_EXPIRED' } };
    }

    const record: OperationRecord = {
        scope,
        payloadHash,
        status: 'RESERVED',
        createdAt: new Date(now).toISOString(),
    };

    try {
        writeFileSync(filePath, JSON.stringify(record, null, 2), { flag: 'wx' });
    } catch (error) {
        const fileError = error as NodeJS.ErrnoException;
        if (fileError.code !== 'EEXIST') throw error;
        return beginPaidOperation({ scope, idempotencyKey, approval, payload, storageDir, now });
    }

    return { kind: 'reserved', reservation: { filePath, record } };
}

export function completePaidOperation(
    reservation: PaidOperationReservation,
    response: StoredResponse,
) {
    writeJsonAtomic(reservation.filePath, {
        ...reservation.record,
        status: 'COMPLETED',
        response,
    } satisfies OperationRecord);
}
