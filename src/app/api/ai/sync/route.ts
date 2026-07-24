import { NextResponse } from 'next/server';
import Replicate from "replicate";
import { z } from 'zod';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const syncSchema = z.object({
    videoUrl: z.string().url(),
    audioUrl: z.string().min(1), // Can be a URL or a Data URI
    sceneId: z.string()
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = syncSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'INVALID_SYNC_SIGNAL', details: validation.error.format() }, { status: 400 });
        }

        const { videoUrl, audioUrl, sceneId } = validation.data;

        if (!process.env.REPLICATE_API_TOKEN) {
            return NextResponse.json({
                mode: 'SANDBOX',
                predictionId: `sync_${Math.random().toString(36).substr(2, 9)}`,
                message: 'SANDBOX_SYNC_TRIGGERED'
            });
        }

        // Using lucataco/wav2lip or similar reliable lipsync model
        // Note: If audioUrl is a Data URI, Replicate supports it for short clips
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boomer-kev-studio.vercel.app';
        const prediction = await replicate.predictions.create({
            // ponytail: modelo community exige version hash — endpoint por nome (model:) dá 404
            version: "8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef",
            input: {
                face: videoUrl,
                audio: audioUrl,
                pads: "0 10 0 0",
                smooth: true,
                fps: 30
            },
            webhook: `${siteUrl}/api/ai/callback`,
            webhook_events_filter: ['completed']
        });

        return NextResponse.json({
            mode: 'REAL',
            predictionId: prediction.id,
            status: prediction.status,
            sceneId
        });

    } catch (error) {
        console.error("LIPSYNC_ENGINE_CRASH:", error);
        return NextResponse.json({ error: 'INTERNAL_SYNC_ERROR' }, { status: 500 });
    }
}
