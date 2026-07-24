import { NextResponse } from 'next/server';
import { voiceSchema } from '@/lib/validations';
import { CHARACTERS, voiceSettingsFor } from '@/data/characters';
import { fetchWithRetry } from '@/lib/fetch-retry';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = voiceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid Input Signal' }, { status: 400 });
        }

        const { text, characterId, apiKey: clientApiKey } = validation.data;
        const apiKey = clientApiKey || process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing ElevenLabs API Key' }, { status: 400 });
        }

        const character = CHARACTERS.find(c => c.id === characterId);
        if (!character || !character.voiceId) {
            return NextResponse.json({ error: 'Character Sonic Profile Missing' }, { status: 404 });
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
            return NextResponse.json({ error: error.detail?.message || 'ElevenLabs Handshake Failed' }, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });

    } catch (error) {
        console.error("SONIC_CORE_CRASH:", error);
        return NextResponse.json({ error: 'Internal Sonic Engine Error' }, { status: 500 });
    }
}
