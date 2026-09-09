import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvConfig(project, true, { info() {}, error() {} });

const configured = name => Boolean(process.env[name]?.trim());
const results = [];
async function check(name, url, headers = {}, required = true) {
  try {
    const response = await fetch(url, {
      headers, redirect: 'error', signal: AbortSignal.timeout(20_000),
    });
    let status = response.ok ? 'OK' : response.status === 403 ? 'LIMITED' : 'FAIL';
    if (response.status === 401) {
      const body = await response.clone().json().catch(() => null);
      if (body?.detail?.status === 'missing_permissions') status = 'LIMITED';
    }
    results.push({ name, status, http: response.status, required });
    await response.body?.cancel();
  } catch (error) {
    results.push({ name, status: 'FAIL', reason: error.cause?.code || error.name, required });
  }
}
function missing(name, required = true) {
  results.push({ name, status: 'UNCONFIGURED', required });
}

const jobs = [];
const user = process.env.STUDIO_AUTH_USER;
const password = process.env.STUDIO_AUTH_PASSWORD;
if (user && password) {
  const headers = { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` };
  for (const route of ['/', '/assets/master_boomer.png', '/assets/master_kev.png', '/api/trends?geo=AU']) {
    jobs.push(check(`local ${route}`, `http://127.0.0.1:3000${route}`, headers));
  }
} else missing('local Basic Auth');

for (const [name, key, url, header, prefix, extra] of [
  ['Anthropic models', 'ANTHROPIC_API_KEY', 'https://api.anthropic.com/v1/models', 'x-api-key', '', { 'anthropic-version': '2023-06-01' }],
  ['Gemini models', 'GEMINI_API_KEY', 'https://generativelanguage.googleapis.com/v1beta/models', 'x-goog-api-key', '', {}],
  ['Replicate account', 'REPLICATE_API_TOKEN', 'https://api.replicate.com/v1/account', 'Authorization', 'Bearer ', {}],
  ['ElevenLabs subscription', 'ELEVENLABS_API_KEY', 'https://api.elevenlabs.io/v1/user/subscription', 'xi-api-key', '', {}],
]) {
  if (configured(key)) jobs.push(check(name, url, { [header]: prefix + process.env[key], ...extra }));
  else missing(name);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.port) {
    throw new Error('Invalid Supabase destination');
  }
  for (const [name, key] of [
    ['Supabase anonymous read', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY],
    ['Supabase service read', process.env.SUPABASE_SERVICE_ROLE_KEY],
  ]) {
    if (key) jobs.push(check(name, `${url.origin}/rest/v1/episodes?select=id&limit=0`, { apikey: key, Authorization: `Bearer ${key}` }));
    else missing(name);
  }
} catch {
  results.push({ name: 'Supabase URL', status: 'FAIL', reason: 'Missing or invalid hosted Supabase URL', required: true });
}

for (const key of ['N8N_RADAR_SECRET', 'CRON_SECRET', 'HF_CREDENTIALS', 'TIKTOK_CLIENT_KEY', 'INSTAGRAM_APP_ID', 'YOUTUBE_CLIENT_ID']) {
  results.push({ name: key, status: configured(key) ? 'CONFIGURED_NOT_TESTED' : 'UNCONFIGURED', required: false });
}
await Promise.all(jobs);
console.log(JSON.stringify({ project, mode: 'read-only; no generation or database writes', checks: results.sort((a, b) => a.name.localeCompare(b.name)) }, null, 2));
process.exitCode = results.some(result => result.required && result.status !== 'OK') ? 1 : 0;
