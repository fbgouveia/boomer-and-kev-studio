import { NextResponse } from 'next/server';
import { querySupabase } from '@/lib/supabase';
import { z } from 'zod';

const episodeIdSchema = z.string().uuid();

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const idValidation = episodeIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'INVALID_EPISODE_ID' }, { status: 400 });
    }

    // Use service role to bypass RLS and delete the row
    await querySupabase(`episodes?id=eq.${idValidation.data}`, {
      method: 'DELETE',
      useServiceRole: true 
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete episode error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
