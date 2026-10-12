import { z } from 'zod';
import { isRegisteredCharacter } from '@/lib/cast-registry';

// BK-19: personagem válido = pack registrado no cast registry (boomer/kev hoje,
// novos elencos sem editar engine). O regex bloqueia lixo antes da consulta.
const characterIdSchema = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .refine((id) => isRegisteredCharacter(id), { message: 'Unknown character pack.' });
const shotTypeSchema = z.enum([
    'WIDE',
    'BOOMER_MCU',
    'KEV_CU',
    'OTS_BOOMER',
    'LOW_ANGLE_BOOMER',
    'GOPRO_FISHEYE',
]);
const optionalApiKey = z.string().trim().min(1).max(512).optional();

export const balanceSchema = z.object({
    replicate: optionalApiKey,
    elevenlabs: optionalApiKey,
});

// BK-16: referências enviadas pela interface (Engine DNA / guias) deixam de ser
// descartadas silenciosamente. Podem ser path local, URL remota ou data URI (upload).
const referenceImageSchema = z
    .string()
    .max(8_000_000)
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined));

// String vazia (campo limpo na UI) vira undefined em vez de rejeitar o payload.
const voiceIdSchema = z.string().trim().max(256).optional()
    .transform((v) => (v && v.trim() ? v : undefined));

export const runPipelineSchema = z.object({
    script: z.array(z.object({
        id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/),
        characterId: characterIdSchema,
        text: z.string().trim().min(1).max(5_000),
        shotType: shotTypeSchema,
        action: z.string().trim().min(1).max(2_000),
        emotion: z.string().trim().min(1).max(128),
        durationEst: z.number().finite().positive().max(10),
        characterReference: referenceImageSchema,
        studioReference: referenceImageSchema,
    })).min(1).max(32)
        // BK-16: IDs de cena repetidos aceitos permitiam colisão de artefatos por
        // job/cena — rejeição antes de qualquer chamada a provedor.
        .refine((script) => new Set(script.map((s) => s.id)).size === script.length, {
            message: 'Scene IDs must be unique within a script.',
        }),
    directorIdea: z.string().max(20_000).optional(),
    directorSnippet: z.string().max(20_000).optional(),
    engine: z.literal('kling').optional().default('kling'),
    aspect: z.enum(['9:16', '16:9']).optional().default('9:16'),
    // BK-18 (régua vocal, veredito Felipe 09/09): áudio NATIVO do Kling venceu
    // (S13/S14) — fala literal no prompt, sem sobreposição de TTS. 'elevenlabs'
    // preserva a rota antiga para comparação/regressão.
    voiceMode: z.enum(['kling_native', 'elevenlabs']).optional().default('kling_native'),
    resumeJobId: z.string().uuid().optional(),
    wardrobe: z.object({
        boomer: z.string().max(5_000).optional(),
        kev: z.string().max(5_000).optional(),
        studio: z.string().max(5_000).optional(),
    }).optional(),
    // BK-19 inc.2: voiceIds por pack do registry (chave = id de pack, forma de
    // registro aberta — a UI envia o registro completo da Engine DNA).
    voiceIds: z.record(
        z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
        voiceIdSchema,
    ).optional(),
    approval: z.object({
        confirmed: z.literal(true),
        source: z.enum(['studio_ui', 'n8n_manual']),
        approvedAt: z.string().datetime(),
    }).optional(),
});

export type RunPipelineInput = z.infer<typeof runPipelineSchema>;
export type BalanceInput = z.infer<typeof balanceSchema>;
