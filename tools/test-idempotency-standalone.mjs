import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const port = 3102;
const baseUrl = `http://127.0.0.1:${port}`;
const authUser = 'idempotency-test';
const authPassword = 'local-only';
const serverPath = path.resolve('.next/standalone/server.js');
const runtimeTmp = path.resolve('.next/standalone/.tmp');
assert.ok(existsSync(serverPath), 'Execute npm run build antes do teste standalone.');

const server = spawn(process.execPath, [serverPath], {
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    STUDIO_AUTH_USER: authUser,
    STUDIO_AUTH_PASSWORD: authPassword,
    ELEVENLABS_API_KEY: '',
    REPLICATE_API_TOKEN: '',
    SUPABASE_SERVICE_ROLE_KEY: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });

async function waitUntilReady() {
  const authorization = `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString('base64')}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Servidor encerrou antes do teste:\n${serverOutput}`);
    try {
      const response = await fetch(baseUrl, { headers: { Authorization: authorization } });
      if (response.status === 200) return;
    } catch {
      // Ainda inicializando.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não ficou pronto:\n${serverOutput}`);
}

try {
  await waitUntilReady();
  process.env.TEST_BASE_URL = baseUrl;
  process.env.TEST_AUTH_USER = authUser;
  process.env.TEST_AUTH_PASSWORD = authPassword;
  const { testedJobId } = await import('./test-pipeline-idempotency.mjs');
  const authorization = `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString('base64')}`;
  let jobState;
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(`${baseUrl}/api/pipeline/run?id=${testedJobId}`, {
      headers: { Authorization: authorization }
    });
    jobState = await response.json();
    if (jobState.status === 'FAILED') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(jobState?.status, 'FAILED');
  assert.match(jobState.logs.at(-1), /ELEVENLABS_API_KEY ausente/);
  assert.doesNotMatch(serverOutput, /Supabase Error|Requesting ElevenLabs|Replicate/i);
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => server.once('exit', resolve));
  if (existsSync(runtimeTmp)) {
    await rename(runtimeTmp, path.join(os.tmpdir(), `boomer-kev-standalone-test-${Date.now()}`));
  }
}
