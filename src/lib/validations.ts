import { z } from 'zod';

export const renderSchema = z.object({
    script: z.array(z.object({
        id: z.string(),
        characterId: z.string(),
        text: z.string().min(1),
        shotType: z.string(),
        durationEst: z.number(),
        technicalPrompt: z.string(),
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
    })),
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
        replicate: z.string().optional(),
        elevenlabs: z.string().optional(),
        higgsfield: z.string().optional(),
    }).optional(),
    engine: z.enum(['kling', 'higgsfield']).optional().default('kling'),
});

export const voiceSchema = z.object({
    text: z.string().min(1),
    characterId: z.string(),
    apiKey: z.string().optional(),
});

export const balanceSchema = z.object({
    replicate: z.string().optional(),
    elevenlabs: z.string().optional(),
});

export type RenderInput = z.infer<typeof renderSchema>;
export type BalanceInput = z.infer<typeof balanceSchema>;
export type VoiceInput = z.infer<typeof voiceSchema>;
