// Dinheiro em micros USD (inteiro): comparação exata, sem aritmética flutuante.
// O contrato Higgsfield envia usd como string decimal ("0.714"); reservas e teto
// comparam inteiros (1 USD = 1.000.000 micros). Fração abaixo de 1 micro é
// arredondada PARA CIMA: reservar a menos nunca é aceitável.

export const MICRO_PER_USD = 1_000_000;

function decimalStringToMicros(text: string): number | null {
    // Somente dígitos decimais puros — sem expoente, vírgula, sinal ou símbolo.
    const match = /^(\d+)(?:\.(\d*))?$/.exec(text);
    if (!match) return null;
    const frac = match[2] ?? '';
    const roundUp = /[1-9]/.test(frac.slice(6)) ? BigInt(1) : BigInt(0);
    // BigInt via função (tsconfig target < ES2020 proíbe literais bigint).
    const micros = BigInt(match[1]) * BigInt(MICRO_PER_USD) + BigInt(frac.padEnd(6, '0').slice(0, 6)) + roundUp;
    if (micros > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(micros);
}

// Converte usd (string ou número) em micros inteiros. null = formato inválido —
// chamadores NUNCA adevinham preço a partir de valor não parseável.
export function parseUsdToMicros(value: unknown): number | null {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        // String(n) é a representação decimal mais curta (sem perder dígitos além
        // da 6ª casa, que arredondam para cima); notação exponencial vira null.
        return decimalStringToMicros(String(value));
    }
    if (typeof value !== 'string') return null;
    return decimalStringToMicros(value.trim());
}

// Formatação para logs/estado: $0.714 (3 casas quando exato, 6 quando há resto).
export function formatUsd(micros: number): string {
    if (!Number.isFinite(micros)) return '$?';
    const sign = micros < 0 ? '-' : '';
    const abs = Math.abs(Math.round(micros));
    const decimals = abs % 1_000 === 0 ? 3 : 6;
    return `${sign}$${(abs / MICRO_PER_USD).toFixed(decimals)}`;
}
