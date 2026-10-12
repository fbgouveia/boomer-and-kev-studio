import { NextResponse } from 'next/server';
import { voiceSchema } from '@/lib/validations';
import { CHARACTERS, voiceSettingsFor } from '@/data/characters';
import { fetchWithRetry } from '@/lib/fetch-retry';
import {
    beginPaidOperation,
    completePaidOperation,
    type PaidOperationReservation,
} from '@/lib/paid-operation';

export async function POST(req: Request) {
    let paidReservation: PaidOperationReservation | undefined;
    try {
        const body = await req.json();
        const validation = voiceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid Input Signal' }, { status: 400 });
        }

        const paidOperation = beginPaidOperation({
            scope: 'ai-voice',
            idempotencyKey: req.headers.get('idempotency-key'),
            approval: body.approval,
            payload: body,
        });
        if (paidOperation.kind === 'error') {
            return NextResponse.json(paidOperation.body, { status: paidOperation.status });
        }
        if (paidOperation.kind === 'replay') {
            const replayBody = paidOperation.response.body as {
                kind?: string;
                audioBase64?: string;
                error?: string;
            };
            if (replayBody.kind === 'audio' && replayBody.audioBase64) {
                return new Response(Buffer.from(replayBody.audioBase64, 'base64'), {
                    status: paidOperation.response.status,
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Idempotent-Replay': 'true',
                    },
                });
            }
            return NextResponse.json(replayBody, {
                status: paidOperation.response.status,
                headers: { 'Idempotent-Replay': 'true' },
            });
        }
        paidReservation = paidOperation.reservation;

        const { text, characterId, apiKey: clientApiKey } = validation.data;
        const apiKey = clientApiKey || process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            const responseBody = { error: 'Missing ElevenLabs API Key' };
            completePaidOperation(paidReservation, { status: 400, body: responseBody });
            return NextResponse.json(responseBody, { status: 400 });
        }

        const character = CHARACTERS.find(c => c.id === characterId);
        if (!character || !character.voiceId) {
            const responseBody = { error: 'Character Sonic Profile Missing' };
            completePaidOperation(paidReservation, { status: 404, body: responseBody });
            return NextResponse.json(responseBody, { status: 404 });
        }

        const { response } = await fetchWithRetry(
            `https://api.elevenlabs.io/v1/text-to-speech/${character.voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                    'accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                    text,
                    model_id: character.voice.modelId,
                    voice_settings: voiceSettingsFor(character, body.emotion),
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            const responseBody = { error: error.detail?.message || 'ElevenLabs Handshake Failed' };
            completePaidOperation(paidReservation, { status: response.status, body: responseBody });
            return NextResponse.json(responseBody, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();
        completePaidOperation(paidReservation, {
            status: 200,
            body: {
                kind: 'audio',
                audioBase64: Buffer.from(audioBuffer).toString('base64'),
            },
        });

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });

    } catch (error) {
        console.error("SONIC_CORE_CRASH:", error);
        const responseBody = {
            error: 'PAID_OPERATION_STATE_UNCERTAIN',
            details: 'Confirme no ElevenLabs antes de tentar novamente.',
        };
        if (paidReservation) {
            completePaidOperation(paidReservation, { status: 502, body: responseBody });
        }
        return NextResponse.json(responseBody, { status: 502 });
    }
}
