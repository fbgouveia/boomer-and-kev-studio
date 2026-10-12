// ponytail: Lightweight native HTTP client for Supabase REST API. 
// Avoids installing @supabase/supabase-js to keep project lean.
import { fetchWithTimeout } from '@/lib/fetch-retry';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SupabaseOptions extends RequestInit {
  useServiceRole?: boolean;
}

export async function querySupabase<T = unknown>(
  path: string,
  options: SupabaseOptions = {}
): Promise<T | null> {
  // Falha explícita: antes, sem config devolvia null e chamadores (ex.: delete)
  // respondiam sucesso sem ter tocado no banco; e service role ausente caía em
  // silêncio para a anon key, que o RLS rejeita.
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  }

  const { useServiceRole = false, ...fetchOptions } = options;
  if (useServiceRole && !supabaseServiceRole) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured.');
  }
  const key = useServiceRole ? supabaseServiceRole! : supabaseAnonKey;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${key}`,
    ...options.headers,
  };

  const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${path}`, {
    ...fetchOptions,
    headers,
  }, 15_000);

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Supabase Error] Endpoint: ${path} | Status: ${res.status} | Details: ${errorText}`);
    throw new Error(`Supabase operation failed: ${errorText}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
