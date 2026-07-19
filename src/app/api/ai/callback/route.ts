import { NextResponse } from 'next/server';

// Simulated database state for live event tracking of background renders
// In production, this would read/write directly to Supabase with the restricted role
const activePipelineState = new Map<string, { sceneId: string; status: string; url?: string }>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id: predictionId, status: webhookStatus, output, error, metrics } = body;

    console.log(`[Event-Driven Callback] Received webhook update for ID: ${predictionId}`);
    console.log(`[Event-Driven Callback] Status: ${webhookStatus}`);

    if (error) {
      console.error(`[Event-Driven Callback] Error reported:`, error);
      return NextResponse.json({ status: 'logged', error });
    }

    // 1. Process prediction status transition
    if (webhookStatus === 'succeeded' && output) {
      const finalUrl = Array.isArray(output) ? output[0] : output;
      
      // Update our internal pipeline job state
      activePipelineState.set(predictionId, {
        sceneId: predictionId, // Mapped to the prediction reference
        status: 'COMPLETED',
        url: finalUrl
      });

      console.log(`[Event-Driven Callback] Job successful. Final asset URL: ${finalUrl}`);
      console.log(`[Event-Driven Callback] Execution metrics:`, metrics);

      // 2. Cascade trigger: Trigger subsequent pipeline step (e.g., Lipsync Sync)
      // This is the 2026 Event-Driven A2A (Agent-to-Agent) pattern. No browser polling needed.
      // In production, the server would dispatch to QStash / Inngest or directly to `/api/ai/sync`
    } else if (webhookStatus === 'failed') {
      activePipelineState.set(predictionId, {
        sceneId: predictionId,
        status: 'FAILED'
      });
      console.error(`[Event-Driven Callback] Prediction failed.`);
    }

    return NextResponse.json({ status: 'received', predictionId, webhookStatus });

  } catch (error) {
    console.error('[Event-Driven Callback] Webhook processing crash:', error);
    return NextResponse.json(
      { error: 'Internal pipeline callback failure' },
      { status: 500 }
    );
  }
}

// GET endpoint to let the frontend query the resolved states if needed
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing target ID' }, { status: 400 });
  }

  const job = activePipelineState.get(id);
  if (!job) {
    return NextResponse.json({ status: 'not_found' });
  }

  return NextResponse.json(job);
}
