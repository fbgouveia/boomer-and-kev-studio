import { NextResponse } from 'next/server';
import Replicate from "replicate";

// NEUROMARKETING_POLLING_ENGINE_V2
// Integration: Official Replicate SDK / Prediction Status

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const predictionId = searchParams.get('id');

        if (!predictionId) {
            return NextResponse.json({ error: "Missing Prediction ID" }, { status: 400 });
        }

        if (!process.env.REPLICATE_API_TOKEN || predictionId.startsWith('rep_')) {
            // Sandbox Polling Logic
            return NextResponse.json({
                id: predictionId,
                status: "succeeded",
                output: ["https://replicate.delivery/pbxt/example/video.mp4"]
            });
        }

        // Using Official Replicate SDK to fetch prediction status
        const prediction = await replicate.predictions.get(predictionId);

        return NextResponse.json(prediction);

    } catch (error) {
        console.error("POLLING_CRASH:", error);
        return NextResponse.json({ error: "POLLING_CRASH: Internal Engine Error" }, { status: 500 });
    }
}
