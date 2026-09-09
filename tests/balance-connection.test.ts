import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/keys/balance/route';

describe('provider connection reporting', () => {
  const originalFetch = globalThis.fetch;
  const originalReplicate = process.env.REPLICATE_API_TOKEN;
  const originalEleven = process.env.ELEVENLABS_API_KEY;

  beforeEach(() => {
    process.env.REPLICATE_API_TOKEN = '';
    process.env.ELEVENLABS_API_KEY = 'test-only-elevenlabs';
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalReplicate === undefined) delete process.env.REPLICATE_API_TOKEN;
    else process.env.REPLICATE_API_TOKEN = originalReplicate;
    if (originalEleven === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = originalEleven;
  });

  const request = () => new NextRequest('http://localhost/api/keys/balance', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });

  it('uses server credentials when browser fields are empty', async () => {
    globalThis.fetch = async (_input, init) => {
      assert.equal(new Headers(init?.headers).get('xi-api-key'), 'test-only-elevenlabs');
      return Response.json({ character_count: 25, character_limit: 100 });
    };
    const result = await (await POST(request())).json();
    assert.equal(result.elevenlabs.status, 'AUTHENTICATED');
    assert.equal(result.elevenlabs.percent, 75);
  });

  it('distinguishes a scoped key from an invalid key on HTTP 401', async () => {
    globalThis.fetch = async () => Response.json({ detail: { status: 'missing_permissions' } }, { status: 401 });
    const result = await (await POST(request())).json();
    assert.equal(result.elevenlabs.status, 'RESTRICTED');
    assert.equal(result.elevenlabs.percent, null);
  });

  it('reports invalid credentials separately', async () => {
    globalThis.fetch = async () => Response.json({ detail: { status: 'invalid_api_key' } }, { status: 401 });
    assert.equal((await (await POST(request())).json()).elevenlabs.status, 'INVALID_KEY');
  });

  it('does not classify rate limiting or provider outages as invalid credentials', async () => {
    for (const [http, expected] of [[429, 'RATE_LIMITED'], [503, 'OFFLINE']] as const) {
      globalThis.fetch = async () => new Response('Unavailable', { status: http });
      const result = await (await POST(request())).json();
      assert.equal(result.elevenlabs.status, expected);
      assert.equal(result.elevenlabs.percent, null);
    }
  });

  it('keeps missing usage as unknown instead of inventing a zero balance', async () => {
    globalThis.fetch = async () => Response.json({});
    const result = await (await POST(request())).json();
    assert.equal(result.elevenlabs.status, 'OFFLINE');
    assert.equal(result.elevenlabs.percent, null);
  });
});
