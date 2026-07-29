import { NextResponse } from 'next/server';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const jobIdSchema = z.string().uuid();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const idValidation = jobIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "INVALID_JOB_ID" }, { status: 400 });
    }

    const filePath = path.resolve(process.cwd(), '.tmp', `final_${idValidation.data}.mp4`);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Video not found or still processing" }, { status: 404 });
    }

    // ponytail: stream raw file using native Response
    const fileStream = createReadStream(filePath);
    return new Response(fileStream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="boomer_and_kev_episode_${idValidation.data}.mp4"`
      }
    });

  } catch (error) {
    console.error("PIPELINE_DOWNLOAD_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}
