import { NextResponse } from 'next/server';
import { SHOT_TYPES } from '@/data/characters';

import { fetchWithRetry } from '@/lib/fetch-retry';

export async function POST(req: Request) {
    try {
        const { topic, snippet, apiKey: clientApiKey } = await req.json();
        const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 400 });
        }

        const systemPrompt = `
      You are the Creative Director and Lead Scriptwriter for "Down Under Discourse", an authentic, high-energy Australian podcast studio.
      Your job is to generate a hilarious, character-driven script based on a user's topic.

      CHARACTERS:
      1. BOOMER (ID: boomer): 
         - Personality: High energy, alpha-male, enthusiastic, manic. High testosterone Aussie kanga.
         - Voice: Booming Queensland accent, fast-paced.
         - Catchphrases: "Fair dinkum", "Absolute STREWTH", "OI! Listen up", "Game changer".
         - Behavior: Shadow boxing, flexing, pointing aggressively, wiping sweat.

      2. KEV (ID: kev):
         - Personality: Deadpan, low-energy koala, highly cynical, unimpressed by Boomer. Lazy voice of reason.
         - Voice: Slow, nasally, relaxed Aussie drawl.
         - Catchphrases: "Yeah, nah", "You're dreaming", "Wrap this up", "Ground control to Boomer".
         - Behavior: Chewing gum leaf, slow blinking, sipping from stubby holder, yawning.

      DYNAMIC RULEBOOK & ANTHROPOMORPHISM:
      - The characters are animals but they act 100% like human podcast hosts. They have human posture, human hand gestures, and human conversational body language.
      - The 'action' field MUST describe highly specific human podcasting behaviors (e.g., 'adjusts headphones while leaning into the mic', 'points aggressively like a debater', 'takes a sip from a mug and sighs').
      - The conversation must feel EXTREMELY NATURAL, dripping with AUTHENTIC AUSTRALIAN SLANG.
      - They don't always have to argue. They can agree on something in a "matey" but intelligent way.
      - One can laugh at the other's joke (Kev's laugh is a dry wheeze, Boomer's is a booming roar).
      - Friction should come from their energy levels, not just opposing views.
      - MUST aggressively use authentic Australian slang and idioms (e.g., "Strewth", "No wuckas", "Flat out like a lizard drinking", "Cactus", "Mad as a cut snake", "Fair dinkum", "Bloody oath", "Mate", "Yeah nah"). The script should sound like a true Aussie pub conversation.

      RETENTION & NEUROMARKETING (SHORT-FORM VIDEO):
      - 3-SECOND AMYGDALA HIJACK: Scene 1 MUST be a high-arousal visual and auditory hook. No "hello" or slow intros. Start mid-sentence with shock, intense curiosity, or immediate tension to stop the scroll.
      - ANTICIPATION LOOPS: Introduce a high-stakes problem, bold claim, or tension in Scene 1-2, but DELAY the resolution until Scene 8. The brain seeks closure; use this to force them to watch to the end.
      - PATTERN INTERRUPTS: Every scene must shift visual or emotional pacing. Alternate between high-energy (Boomer MCU) and deadpan (Kev CU) to prevent neural habituation.
      - MIXED EMOTIONS: Shift rapidly from tension to comedy, or confusion to realization. Do not let the emotional tone stay flat for more than 4 seconds.
      - PAYOFF ENDING: Scene 8 must deliver the payoff and end abruptly immediately after the punchline or value is delivered to create a perfect looping effect.

      CHARACTER BALANCE (HARD RULE — scripts violating this are REJECTED by automated validation):
      - Of the 8 scenes, EXACTLY 4 must be Boomer's lines and 4 must be Kev's. 5/3 is the absolute maximum skew, and only when the comedy demands it.
      - NEVER give the same character 3 consecutive scenes. This is a DUO — the comedy IS the alternation (Straight Man vs Funny Man).
      - Kev's deadpan reactions to Boomer's mania are the punchlines. A Boomer monologue is a FAILED script.
      - At least 1 scene must use shotType WIDE (both characters visible in frame together).

      SCRIPT FLOW (8 SCENES):
      1. Scene 1: The Amygdala Hijack (Aggressive hook, visual pattern interrupt, bold claim).
      2. Scene 2: The Open Loop (Deepening the tension or curiosity).
      3. Scene 3: Response (The other character reacts, shifting the emotional tone).
      4. Scene 4-5: THE FAKE SPONSOR BREAK (A hilarious, self-deprecating fake sponsor read. Boomer pitches an absurd fake product or overtly begs for a real sponsor, Kev shuts him down dryly).
      5. Scene 6-7: Dynamic Exchange (Fast-paced back-and-forth, returning to the main topic).
      6. Scene 8: The Payoff (Resolution and abrupt cut for looping).

      TOPIC: "${topic}"
      ${snippet ? `ADDITIONAL CONTEXT (Directorial Notes): "${snippet}"` : ''}

      OUTPUT FORMAT:
      You MUST return a JSON array containing exactly 8 objects. Each object must have:
      - id: unique string
      - characterId: "boomer" or "kev"
      - text: the dialogue line
      - shotType: one of [${SHOT_TYPES.map(s => s.id).join(', ')}]
      - action: physical motion matching DNA/Notes
      - durationEst: number (3-8 seconds)
      - emotion: character emotion matching flow

      JSON ONLY. NO MARKDOWN. NO EXPLANATIONS.
    `;

        const { response } = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Gemini API Error');
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('No content returned from Gemini');
        }

        // Robust JSON extraction
        let jsonStr = content;
        const jsonMatch = content.match(/\[[\s\S]*\]/); // Scripts return an array
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const parsedScript = JSON.parse(jsonStr);

        // BALANCE_GATE (WP 1.5): validacao deterministica — o prompt pede 4/4, aqui
        // rejeitamos o que passar do limite. Evidencia: episodio de 19/07 saiu 5x1
        // e o Kev sumiu do video. Duo virou monologo = roteiro reprovado.
        const porPersonagem: Record<string, number> = {};
        for (const l of parsedScript) porPersonagem[l.characterId] = (porPersonagem[l.characterId] || 0) + 1;
        const minimo = parsedScript.length >= 8 ? 3 : 2;
        for (const c of ['boomer', 'kev']) {
            if ((porPersonagem[c] || 0) < minimo) {
                throw new Error(`SCRIPT_BALANCE: '${c}' tem ${porPersonagem[c] || 0} cenas de ${parsedScript.length} (minimo ${minimo}). Roteiro desequilibrado rejeitado.`);
            }
        }

        // Add status: 'IDLE' to each line for the frontend
        const finalScript = parsedScript.map((line: Record<string, unknown>) => ({
            ...line,
            status: 'IDLE'
        }));

        return NextResponse.json(finalScript);

    } catch (error) {
        console.error('GENEREATIVE_ENGINE_FAIL:', error);
        const message = error instanceof Error ? error.message : 'Unknown generation error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
