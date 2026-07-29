import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3102';
const auth = Buffer.from(
  `${process.env.TEST_AUTH_USER || 'idempotency-test'}:${process.env.TEST_AUTH_PASSWORD || 'local-only'}`
).toString('base64');
const key = `test-${crypto.randomUUID()}`;
const payload = {
  script: [{
    id: 'scene-1',
    characterId: 'boomer',
    text: 'Idempotency test. No provider should be called.',
    shotType: 'WIDE',
    action: 'Waits',
    emotion: 'Calm',
    durationEst: 1
  }],
  directorIdea: 'Idempotency contract test',
  engine: 'kling',
  aspect: '9:16'
};

async function post(body, idempotencyKey) {
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json'
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

const [first, concurrentReplay] = await Promise.all([
  post(payload, key),
  post(payload, key)
]);

assert.equal(first.status, 200);
assert.equal(concurrentReplay.status, 200);
assert.equal(first.body.jobId, concurrentReplay.body.jobId);
assert.equal([first.body.replayed, concurrentReplay.body.replayed].filter(Boolean).length, 1);

const laterReplay = await post(payload, key);
assert.equal(laterReplay.status, 200);
assert.equal(laterReplay.body.jobId, first.body.jobId);
assert.equal(laterReplay.body.replayed, true);

const conflict = await post({ ...payload, directorIdea: 'Different payload' }, key);
assert.equal(conflict.status, 409);
assert.equal(conflict.body.error, 'IDEMPOTENCY_CONFLICT');

const missingKey = await post(payload);
assert.equal(missingKey.status, 400);
assert.equal(missingKey.body.error, 'IDEMPOTENCY_KEY_REQUIRED');

console.log(`Idempotência válida: concorrência e replay reutilizaram ${first.body.jobId}; conflito=409; chave ausente=400.`);
