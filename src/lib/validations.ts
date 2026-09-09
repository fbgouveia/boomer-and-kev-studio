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

export const renderSchema = z.object({
    script: z.array(z.object({
        id: z.string().trim().min(1).max(128),
        characterId: characterIdSchema,
        text: z.string().trim().min(1).max(5000),
        shotType: shotTypeSchema,
        durationEst: z.number().finite().positive().max(10),
        technicalPrompt: z.string().trim().min(1).max(20_000),
        characterReference: z.string().optional(),
        studioReference: z.string().optional(),
        emotion: z.string().optional(),
        action: z.string().optional(),
        cameraPreset: z.string().optional(),
        motionWeight: z.number().optional(),
        soulId: z.string().optional(),
        motionRefUrl: z.string().optional(),
        visualPrompt: z.string().optional(),
        cameraMovement: z.string().optional(),
        compositionNotes: z.string().optional(),
        storyboardSketch: z.string().optional(),
    })).min(1).max(32),
    studioDNA: z.object({
        name: z.string(),
        visualDescription: z.string(),
        acousticPanels: z.string(),
        sponsorScreens: z.string(),
        props: z.array(z.string()),
        lighting: z.string(),
        ambience: z.string(),
        promptContext: z.string(),
    }).optional(),
    apiKeys: z.object({
        replicate: optionalApiKey,
        elevenlabs: optionalApiKey,
        higgsfield: optionalApiKey,
    }).optional(),
    engine: z.enum(['kling', 'higgsfield']).optional().default('kling'),
});

export const voiceSchema = z.object({
    text: z.string().trim().min(1).max(5000),
    characterId: characterIdSchema,
    apiKey: optionalApiKey,
});

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
    resumeJobId: z.string().uuid().optional(),
    wardrobe: z.object({
        boomer: z.string().max(5_000).optional(),
        kev: z.string().max(5_000).optional(),
        studio: z.string().max(5_000).optional(),
    }).optional(),
    // BK-16: voiceIds editados na Engine DNA entram no payload e na execução
    // (antes: descartados, o run usava CHARACTERS estático).
    voiceIds: z.object({
        boomer: voiceIdSchema,
        kev: voiceIdSchema,
    }).optional(),
    approval: z.object({
        confirmed: z.literal(true),
        source: z.enum(['studio_ui', 'n8n_manual']),
        approvedAt: z.string().datetime(),
    }).optional(),
});

export type RunPipelineInput = z.infer<typeof runPipelineSchema>;
export type RenderInput = z.infer<typeof renderSchema>;
export type BalanceInput = z.infer<typeof balanceSchema>;
export type VoiceInput = z.infer<typeof voiceSchema>;
