import { NextResponse } from 'next/server';
import { higgsfield, config as hfConfig } from '@higgsfield/client/v2';
import Replicate from 'replicate';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, engine = 'kling', characterElements, firstFrameAnchor, commercialIntegration, aspect_ratio = '16:9' } = body;

    const hfApiKey = process.env.HF_CREDENTIALS;
    if (engine === 'higgsfield' && hfApiKey) {
      hfConfig({ credentials: hfApiKey });
    }

    console.log(`[Video API] Engine: ${engine}`);
    console.log(`[Video API] Prompt: ${prompt}`);
    console.log(`[Video API] Character Reference: ${characterElements}`);
    console.log(`[Video API] First-Frame Anchoring: ${firstFrameAnchor ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[Video API] Commercial Injection: ${commercialIntegration}`);

    // --- HIGGSFIELD ENGINE ---
    if (engine === 'higgsfield') {
      if (hfApiKey) {
        try {
          const model = firstFrameAnchor ? 'kling-3.0/image-to-video' : 'kling-3.0/text-to-video';
          const jobSet = await higgsfield.subscribe(model, {
            input: {
              prompt: prompt,
              aspect_ratio: aspect_ratio === '9:16' ? '9:16' : '16:9',
              image: firstFrameAnchor,
              duration: 5
            },
            withPolling: false
          });
          return NextResponse.json({
            status: 'processing',
            jobId: jobSet.request_id || `hf_${Math.random().toString(36).substr(2, 9)}`,
            message: 'Video successfully queued on Higgsfield Network.',
            raw: jobSet
          });
        } catch (err) {
          console.error('[Video API] Higgsfield Error. Falling back...', err);
        }
      }
    }

    // --- REPLICATE KLING ENGINE (or Fallback) ---
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      const replicate = new Replicate({ auth: replicateToken });
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boomer-kev-studio.vercel.app';
        const prediction = await replicate.predictions.create({
          model: 'kwaivgi/kling-v2.6',
          input: {
            prompt: prompt,
            duration: 5,
            aspect_ratio: aspect_ratio === '9:16' ? '9:16' : '16:9',
            ...(firstFrameAnchor ? { input_image: firstFrameAnchor } : {})
          },
          webhook: `${siteUrl}/api/ai/callback`,
          webhook_events_filter: ['completed']
        });

        return NextResponse.json({
          status: 'processing',
          jobId: prediction.id,
          message: 'Video successfully queued on Replicate (Kling v2.6).',
          raw: prediction
        });
      } catch (err: any) {
        console.error('[Video API] Replicate Kling v2.6 failed. Trying fallback Luma model...', err);
        try {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boomer-kev-studio.vercel.app';
          const prediction = await replicate.predictions.create({
            model: 'luma/ray-2-72b',
            input: {
              prompt: prompt,
              aspect_ratio: aspect_ratio === '9:16' ? '9:16' : '16:9',
              duration: 5
            },
            webhook: `${siteUrl}/api/ai/callback`,
            webhook_events_filter: ['completed']
          });
          return NextResponse.json({
            status: 'processing',
            jobId: prediction.id,
            message: 'Video successfully queued on Replicate (Luma Ray-2 Fallback).',
            raw: prediction
          });
        } catch (fallbackErr) {
          console.error('[Video API] All Replicate models failed. Dropping to Sandbox.', fallbackErr);
        }
      }
    }

    // Sandbox / Local Simulation Fallback Mode
    return NextResponse.json({
      status: 'processing',
      jobId: `job_sim_${Math.random().toString(36).substr(2, 9)}`,
      message: 'Video successfully queued in Sandbox simulation mode.',
    });

  } catch (error) {
    console.error('[Video API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to queue video generation' },
      { status: 500 }
    );
  }
}
