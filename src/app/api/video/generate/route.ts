import { NextResponse } from 'next/server';
import { higgsfield, config as hfConfig } from '@higgsfield/client/v2';
import Replicate from 'replicate';
import { z } from 'zod';
import {
  beginPaidOperation,
  completePaidOperation,
  type PaidOperationReservation,
} from '@/lib/paid-operation';

const videoSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
  engine: z.enum(['kling', 'higgsfield']).default('kling'),
  characterElements: z.string().max(10_000).optional(),
  firstFrameAnchor: z.string().url().optional(),
  commercialIntegration: z.string().max(10_000).optional(),
  aspect_ratio: z.enum(['9:16', '16:9']).default('16:9'),
  approval: z.unknown().optional(),
});

export async function POST(request: Request) {
  let paidReservation: PaidOperationReservation | undefined;
  try {
    const rawBody = await request.json();
    const validation = videoSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        error: 'INVALID_VIDEO_SIGNAL',
        details: validation.error.format(),
      }, { status: 400 });
    }

    const paidOperation = beginPaidOperation({
      scope: 'video-generate',
      idempotencyKey: request.headers.get('idempotency-key'),
      approval: validation.data.approval,
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

    const {
      prompt,
      engine,
      characterElements,
      firstFrameAnchor,
      commercialIntegration,
      aspect_ratio: aspectRatio,
    } = validation.data;

    console.log(`[Video API] Engine: ${engine}`);
    console.log(`[Video API] Prompt: ${prompt}`);
    console.log(`[Video API] Character Reference: ${characterElements}`);
    console.log(`[Video API] First-Frame Anchoring: ${firstFrameAnchor ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[Video API] Commercial Injection: ${commercialIntegration}`);

    if (engine === 'higgsfield') {
      const hfApiKey = process.env.HF_CREDENTIALS;
      if (!hfApiKey) {
        const responseBody = {
          status: 'processing',
          mode: 'SANDBOX',
          jobId: `hf_sim_${crypto.randomUUID()}`,
          message: 'Video queued in Higgsfield sandbox simulation mode.',
        };
        completePaidOperation(paidReservation, { status: 200, body: responseBody });
        return NextResponse.json(responseBody);
      }

      hfConfig({ credentials: hfApiKey });
      const model = firstFrameAnchor ? 'kling-3.0/image-to-video' : 'kling-3.0/text-to-video';
      const jobSet = await higgsfield.subscribe(model, {
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          image: firstFrameAnchor,
          duration: 5,
        },
        withPolling: false,
      });
      const responseBody = {
        status: 'processing',
        mode: 'REAL',
        jobId: jobSet.request_id || `hf_${crypto.randomUUID()}`,
        message: 'Video successfully queued on Higgsfield Network.',
        raw: jobSet,
      };
      completePaidOperation(paidReservation, { status: 200, body: responseBody });
      return NextResponse.json(responseBody);
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      const responseBody = {
        status: 'processing',
        mode: 'SANDBOX',
        jobId: `rep_sim_${crypto.randomUUID()}`,
        message: 'Video queued in Replicate sandbox simulation mode.',
      };
      completePaidOperation(paidReservation, { status: 200, body: responseBody });
      return NextResponse.json(responseBody);
    }

    const replicate = new Replicate({ auth: replicateToken });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boomer-kev-studio.vercel.app';
    const prediction = await replicate.predictions.create({
      model: 'kwaivgi/kling-v2.6',
      input: {
        prompt,
        duration: 5,
        aspect_ratio: aspectRatio,
        ...(firstFrameAnchor ? { input_image: firstFrameAnchor } : {}),
      },
      webhook: `${siteUrl}/api/ai/callback`,
      webhook_events_filter: ['completed'],
    });
    const responseBody = {
      status: 'processing',
      mode: 'REAL',
      jobId: prediction.id,
      message: 'Video successfully queued on Replicate (Kling v2.6).',
      raw: prediction,
    };
    completePaidOperation(paidReservation, { status: 200, body: responseBody });
    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('[Video API] Paid operation state uncertain:', error);
    const responseBody = {
      error: 'PAID_OPERATION_STATE_UNCERTAIN',
      details: 'Nenhum fallback pago foi disparado. Confirme no provedor antes de tentar novamente.',
    };
    if (paidReservation) {
      completePaidOperation(paidReservation, { status: 502, body: responseBody });
    }
    return NextResponse.json(responseBody, { status: 502 });
  }
}
