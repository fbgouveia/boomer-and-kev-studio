// Estado do job em disco: gravação atômica + mescla imutável de updates.
// Extraído do worker p/ tornar a persistência CRÍTICA testável: chamadas antes/
// depois de submissão paga PRECISAM propagar falha de gravação (nunca fingir
// checkpoint gravado e lançar geração paga sem ele).

import { existsSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export type JobFileData = Record<string, unknown>;

// Temporário único + rename: leitores veem o arquivo completo ou o anterior.
export function writeJsonAtomic(filePath: string, value: unknown): void {
    const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
        writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { flag: 'wx' });
        renameSync(temporaryPath, filePath);
    } catch (error) {
        if (existsSync(temporaryPath)) {
            try { unlinkSync(temporaryPath); } catch { /* best effort */ }
        }
        throw error;
    }
}

// Mescla updates no estado atual sem mutar nada: campos sobrescritos + logs anexados.
export function mergeJobUpdate(current: JobFileData, updates: JobFileData): JobFileData {
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
        if (key !== 'logs') rest[key] = value;
    }
    const currentLogs = Array.isArray(current.logs) ? current.logs : [];
    const incomingLogs = Array.isArray(updates.logs) ? updates.logs : [];
    return {
        ...current,
        ...rest,
        updatedAt: new Date().toISOString(),
        logs: [...currentLogs, ...incomingLogs],
    };
}
