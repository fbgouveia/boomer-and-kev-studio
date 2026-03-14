import { NextResponse } from 'next/server';
import Replicate from "replicate";
import { renderSchema } from '@/lib/validations';

// NEUROMARKETING_PRODUCTION_PIPELINE_V2
// Integration: Official Replicate SDK / Kling-v2.6

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const resolveGDriveLink = (url: string | undefined) => {
  if (!url) return undefined;
  const cleanUrl = url.trim();
  if (cleanUrl.includes('drive.google.com')) {
    const gMatch = cleanUrl.match(/\/d\/(.+?)(?:\/|$|\?)/) || cleanUrl.match(/id=(.+?)(?:&|$|#)/);
    const fileId = gMatch ? gMatch[1] : null;
    if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return cleanUrl;
};

// Helper: Resolve G-Drive Link and inject into prompt if it's a studio reference
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const validation = renderSchema.safeParse(rawBody);

    if (!validation.success) {
      console.warn("RENDER_VALIDATION_FAILURE:", JSON.stringify(validation.error.format(), null, 2));
      return NextResponse.json({
        error: "INVALID_INPUT_SIGNAL",
        details: validation.error.format()
      }, { status: 400 });
    }

    const { script } = validation.data;

    if (!process.env.REPLICATE_API_TOKEN) {
      console.warn("PRODUCTION_HALTED: Missing REPLICATE_API_TOKEN. Switching to SANDBOX_SIMULATION_MODE.");
    }

    const results = await Promise.all(script.map(async (line: { technicalPrompt: string, durationEst: number, id: string, characterReference?: string, studioReference?: string }) => {
      const prompt = line.technicalPrompt;
      const charImage = resolveGDriveLink(line.characterReference);
      const studioImage = resolveGDriveLink(line.studioReference);

      if (process.env.REPLICATE_API_TOKEN) {
        try {
          const prediction = await replicate.predictions.create({
            model: "kwaivgi/kling-v2.6",
            input: {
              prompt: prompt,
              duration: line.durationEst <= 5 ? 5 : 10, // Kling supports 5 or 10s
              aspect_ratio: "9:16",
              start_image: charImage || studioImage,
              generate_audio: false // We use ElevenLabs for audio
            }
          });

          return {
            sceneId: line.id,
            status: prediction.status?.toUpperCase() || "QUEUED",
            predictionId: prediction.id,
            message: "Handshake Successful. Scene active on Replicate Network.",
            raw: prediction
          };
        } catch (err) {
          console.error("SCENE_HANDSHAKE_ERROR:", err);
          return {
            sceneId: line.id,
            status: "FAILED",
            message: "Production Signal Failure."
          };
        }
      }

      // SANDBOX_MODE: Simulated Handshake
      return {
        sceneId: line.id,
        status: "QUEUED",
        predictionId: `rep_${Math.random().toString(36).substr(2, 9)}`,
        message: "Handshake Successful. Scene queued for Neuromorphic Synthesis (SANDBOX)."
      };
    }));

    return NextResponse.json({
      status: "PRODUCTION_ACTIVE",
      mode: process.env.REPLICATE_API_TOKEN ? "REAL" : "SANDBOX",
      total_scenes: script.length,
      pipeline: "KLING_V2.6_SDK",
      results
    });

  } catch (error) {
    console.error("PIPELINE_CRASH:", error);
    return NextResponse.json({ error: "PIPELINE_CRASH: Internal Engine Error" }, { status: 500 });
  }
}
