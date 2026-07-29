import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import {
  beginPaidOperation,
  completePaidOperation,
  type PaidOperationReservation,
} from '@/lib/paid-operation';

const imageSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
  aspectRatio: z.enum(['1:1', '4:3', '16:9']).default('1:1'),
  clientApiKey: z.string().trim().min(1).max(512).optional(),
  approval: z.unknown().optional(),
});

export async function POST(req: Request) {
  let paidReservation: PaidOperationReservation | undefined;
  try {
    const rawBody = await req.json();
    const validation = imageSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        error: 'INVALID_IMAGE_SIGNAL',
        details: validation.error.format(),
      }, { status: 400 });
    }

    const paidOperation = beginPaidOperation({
      scope: 'ai-image',
      idempotencyKey: req.headers.get('idempotency-key'),
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

    const { prompt, aspectRatio, clientApiKey } = validation.data;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const responseBody = { error: 'Missing Gemini API Key' };
      completePaidOperation(paidReservation, { status: 400, body: responseBody });
      return NextResponse.json(responseBody, { status: 400 });
    }

    const { response } = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${prompt} (${aspectRatio === '16:9' ? 'aspect ratio 16:9 landscape' : aspectRatio === '4:3' ? 'aspect ratio 4:3' : 'aspect ratio 1:1 square'})`,
            }],
          }],
        }),
      },
    );

    const data = await response.json();
    if (data.error) {
      const responseBody = { error: data.error.message || 'Imagen API Error' };
      completePaidOperation(paidReservation, { status: response.status, body: responseBody });
      return NextResponse.json(responseBody, { status: response.status });
    }

    const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Image) {
      throw new Error('No image bytes returned from Nano Banana Pro model');
    }

    const dir = path.join(process.cwd(), 'public', 'assets', 'generated');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(base64Image, 'base64'));

    const responseBody = { imageUrl: `/assets/generated/${filename}` };
    completePaidOperation(paidReservation, { status: 200, body: responseBody });
    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('NANO_BANANA_PRO_FAIL:', error);
    const responseBody = {
      error: 'PAID_OPERATION_STATE_UNCERTAIN',
      details: 'Confirme no Gemini antes de tentar novamente.',
    };
    if (paidReservation) {
      completePaidOperation(paidReservation, { status: 502, body: responseBody });
    }
    return NextResponse.json(responseBody, { status: 502 });
  }
}
