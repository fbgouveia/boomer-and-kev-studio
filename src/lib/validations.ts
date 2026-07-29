import { z } from 'zod';

const characterIdSchema = z.enum(['boomer', 'kev']);
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

export type RenderInput = z.infer<typeof renderSchema>;
export type BalanceInput = z.infer<typeof balanceSchema>;
export type VoiceInput = z.infer<typeof voiceSchema>;
