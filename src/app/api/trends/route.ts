import { NextResponse } from 'next/server';

export async function GET() {
  // Retorna um mock vazio para não quebrar a UI
  return NextResponse.json([
    {
      title: "Placeholder Trend",
      snippet: "No signal detected.",
      url: "",
      traffic: "0",
      published: "LIVE",
      news: []
    }
  ]);
}
