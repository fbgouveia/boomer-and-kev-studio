import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-deploy-test-'));
const binDir = path.join(tempDir, 'bin');
const logPath = path.join(tempDir, 'commands.log');
await import('node:fs/promises').then(({ mkdir }) => mkdir(binDir));

const mock = `#!/bin/sh
printf '%s' "$0" >> "$DEPLOY_TEST_LOG"
for arg in "$@"; do printf ' <%s>' "$arg" >> "$DEPLOY_TEST_LOG"; done
printf '\\n' >> "$DEPLOY_TEST_LOG"
exit 0
`;

for (const command of ['npm', 'ssh', 'rsync']) {
  const commandPath = path.join(binDir, command);
  await writeFile(commandPath, mock);
  await chmod(commandPath, 0o755);
}

function run(extraEnv = {}) {
  return spawnSync('bash', ['deploy_studio.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      DEPLOY_TEST_LOG: logPath,
      VPS_IP: 'test.invalid',
      VPS_USER: 'tester',
      DEST_DIR: '/srv/boomer-kev-test',
      PORT: '3999',
      ...extraEnv
    }
  });
}

await writeFile(logPath, '');
const defaultRun = run();
assert.equal(defaultRun.status, 0, defaultRun.stderr);
assert.match(defaultRun.stdout, /Ambiente remoto preservado/);
let commands = await readFile(logPath, 'utf8');
assert.doesNotMatch(commands, /\.env\.local/);
assert.match(commands, /<--exclude=\.tmp\/>/);

const envPath = path.join(tempDir, 'production.env');
await writeFile(envPath, 'SAFE_TEST_VALUE=1\n');
await writeFile(logPath, '');
const explicitEnvRun = run({ DEPLOY_ENV_FILE: envPath });
assert.equal(explicitEnvRun.status, 0, explicitEnvRun.stderr);
commands = await readFile(logPath, 'utf8');
assert.match(commands, new RegExp(envPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(commands, /<tester@test\.invalid:\/srv\/boomer-kev-test\/\.env>/);

const missingEnvRun = run({ DEPLOY_ENV_FILE: path.join(tempDir, 'missing.env') });
assert.notEqual(missingEnvRun.status, 0);
assert.match(missingEnvRun.stdout, /DEPLOY_ENV_FILE não encontrado/);

console.log('Deploy válido: env remoto preservado por padrão, envio explícito aceito e arquivo ausente bloqueado.');
