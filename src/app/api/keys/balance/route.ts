import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    replicate: { status: 'offline', balance: '$0.00' },
    elevenlabs: { status: 'offline', balance: '$0.00', percent: 0 }
  });
}
