import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWithRetry } from '@/lib/fetch-retry';

// Cliente único das rotas Gemini (brainstorm, compliance, interview, mitigation).
// Antes cada rota raspava JSON da resposta com regex e devolvia 500 para tudo;
// aqui o modelo responde em JSON nativo e a saída é validada por schema.

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

export class GeminiError extends Error {
    constructor(message: string, readonly status: number, readonly retryAfter?: number) {
        super(message);
    }
}

export function geminiApiKey(clientKey: unknown): string | undefined {
    if (typeof clientKey === 'string' && clientKey.trim()) return clientKey.trim();
    return process.env.GEMINI_API_KEY || undefined;
}

/** Remove cercas ```json que alguns modelos ainda devolvem mesmo em modo JSON. */
export function stripJsonFence(text: string): string {
    const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return fenced ? fenced[1] : text.trim();
}

export async function geminiJson<T>(opts: {
    apiKey: string;
    prompt: string;
    schema: z.ZodType<T>;
    model?: string;
}): Promise<T> {
    const model = opts.model ?? GEMINI_TEXT_MODEL;
    const { response, retryAfter } = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: 'POST',
            // Chave no header, não na URL: URL acaba em log de proxy/APM.
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
            body: JSON.stringify({
                contents: [{ parts: [{ text: opts.prompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
            }),
        },
    );

    const data = await response.json().catch(() => null);
    if (response.status === 429) {
        throw new GeminiError('Gemini quota exceeded', 429, retryAfter ?? 30);
    }
    if (!response.ok || data?.error) {
        throw new GeminiError(data?.error?.message || `Gemini HTTP ${response.status}`, 502);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || !text.trim()) {
        const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'empty';
        throw new GeminiError(`Gemini returned no content (${reason})`, 502);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(stripJsonFence(text));
    } catch {
        throw new GeminiError('Gemini returned invalid JSON', 502);
    }
    const result = opts.schema.safeParse(parsed);
    if (!result.success) {
        throw new GeminiError(`Gemini output failed schema: ${result.error.issues[0]?.path.join('.')} ${result.error.issues[0]?.message}`, 502);
    }
    return result.data;
}

/** Resposta HTTP padronizada para erros das rotas Gemini. */
export function geminiErrorResponse(error: unknown, label: string) {
    if (error instanceof GeminiError) {
        console.error(`${label}:`, error.message);
        return NextResponse.json(
            { error: error.message, ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) },
            { status: error.status, ...(error.retryAfter ? { headers: { 'Retry-After': String(error.retryAfter) } } : {}) },
        );
    }
    console.error(`${label}:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
}

export const missingGeminiKey = () =>
    NextResponse.json({ error: 'Missing Gemini API Key (GEMINI_API_KEY)' }, { status: 503 });

export const invalidInput = (error: z.ZodError) =>
    NextResponse.json({ error: 'INVALID_INPUT', details: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 });
