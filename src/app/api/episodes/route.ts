import { NextResponse } from 'next/server';
import { querySupabase } from '@/lib/supabase';

// Library lê pelo servidor (atrás do Basic Auth do proxy) com service role,
// para que a leitura anônima de `episodes` possa ser fechada no RLS (BK-27).
export async function GET() {
  try {
    const data = await querySupabase('episodes?status=eq.assembled&order=created_at.desc', {
      useServiceRole: true,
      cache: 'no-store',
    });
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('List episodes error:', error);
    return NextResponse.json({ error: 'EPISODES_UNAVAILABLE' }, { status: 502 });
  }
}
