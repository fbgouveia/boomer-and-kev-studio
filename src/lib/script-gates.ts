// Travas determinísticas do roteiro (antes inline em /api/ai/script).
// Rejeição de gate = roteiro inválido (422), não erro de servidor: o cliente regenera.

export const MAX_RUNTIME_S = 90;

export class ScriptGateError extends Error {
    constructor(readonly gate: 'SCRIPT_BALANCE' | 'SCRIPT_RUNTIME' | 'SCRIPT_LOOP' | 'SCRIPT_SHAPE', message: string) {
        super(`${gate}: ${message}`);
    }
}

type Line = { characterId: string; durationEst?: number };

/** BALANCE_GATE (WP 1.5): duo virou monólogo = roteiro reprovado (episódio 5x1 de 19/07). */
export function assertBalanced(lines: Line[], cast: readonly string[] = ['boomer', 'kev']) {
    if (lines.length === 0) throw new ScriptGateError('SCRIPT_SHAPE', 'roteiro sem cenas.');
    const count: Record<string, number> = {};
    for (const l of lines) count[l.characterId] = (count[l.characterId] || 0) + 1;
    const minimum = lines.length >= 8 ? 3 : 2;
    for (const c of cast) {
        if ((count[c] || 0) < minimum) {
            throw new ScriptGateError('SCRIPT_BALANCE', `'${c}' tem ${count[c] || 0} cenas de ${lines.length} (mínimo ${minimum}).`);
        }
    }
}

/** RUNTIME_GATE: número de cenas é livre (decisão 07/08); a duração não. */
export function assertRuntime(lines: Line[], max = MAX_RUNTIME_S) {
    const runtime = lines.reduce((a, l) => a + (l.durationEst || 0), 0);
    if (runtime > max) {
        throw new ScriptGateError('SCRIPT_RUNTIME', `${runtime}s em ${lines.length} cenas (máximo ${max}s).`);
    }
    return runtime;
}

export type LoopVerdict = { verdict: 'PASS' | 'FAIL'; reason: string };

/**
 * LOOP_GATE: o juiz responde em JSON estruturado. Saída fora do contrato =
 * UNJUDGED (falha aberta com aviso: juiz indisponível não incinera roteiro aprovável).
 */
export function decideLoop(raw: unknown): 'PASS' | 'FAIL' | 'UNJUDGED' {
    if (!raw || typeof raw !== 'object') return 'UNJUDGED';
    const v = (raw as Partial<LoopVerdict>).verdict;
    return v === 'PASS' || v === 'FAIL' ? v : 'UNJUDGED';
}
