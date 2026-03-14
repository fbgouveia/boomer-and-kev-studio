import { NextResponse } from 'next/server';

import { balanceSchema } from '@/lib/validations';

export async function POST(req: Request) {
    try {
        const rawBody = await req.json();
        const validation = balanceSchema.safeParse(rawBody);

        if (!validation.success) {
            return NextResponse.json({
                error: "INVALID_INPUT_SIGNAL",
                details: validation.error.format()
            }, { status: 400 });
        }

        const { replicate, elevenlabs } = validation.data;
        const results: {
            replicate: { status: string, balance: string },
            elevenlabs: { status: string, balance: string, percent?: number }
        } = {
            replicate: { status: 'OFFLINE', balance: 'N/A' },
            elevenlabs: { status: 'OFFLINE', balance: 'N/A' }
        };

        // 1. Check Replicate
        if (replicate) {
            console.log("HANDSHAKING_WITH_REPLICATE...");
            try {
                const repRes = await fetch('https://api.replicate.com/v1/predictions', {
                    headers: {
                        'Authorization': `Token ${replicate}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (repRes.ok) {
                    results.replicate.status = 'AUTHENTICATED';
                    results.replicate.balance = 'SIGNAL_ACTIVE';
                    console.log("REPLICATE_HANDSHAKE: SUCCESS");
                } else {
                    results.replicate.status = 'UNAUTHORIZED';
                    console.log("REPLICATE_HANDSHAKE: FAILED (UNAUTHORIZED)");
                }
            } catch (err) {
                results.replicate.status = 'CONNECTION_ERROR';
                console.error("REPLICATE_CONNECTION_ERROR:", err);
            }
        }

        // 2. Check ElevenLabs
        if (elevenlabs) {
            console.log("HANDSHAKING_WITH_ELEVENLABS...");
            try {
                const elRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
                    headers: {
                        'xi-api-key': elevenlabs
                    }
                });
                if (elRes.ok) {
                    const data = await elRes.json();
                    const remaining = data.character_limit - data.character_count;
                    results.elevenlabs.status = 'AUTHENTICATED';
                    results.elevenlabs.balance = `${remaining.toLocaleString()} CHARS_REMAINING`;
                    results.elevenlabs.percent = Math.floor((remaining / data.character_limit) * 100);
                    console.log(`ELEVENLABS_HANDSHAKE: SUCCESS (${remaining} chars)`);
                } else {
                    results.elevenlabs.status = 'UNAUTHORIZED';
                    console.log("ELEVENLABS_HANDSHAKE: FAILED (UNAUTHORIZED)");
                }
            } catch (err) {
                results.elevenlabs.status = 'CONNECTION_ERROR';
                console.error("ELEVENLABS_CONNECTION_ERROR:", err);
            }
        }

        return NextResponse.json(results);
    } catch (_error) {
        return NextResponse.json({ error: 'FAILED_TO_FETCH_BALANCE' }, { status: 500 });
    }
}
