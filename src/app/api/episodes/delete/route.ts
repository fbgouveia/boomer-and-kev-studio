import { NextResponse } from 'next/server';
import { querySupabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 });
    }

    // Use service role to bypass RLS and delete the row
    await querySupabase(`episodes?id=eq.${id}`, { 
      method: 'DELETE',
      useServiceRole: true 
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete episode error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
