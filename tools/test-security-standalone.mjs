import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const serverPath = path.resolve('.next/standalone/server.js');
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

  console.log('Segurança standalone válida: auth fail-closed, CSRF cobre PATCH e rate limit não é burlado por X-Forwarded-For variável.');
} finally {
  await stopServer(server);
}
