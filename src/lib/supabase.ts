// ponytail: Lightweight native HTTP client for Supabase REST API. 
// Avoids installing @supabase/supabase-js to keep project lean.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SupabaseOptions extends RequestInit {
  useServiceRole?: boolean;
}

export async function querySupabase<T = any>(
  path: string,
  options: SupabaseOptions = {}
): Promise<T | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Credentials not configured. DB query skipped.");
    return null;
  }

  const { useServiceRole = false, ...fetchOptions } = options;
  const key = useServiceRole && supabaseServiceRole ? supabaseServiceRole : supabaseAnonKey;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${key}`,
    ...options.headers,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Supabase Error] Endpoint: ${path} | Status: ${res.status} | Details: ${errorText}`);
    throw new Error(`Supabase operation failed: ${errorText}`);
  }

  if (res.status === 204) return null;
  return res.json();
}
