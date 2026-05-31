import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    hooks: [],
    bridges: [],
    reactions: [],
    interaction1: [],
    interaction2: [],
    closings: []
  });
}
