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

export const imageSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
  // 9:16 faltava — sem ele não dava para gerar capa vertical (TikTok/Reels/Shorts).
  aspectRatio: z.enum(['1:1', '4:3', '16:9', '9:16']).default('1:1'),
  // Âncora de personagem. Sem ela o modelo inventa outro canguru a cada geração —
  // mesma causa da infidelidade que quebrou o pipeline de vídeo. Só caminhos sob
  // /assets: o valor vem do cliente e não pode virar leitura arbitrária de disco.
  // O lookahead barra `..` em qualquer posição: sem ele `/assets/../../etc/passwd.png`
  // passava no regex e só a checagem de caminho resolvido segurava.
  anchorAsset: z.string().regex(/^\/assets\/(?!.*\.\.)[A-Za-z0-9._\/-]+\.(png|jpg|jpeg)$/).max(256).optional(),
  clientApiKey: z.string().trim().min(1).max(512).optional(),
  approval: z.unknown().optional(),
});

const ASPECT_HINT: Record<string, string> = {
  '16:9': 'aspect ratio 16:9 landscape',
  '9:16': 'aspect ratio 9:16 vertical portrait',
  '4:3': 'aspect ratio 4:3',
  '1:1': 'aspect ratio 1:1 square',
};

/** Lê a âncora do disco como inlineData. Rejeita qualquer coisa fora de public/assets. */
export async function anchorPart(assetPath: string | undefined) {
  if (!assetPath) return null;
  const assetsRoot = path.resolve(process.cwd(), 'public', 'assets');
  const resolved = path.resolve(process.cwd(), 'public', `.${assetPath}`);
  // Defesa em profundidade: mesmo com o regex, confere que o caminho resolvido não escapou.
  if (resolved !== assetsRoot && !resolved.startsWith(assetsRoot + path.sep)) return null;
  try {
    const bytes = await fs.readFile(resolved);
    const mimeType = resolved.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { inlineData: { mimeType, data: bytes.toString('base64') } };
  } catch {
    return null; // âncora ausente não deve derrubar a geração — degrada para texto puro
  }
}

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

    const { prompt, aspectRatio, clientApiKey, anchorAsset } = validation.data;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const responseBody = { error: 'Missing Gemini API Key' };
      completePaidOperation(paidReservation, { status: 400, body: responseBody });
      return NextResponse.json(responseBody, { status: 400 });
    }

    const anchor = await anchorPart(anchorAsset);

    const { response } = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            // A âncora vem ANTES do texto: o modelo trata a imagem como referência do
            // sujeito e o texto como direção do que fazer com ele.
            parts: [
              ...(anchor ? [anchor] : []),
              { text: `${prompt} (${ASPECT_HINT[aspectRatio]})` },
            ],
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
