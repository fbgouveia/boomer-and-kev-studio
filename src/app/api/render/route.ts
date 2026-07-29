import { NextResponse } from 'next/server';
import Replicate from "replicate";
import { renderSchema } from '@/lib/validations';
import { higgsfield, config as hfConfig } from '@higgsfield/client/v2';
import { expandToCinematicPrompt } from '@/lib/cinematic-orchestrator';
import {
  beginPaidOperation,
  completePaidOperation,
  type PaidOperationReservation,
} from '@/lib/paid-operation';

// NEUROMARKETING_PRODUCTION_PIPELINE_V3
// Integration: Replicate SDK (Kling-v2.6) & Higgsfield SDK (Kling-v3 / Seedance)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const resolveAssetUrl = (url: string | undefined, origin: string) => {
  if (!url) return undefined;
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('/')) {
    // [HOTFIX] Se estiver rodando localmente (ou no container n8n_default),
    // a Replicate não consegue ler 'http://localhost:3000/assets/...'.
    // Redirecionamos para o branch no Github para a API conseguir baixar a imagem start_image.
    if (origin.includes('localhost') || origin.includes('boomer_kev')) {
      return `https://raw.githubusercontent.com/fbgouveia/boomer-and-kev-studio/restore-engine/public${cleanUrl}`;
    }
    return `${origin}${cleanUrl}`;
  }
  if (cleanUrl.includes('drive.google.com')) {
    const gMatch = cleanUrl.match(/\/d\/(.+?)(?:\/|$|\?)/) || cleanUrl.match(/id=(.+?)(?:&|$|#)/);
    const fileId = gMatch ? gMatch[1] : null;
    if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return cleanUrl;
};

export async function POST(req: Request) {
  let paidReservation: PaidOperationReservation | undefined;
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

    const paidOperation = beginPaidOperation({
      scope: 'render',
      idempotencyKey: req.headers.get('idempotency-key'),
      approval: rawBody.approval,
      payload: rawBody,
    });
    if (paidOperation.kind === 'error') {
      return NextResponse.json(paidOperation.body, { status: paidOperation.status });
    }
    if (paidOperation.kind === 'replay') {
      return NextResponse.json(paidOperation.response.body, {
        status: paidOperation.response.status,
        headers: { 'Idempotent-Replay': 'true' },
      });
    }
    paidReservation = paidOperation.reservation;

    const { script, engine = 'kling', apiKeys } = validation.data;

    const replicateToken = apiKeys?.replicate || process.env.REPLICATE_API_TOKEN;
    const hfApiKey = apiKeys?.higgsfield || process.env.HF_CREDENTIALS;

    if (engine === 'kling' && !replicateToken) {
      console.warn("PRODUCTION_HALTED: Missing REPLICATE_API_TOKEN. Switching to SANDBOX_SIMULATION_MODE.");
    }
    if (engine === 'higgsfield' && !hfApiKey) {
      console.warn("PRODUCTION_HALTED: Missing HF_CREDENTIALS. Switching to SANDBOX_SIMULATION_MODE.");
    }

    // Configure Higgsfield global instance if credentials are provided
    if (engine === 'higgsfield' && hfApiKey) {
      hfConfig({ credentials: hfApiKey });
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://boomer-kev-studio.vercel.app';

    const results = await Promise.all(script.map(async (line) => {
      const prompt = expandToCinematicPrompt(line, line.technicalPrompt);
      const charImage = resolveAssetUrl(line.characterReference, origin);
      const studioImage = resolveAssetUrl(line.studioReference, origin);

      // --- ENGINE: HIGGSFIELD ---
      if (engine === 'higgsfield') {
        if (hfApiKey) {
          try {
            // Using Higgsfield Kling/Seedance model mappings
            const model = charImage || studioImage || line.motionRefUrl ? 'kling-3.0/image-to-video' : 'kling-3.0/text-to-video';
            const jobSet = await higgsfield.subscribe(model, {
              input: {
                prompt: prompt + (line.cameraPreset ? `, camera movement: ${line.cameraPreset}` : ''),
                aspect_ratio: "9:16",
                image: charImage || studioImage || line.motionRefUrl,
                duration: line.durationEst <= 5 ? 5 : 10,
                motion_weight: line.motionWeight,
                soul_id: line.soulId,
                video_ref: line.motionRefUrl
              },
              withPolling: false
            });

            return {
              sceneId: line.id,
              status: "QUEUED",
              predictionId: jobSet.request_id || `hf_${Math.random().toString(36).substr(2, 9)}`,
              message: "Handshake Successful. Scene active on Higgsfield Network.",
              raw: jobSet
            };
          } catch (err) {
            console.error("SCENE_HANDSHAKE_ERROR (HIGGSFIELD):", err);
            return {
              sceneId: line.id,
              status: "FAILED",
              message: "Higgsfield Production Signal Failure."
            };
          }
        }

        // SANDBOX MODE (Higgsfield)
        return {
          sceneId: line.id,
          status: "QUEUED",
          predictionId: `hf_${Math.random().toString(36).substr(2, 9)}`,
          message: "Handshake Successful. Scene queued for Higgsfield Synthesis (SANDBOX)."
        };
      }

      // --- ENGINE: KLING (REPLICATE) ---
      if (replicateToken) {
        try {
          // Dynamic initialization if client token is supplied
          const localReplicate = apiKeys?.replicate ? new Replicate({ auth: replicateToken }) : replicate;

          const prediction = await localReplicate.predictions.create({
            model: "kwaivgi/kling-v2.1",
            input: {
              prompt: prompt,
              duration: line.durationEst <= 5 ? 5 : 10, // Kling supports 5 or 10s
              aspect_ratio: "9:16",
              start_image: charImage || studioImage,
              generate_audio: false, // We use ElevenLabs for audio
              mode: "pro" // Renders in 1080p
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
          console.error("SCENE_HANDSHAKE_ERROR (REPLICATE):", err);
          return {
            sceneId: line.id,
            status: "FAILED",
            message: "Production Signal Failure."
          };
        }
      }

      // SANDBOX MODE (Replicate)
      return {
        sceneId: line.id,
        status: "QUEUED",
        predictionId: `rep_${Math.random().toString(36).substr(2, 9)}`,
        message: "Handshake Successful. Scene queued for Neuromorphic Synthesis (SANDBOX)."
      };
    }));

    const responseBody = {
      status: "PRODUCTION_ACTIVE",
      mode: (engine === 'higgsfield' ? hfApiKey : replicateToken) ? "REAL" : "SANDBOX",
      engine,
      total_scenes: script.length,
      pipeline: engine === 'higgsfield' ? "HIGGSFIELD_V2_SDK" : "KLING_V2.1_SDK",
      results
    };
    completePaidOperation(paidReservation, { status: 200, body: responseBody });
    return NextResponse.json(responseBody);

  } catch (error) {
    console.error("PIPELINE_CRASH:", error);
    const responseBody = { error: "PIPELINE_CRASH: Internal Engine Error" };
    if (paidReservation) {
      completePaidOperation(paidReservation, { status: 500, body: responseBody });
    }
    return NextResponse.json(responseBody, { status: 500 });
  }
}
