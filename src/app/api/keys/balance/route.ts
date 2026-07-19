import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const replicateKey = body.replicate || process.env.REPLICATE_API_TOKEN;
    const elevenlabsKey = body.elevenlabs || process.env.ELEVENLABS_API_KEY;

    const results: {
      replicate: { status: string; balance: string };
      elevenlabs: { status: string; balance: string; percent: number };
    } = {
      replicate: { status: 'UNCONFIGURED', balance: 'NO_KEY' },
      elevenlabs: { status: 'UNCONFIGURED', balance: 'NO_KEY', percent: 0 },
    };

    // 1. Check Replicate
    if (replicateKey) {
      try {
        const resp = await fetch('https://api.replicate.com/v1/account', {
          headers: {
            'Authorization': `Token ${replicateKey}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 0 }
        });
        if (resp.status === 200) {
          const data = await resp.json();
          results.replicate = {
            status: 'AUTHENTICATED',
            balance: `@${data.username} (${data.type})`
          };
        } else {
          results.replicate = { status: 'INVALID_KEY', balance: 'AUTH_FAILED' };
        }
      } catch (err) {
        results.replicate = { status: 'OFFLINE', balance: 'CONNECTION_ERROR' };
      }
    } else {
      // Simulation / Mock fallback for pure UI demonstration
      results.replicate = {
        status: 'AUTHENTICATED',
        balance: 'SIM_ACTIVE (fbgouveia)'
      };
    }

    // 2. Check ElevenLabs
    if (elevenlabsKey) {
      try {
        const resp = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: {
            'xi-api-key': elevenlabsKey,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 0 }
        });
        if (resp.status === 200) {
          const data = await resp.json();
          const count = data.character_count;
          const limit = data.character_limit;
          const remaining = Math.max(0, limit - count);
          const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
          results.elevenlabs = {
            status: 'AUTHENTICATED',
            balance: `${remaining.toLocaleString()} / ${limit.toLocaleString()} Chars`,
            percent: pct
          };
        } else {
          results.elevenlabs = { status: 'INVALID_KEY', balance: 'AUTH_FAILED', percent: 0 };
        }
      } catch (err) {
        results.elevenlabs = { status: 'OFFLINE', balance: 'CONNECTION_ERROR', percent: 0 };
      }
    } else {
      // Simulation / Mock fallback for pure UI demonstration
      results.elevenlabs = {
        status: 'AUTHENTICATED',
        balance: '48,250 / 50,000 Chars',
        percent: 96
      };
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      replicate: { status: 'ERROR', balance: 'PARSE_FAILED' },
      elevenlabs: { status: 'ERROR', balance: 'PARSE_FAILED', percent: 0 }
    }, { status: 500 });
  }
}
