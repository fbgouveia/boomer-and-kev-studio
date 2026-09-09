import crypto from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { RunPipelineInput } from '@/lib/validations';

// BK-05/BK-16 — contrato de retomada:
// 1. Resume com roteiro/voz/aspecto/referências alterados => conflito explícito,
//    nunca mistura de cache antigo (hash da configuração imutável).
// 2. Um job ativo tem um único executor autorizado (lease com TTL em disco).
// 3. Perder conexão do painel não é falha do worker (o lease vence por tempo,
//    não por ausência de consulta).

export const LEASE_TTL_MS = 10 * 60_000;

export type JobLease = {
    workerInstanceId: string;
    acquiredAt: string;
    updatedAt: string;
};

export type ResumeDecision =
    | { action: 'takeover' }
    | { action: 'conflict'; code: 'RESUME_CONFIG_CONFLICT' | 'RESUME_ACTIVE_WORKER' };

// Configuração imutável do job: mudou => artefatos antigos não são válidos para a
// retomada (texto, personagem, voz, referências, figurino, formato e parâmetros).
export function immutablePipelineConfig(data: Omit<RunPipelineInput, 'approval' | 'resumeJobId'>) {
    return {
        engine: data.engine,
        aspect: data.aspect,
        voiceMode: data.voiceMode,
        directorIdea: data.directorIdea ?? '',
        directorSnippet: data.directorSnippet ?? '',
        wardrobe: data.wardrobe ?? {},
        voiceIds: data.voiceIds ?? {},
        script: data.script,
    };
}

export function pipelineConfigHash(data: Omit<RunPipelineInput, 'approval' | 'resumeJobId'>): string {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(immutablePipelineConfig(data)))
        .digest('hex');
}

// Retomada de job com status PROCESSING (após reconciliação WORKER_RESTARTED ou
// falha). Ordem: conflito de conteúdo primeiro (decisivo e barato), depois
// exclusividade de executor no mesmo processo. O lease em disco decide o caso
// entre processos.
export function evaluateResume(
    existingData: { configHash?: string },
    incoming: { configHash: string },
    opts: { isRunActive: boolean },
): ResumeDecision {
    if (existingData.configHash && existingData.configHash !== incoming.configHash) {
        return { action: 'conflict', code: 'RESUME_CONFIG_CONFLICT' };
    }
    if (opts.isRunActive) {
        return { action: 'conflict', code: 'RESUME_ACTIVE_WORKER' };
    }
    return { action: 'takeover' };
}

export function resumeLeasePath(storageDir: string, jobId: string): string {
    return path.join(storageDir, `lease_${jobId}.json`);
}

// Exclusividade via arquivo com flag 'wx': de dois resumes simultâneos, exatamente
// um cria o lease. Lease vencido (worker morto) é renomeado atomicamente — o
// perdedor da corrida recebe ENOENT e recebe conflito claro em vez de duplicar worker.
export function acquireResumeLease(
    storageDir: string,
    jobId: string,
    workerInstanceId: string,
    nowMs = Date.now(),
): { acquired: boolean } {
    const leasePath = resumeLeasePath(storageDir, jobId);
    const now = new Date(nowMs).toISOString();
    const freshLease = { workerInstanceId, acquiredAt: now, updatedAt: now };

    try {
        writeFileSync(leasePath, JSON.stringify(freshLease), { flag: 'wx' });
        return { acquired: true };
    } catch (error) {
        const fileError = error as NodeJS.ErrnoException;
        if (fileError.code !== 'EEXIST') throw error;
    }

    const existing: JobLease = JSON.parse(readFileSync(leasePath, 'utf8'));
    const leaseFresh = nowMs - Date.parse(existing.updatedAt) < LEASE_TTL_MS;
    const otherWorkerAlive = leaseFresh && existing.workerInstanceId !== workerInstanceId;
    if (otherWorkerAlive) return { acquired: false };

    const parkedPath = `${leasePath}.stale.${process.pid}.${crypto.randomUUID()}`;
    try {
        renameSync(leasePath, parkedPath);
    } catch (error) {
        const renameError = error as NodeJS.ErrnoException;
        // Outro resume venceu a corrida e estacionou o lease — ele é o dono.
        if (renameError.code === 'ENOENT') return { acquired: false };
        throw error;
    }

    try {
        writeFileSync(leasePath, JSON.stringify(freshLease), { flag: 'wx' });
        return { acquired: true };
    } catch (error) {
        const writeError = error as NodeJS.ErrnoException;
        if (writeError.code === 'EEXIST') return { acquired: false };
        throw error;
    }
}

// Best-effort: chamado no finally do worker e na reconciliação WORKER_RESTARTED
// (que acabou de provar que o dono do lease morreu).
export function releaseResumeLease(storageDir: string, jobId: string): boolean {
    try {
        renameSync(resumeLeasePath(storageDir, jobId), `${resumeLeasePath(storageDir, jobId)}.released.${Date.now()}`);
        return true;
    } catch {
        return false;
    }
}

export function refreshResumeLease(storageDir: string, jobId: string, workerInstanceId: string, nowMs = Date.now()): void {
    try {
        const leasePath = resumeLeasePath(storageDir, jobId);
        const lease = JSON.parse(readFileSync(leasePath, 'utf8')) as JobLease;
        if (lease.workerInstanceId !== workerInstanceId) return;
        lease.updatedAt = new Date(nowMs).toISOString();
        writeFileSync(leasePath, JSON.stringify(lease));
    } catch {
        // Heartbeat é otimista; a exclusividade real é o acquire atômico.
    }
}
