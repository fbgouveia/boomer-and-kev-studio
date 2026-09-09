import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, rename, writeFile } from 'node:fs/promises';
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
  const { testedJobId, testedPayload } = await import('./test-pipeline-idempotency.mjs');
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
  // BK-18: voiceMode padrão é kling_native — sem ELEVENLABS o run segue até o
  // lançamento; no sandbox sem provedor nem piloto, falha explícita e acionável.
  assert.match(jobState.logs.at(-1), /Kling não gerou e não há piloto de fallback/);

  const orphanedJobId = crypto.randomUUID();
  const orphanedJobState = {
    id: orphanedJobId,
    status: 'PROCESSING',
    progress: 42,
    logs: ['job criado por instância anterior'],
    workerInstanceId: 'previous-worker',
    // Predição paga conservada: restart não apaga o rastro do dinheiro gasto.
    providerRequests: {
      'scene-1': {
        provider: 'replicate',
        model: 'kwaivgi/kling-v2.6',
        predictionId: 'prediction-orphaned-paid',
        launchedAt: new Date().toISOString()
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeFile(path.join(runtimeTmp, `job_${orphanedJobId}.json`), JSON.stringify(orphanedJobState));
  const orphanedIntermediate = path.join(runtimeTmp, `audio_${orphanedJobId}_scene-1.mp3`);
  await writeFile(orphanedIntermediate, 'orphaned audio');
  const orphanedResponse = await fetch(`${baseUrl}/api/pipeline/run?id=${orphanedJobId}`, {
    headers: { Authorization: authorization }
  });
  const orphanedState = await orphanedResponse.json();
  assert.equal(orphanedResponse.status, 200);
  assert.equal(orphanedState.status, 'FAILED');
  assert.equal(orphanedState.failureCode, 'WORKER_RESTARTED');
  assert.match(orphanedState.logs.at(-1), /PREDICTIONS UNCERTAIN/);
  assert.ok(orphanedState.logs.some(log => /WORKER_RESTARTED/.test(log)));
  // BK-16 (meta nova): restart NÃO apaga checkpoints — artefato pago é preservado
  // para retomada com reuso validado. O teste antigo exigia o comportamento inverso.
  assert.equal(existsSync(orphanedIntermediate), true);
  assert.ok(orphanedState.logs.some(log => /PREDICTIONS UNCERTAIN.*prediction-orphaned-paid/.test(log)));

  // Retomada com conteúdo alterado => conflito explícito (nunca mistura de cache antigo).
  const conflictResume = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `resume-${crypto.randomUUID()}`
    },
    body: JSON.stringify({
      ...testedPayload,
      directorIdea: 'Conteúdo alterado depois do job original',
      resumeJobId: testedJobId,
      approval: { confirmed: true, source: 'studio_ui', approvedAt: new Date().toISOString() }
    })
  });
  assert.equal(conflictResume.status, 409);
  assert.equal((await conflictResume.json()).error, 'RESUME_CONFIG_CONFLICT');

  // Retomada idêntica é aceita (o job volta a PROCESSING e falha no VOICE_GATE
  // do ambiente de teste — sem provedores configurados, US$0 gastos).
  const validResume = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `resume-${crypto.randomUUID()}`
    },
    body: JSON.stringify({
      ...testedPayload,
      resumeJobId: testedJobId,
      approval: { confirmed: true, source: 'studio_ui', approvedAt: new Date().toISOString() }
    })
  });
  assert.equal(validResume.status, 200);
  assert.equal((await validResume.json()).status, 'RESUMING');

  // Guarda de honestidade: nenhum chamada real a provedores pagos no ambiente de
  // teste. Citações em mensagens de erro (ex.: "causa provável: Replicate") não
  // são chamadas — por isso a regex mira assinaturas de chamada, não prosa.
  assert.doesNotMatch(serverOutput, /Supabase Error|Requesting ElevenLabs|api\.replicate\.com|api\.elevenlabs\.io|Launching Kling/i);
  assert.ok((await readdir(runtimeTmp)).every(name => !name.endsWith('.tmp')));
  console.log(`Recuperação válida: job órfão ${orphanedJobId} reconciliado como WORKER_RESTARTED com checkpoint PRESERVADO; retomada idêntica aceita e conflito de conteúdo 409.`);
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => server.once('exit', resolve));
  if (existsSync(runtimeTmp)) {
    await rename(runtimeTmp, path.join(os.tmpdir(), `boomer-kev-standalone-test-${Date.now()}`));
  }
}
