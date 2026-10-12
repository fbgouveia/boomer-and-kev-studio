import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const serverPath = path.resolve('.next/standalone/server.js');
const runtimeTmp = path.resolve('.next/standalone/.tmp');
assert.ok(existsSync(serverPath), 'Execute npm run build antes do teste standalone.');

async function startServer(port, auth = true) {
  const output = [];
  const server = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      STUDIO_AUTH_USER: auth ? 'security-test' : '',
      STUDIO_AUTH_PASSWORD: auth ? 'local-only' : '',
      REPLICATE_API_TOKEN: '',
      HF_CREDENTIALS: '',
      ELEVENLABS_API_KEY: '',
      GEMINI_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => output.push(chunk));
  server.stderr.on('data', chunk => output.push(chunk));

  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`Servidor encerrou antes do teste:\n${Buffer.concat(output).toString()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}`);
      if (response.status >= 200) return server;
    } catch {
      // Ainda inicializando.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  server.kill('SIGTERM');
  throw new Error(`Servidor não ficou pronto:\n${Buffer.concat(output).toString()}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await new Promise(resolve => server.once('exit', resolve));
}

const unconfiguredPort = 3103;
const unconfiguredServer = await startServer(unconfiguredPort, false);
try {
  const response = await fetch(`http://127.0.0.1:${unconfiguredPort}`);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
} finally {
  await stopServer(unconfiguredServer);
}

const port = 3104;
const baseUrl = `http://127.0.0.1:${port}`;
const authorization = `Basic ${Buffer.from('security-test:local-only').toString('base64')}`;
const server = await startServer(port);

try {
  const unauthorized = await fetch(baseUrl);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get('www-authenticate') || '', /^Basic /);

  const authorized = await fetch(baseUrl, { headers: { Authorization: authorization } });
  assert.equal(authorized.status, 200);

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const crossSite = await fetch(`${baseUrl}/api/episodes/delete`, {
      method,
      headers: {
        Authorization: authorization,
        Origin: 'https://attacker.invalid',
        'X-Real-IP': `csrf-${method.toLowerCase()}`,
      },
    });
    assert.equal(crossSite.status, 403, `${method} deve ser bloqueado por CSRF`);
  }

  const malformedOrigin = await fetch(`${baseUrl}/api/episodes/delete`, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
      Origin: 'not a valid URL',
      'X-Real-IP': 'csrf-malformed',
    },
  });
  assert.equal(malformedOrigin.status, 403);

  const sameOrigin = await fetch(`${baseUrl}/api/episodes/delete?id=invalid`, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
      Origin: baseUrl,
      'X-Real-IP': 'csrf-same-origin',
    },
  });
  assert.equal(sameOrigin.status, 400);

  const approval = {
    confirmed: true,
    source: 'operator_cli',
    approvedAt: new Date().toISOString(),
  };
  const paidKey = `security-${crypto.randomUUID()}`;
  // Contrato de operação paga testado em /api/ai/image (as rotas por etapa
  // video/generate, render, ai/sync e ai/voice foram arquivadas em 12/10/2026).
  // Sem GEMINI_API_KEY o servidor responde 503 explícito — nada de modo SANDBOX
  // fingindo sucesso — e a idempotência guarda e repete essa resposta.
  const paidPayload = {
    prompt: 'Local paid-operation contract test',
    aspectRatio: '1:1',
    approval,
  };
  const postPaid = (pathname, body, idempotencyKey) => fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'X-Real-IP': `paid-${pathname}`,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });

  const missingPaidKey = await postPaid('/api/ai/image', paidPayload);
  assert.equal(missingPaidKey.status, 400);
  assert.equal((await missingPaidKey.json()).error, 'IDEMPOTENCY_KEY_REQUIRED');

  const missingPaidApproval = await postPaid(
    '/api/ai/image',
    { ...paidPayload, approval: undefined },
    `security-${crypto.randomUUID()}`,
  );
  assert.equal(missingPaidApproval.status, 403);
  assert.equal((await missingPaidApproval.json()).error, 'PAID_OPERATION_APPROVAL_REQUIRED');

  const firstPaid = await postPaid('/api/ai/image', paidPayload, paidKey);
  const firstPaidBody = await firstPaid.json();
  assert.equal(firstPaid.status, 503, 'provedor não configurado deve ser 503 explícito');
  assert.match(firstPaidBody.error, /GEMINI_API_KEY/);

  const replayedPaid = await postPaid('/api/ai/image', paidPayload, paidKey);
  assert.equal(replayedPaid.status, 503);
  assert.equal(replayedPaid.headers.get('idempotent-replay'), 'true');
  assert.deepEqual(await replayedPaid.json(), firstPaidBody);

  const paidConflict = await postPaid(
    '/api/ai/image',
    { ...paidPayload, prompt: 'Different paid payload' },
    paidKey,
  );
  assert.equal(paidConflict.status, 409);
  assert.equal((await paidConflict.json()).error, 'IDEMPOTENCY_CONFLICT');

  for (const archived of ['/api/render', '/api/ai/sync', '/api/ai/voice', '/api/video/generate']) {
    const gone = await postPaid(archived, {}, `security-${crypto.randomUUID()}`);
    assert.equal(gone.status, 404, `${archived} foi arquivada e não pode responder`);
  }

  const missingBalances = await fetch(`${baseUrl}/api/keys/balance`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'X-Real-IP': 'missing-balances',
    },
    body: '{}',
  });
  const missingBalancesBody = await missingBalances.json();
  assert.equal(missingBalances.status, 200);
  assert.equal(missingBalancesBody.replicate.status, 'UNCONFIGURED');
  assert.equal(missingBalancesBody.elevenlabs.status, 'UNCONFIGURED');

  for (let requestNumber = 1; requestNumber <= 61; requestNumber++) {
    const response = await fetch(`${baseUrl}/api/pipeline/run?id=invalid`, {
      headers: {
        Authorization: authorization,
        'X-Real-IP': 'rate-limit-client',
        'X-Forwarded-For': `spoofed-${requestNumber}`,
      },
    });
    if (requestNumber <= 60) {
      assert.equal(response.status, 400);
    } else {
      assert.equal(response.status, 429);
      assert.match(response.headers.get('retry-after') || '', /^\d+$/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }

  console.log('Segurança standalone válida: auth/CSRF/rate limit e gates pagos idempotentes sem provedores.');
} finally {
  await stopServer(server);
  if (existsSync(runtimeTmp)) {
    for (const filename of await readdir(runtimeTmp)) {
      if (filename.startsWith('paid_')) await unlink(path.join(runtimeTmp, filename));
    }
  }
}
