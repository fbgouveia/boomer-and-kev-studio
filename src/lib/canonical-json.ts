// Serialização canônica (chaves ordenadas) para hashes estáveis.
// JSON.stringify comum depende da ordem de inserção; retomadas precisam do MESMO
// hash para o mesmo conteúdo (payload/idempotência), mesmo após round-trip em disco.
export function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
        return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${canonicalJson(val)}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}
