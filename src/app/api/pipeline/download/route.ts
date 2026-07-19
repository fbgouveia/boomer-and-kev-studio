import { NextResponse } from 'next/server';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const filePath = path.resolve(process.cwd(), '.tmp', `final_${id}.mp4`);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Video not found or still processing" }, { status: 404 });
    }

    // ponytail: stream raw file using native Response
    const fileStream = createReadStream(filePath);
    return new Response(fileStream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="boomer_and_kev_episode_${id}.mp4"`
      }
    });

  } catch (error) {
    console.error("PIPELINE_DOWNLOAD_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}
