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
  aspect: '9:16',
  approval: {
    confirmed: true,
    source: 'studio_ui',
    approvedAt: new Date().toISOString()
  }
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

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return { status: response.status, body: await response.json() };
}

async function deleteRequest(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` }
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

const concurrentReads = await Promise.all(
  Array.from({ length: 30 }, () => get(`/api/pipeline/run?id=${first.body.jobId}`))
);
assert.ok(concurrentReads.every(result => result.status === 200));
assert.ok(concurrentReads.every(result => result.body.id === first.body.jobId));

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

const missingApproval = await post(
  Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'approval')),
  `test-${crypto.randomUUID()}`
);
assert.equal(missingApproval.status, 403);
assert.equal(missingApproval.body.error, 'RENDER_APPROVAL_REQUIRED');

const expiredApproval = await post({
  ...payload,
  approval: {
    ...payload.approval,
    approvedAt: new Date(Date.now() - 11 * 60_000).toISOString()
  }
}, `test-${crypto.randomUUID()}`);
assert.equal(expiredApproval.status, 403);
assert.equal(expiredApproval.body.error, 'RENDER_APPROVAL_EXPIRED');

const traversal = encodeURIComponent('../../HANDOFF');
const invalidStatusId = await get(`/api/pipeline/run?id=${traversal}`);
assert.equal(invalidStatusId.status, 400);
assert.equal(invalidStatusId.body.error, 'INVALID_JOB_ID');

const invalidDownloadId = await get(`/api/pipeline/download?id=${traversal}`);
assert.equal(invalidDownloadId.status, 400);
assert.equal(invalidDownloadId.body.error, 'INVALID_JOB_ID');

const invalidDeleteId = await deleteRequest(`/api/episodes/delete?id=${encodeURIComponent('x&status=neq.deleted')}`);
assert.equal(invalidDeleteId.status, 400);
assert.equal(invalidDeleteId.body.error, 'INVALID_EPISODE_ID');

console.log(`Pipeline seguro: job ${first.body.jobId}; aprovação ausente/expirada=403; 30 leituras íntegras; IDs inválidos=400.`);

export const testedJobId = first.body.jobId;
