import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-deploy-test-'));
const binDir = path.join(tempDir, 'bin');
const logPath = path.join(tempDir, 'commands.log');
await mkdir(binDir);

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
// Regressao 30/07: "preservar o ambiente" so vale se o rsync --delete tambem PULAR o .env.
// Sem isso o deploy apagava o env de producao e nao enviava nada no lugar -> app sem
// variavel nenhuma, health check vermelho, rollback. Ver HANDOFF 30/07.
assert.match(commands, /<--exclude=\.env>/, 'rsync do standalone precisa excluir .env do --delete');

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

const remoteBinDir = path.join(tempDir, 'remote-bin');
const healthCountPath = path.join(tempDir, 'health-count');
await mkdir(remoteBinDir);

const remoteMocks = {
  npx: '#!/bin/sh\nexit 0\n',
  sleep: '#!/bin/sh\nexit 0\n',
  curl: `#!/bin/sh
count=0
[ -f "$HEALTH_COUNT_FILE" ] && count="$(cat "$HEALTH_COUNT_FILE")"
count=$((count + 1))
printf '%s' "$count" > "$HEALTH_COUNT_FILE"
case "$HEALTH_MODE" in
  success) printf '401' ;;
  rollback) [ "$count" -le 10 ] && printf '503' || printf '401' ;;
  *) printf '503' ;;
esac
`,
  rsync: `#!/bin/sh
src="$4"
dest="$5"
cp "$src/server.js" "$dest/server.js"
[ -f "$src/.env" ] && cp "$src/.env" "$dest/.env"
exit 0
`
};

for (const [command, contents] of Object.entries(remoteMocks)) {
  const commandPath = path.join(remoteBinDir, command);
  await writeFile(commandPath, contents);
  await chmod(commandPath, 0o755);
}

function runRemote(mode) {
  const fixtureDir = path.join(tempDir, `remote-${mode}`);
  const destination = path.join(fixtureDir, 'current');
  const rollback = path.join(fixtureDir, 'rollback');
  return mkdir(destination, { recursive: true })
    .then(() => mkdir(rollback, { recursive: true }))
    .then(() => Promise.all([
      writeFile(path.join(destination, 'server.js'), 'new-version'),
      writeFile(path.join(destination, '.env'), 'new-environment'),
      writeFile(path.join(rollback, 'server.js'), 'old-version'),
      writeFile(path.join(rollback, '.env'), 'old-environment'),
      writeFile(healthCountPath, '0')
    ]))
    .then(() => {
      const result = spawnSync('bash', ['tools/deploy-remote.sh', destination, '3999', rollback], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${remoteBinDir}:${process.env.PATH}`,
          HEALTH_MODE: mode,
          HEALTH_COUNT_FILE: healthCountPath,
          HEALTHCHECK_SLEEP_SECONDS: '0'
        }
      });
      return { result, destination };
    });
}

const healthy = await runRemote('success');
assert.equal(healthy.result.status, 0, healthy.result.stderr);
assert.equal(await readFile(path.join(healthy.destination, 'server.js'), 'utf8'), 'new-version');
assert.equal(await readFile(path.join(healthy.destination, '.env'), 'utf8'), 'new-environment');

const rolledBack = await runRemote('rollback');
assert.notEqual(rolledBack.result.status, 0);
assert.match(rolledBack.result.stderr, /Rollback restaurou a versão anterior/);
assert.equal(await readFile(path.join(rolledBack.destination, 'server.js'), 'utf8'), 'old-version');
assert.equal(await readFile(path.join(rolledBack.destination, '.env'), 'utf8'), 'old-environment');

const unrecoverable = await runRemote('failure');
assert.notEqual(unrecoverable.result.status, 0);
assert.match(unrecoverable.result.stderr, /Deploy e rollback não produziram/);

console.log('Deploy válido: env seguro, health check, rollback restaurado e falha irrecuperável sinalizada.');
