import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Basic security to ensure only your n8n workflow can hit this
    if (authHeader !== `Bearer ${process.env.N8N_RADAR_SECRET || 'n8n_secret_key'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    // Validate payload
    if (!payload || !payload.name || !payload.category || !payload.url) {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    // Define path to radar.json
    const filePath = path.join(process.cwd(), 'src', 'data', 'radar.json');
    
    // Read current data
    let currentData = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      currentData = JSON.parse(fileContent);
    }

    // Append new benchmark
    const newBenchmark = {
      name: payload.name,
      category: payload.category,
      url: payload.url,
      retention_strategy: payload.retention_strategy || 'Identificado por IA (via n8n)',
      why_we_follow: payload.why_we_follow || 'Atualização autônoma de tendência.',
      status: 'active'
    };

    currentData.unshift(newBenchmark); // Add to the top of the list

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Radar updated successfully', benchmark: newBenchmark });
  } catch (error) {
    console.error('API_RADAR_UPDATE_ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
