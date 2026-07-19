import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = '1:1', clientApiKey } = await req.json();
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 400 });
    }

    // Call the Nano Banana Pro (Gemini 3 Pro Image) model via generateContent
    const { response } = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${prompt} (${aspectRatio === '16:9' ? 'aspect ratio 16:9 landscape' : aspectRatio === '4:3' ? 'aspect ratio 4:3' : 'aspect ratio 1:1 square'})`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Imagen API Error');
    }

    const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Image) {
      console.error('NANO_BANANA_PRO_RESPONSE_ERROR:', JSON.stringify(data, null, 2));
      throw new Error('No image bytes returned from Nano Banana Pro model');
    }

    // Save generated image locally inside public/assets/generated
    const dir = path.join(process.cwd(), 'public', 'assets', 'generated');
    await fs.mkdir(dir, { recursive: true });

    const filename = `${crypto.randomUUID()}.jpg`;
    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(base64Image, 'base64');
    await fs.writeFile(filepath, buffer);

    const publicUrl = `/assets/generated/${filename}`;

    return NextResponse.json({
      imageUrl: publicUrl
    });

  } catch (error) {
    console.error('NANO_BANANA_PRO_FAIL:', error);
    const message = error instanceof Error ? error.message : 'Unknown generation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
