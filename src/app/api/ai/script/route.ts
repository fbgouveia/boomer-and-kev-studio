import { NextResponse } from 'next/server';
import { SHOT_TYPES } from '@/data/characters';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    const response = await fetch(url, options);

    if (response.status === 429 && retries > 0) {
        const delay = INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1);
        console.log(`[Neural Link] Alpha Overflow (429). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1);
    }

    return response;
}

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

      DYNAMIC RULEBOOK:
      - The conversation must feel NATURAL. They don't always have to argue.
      - They can agree on something in a "matey" but intelligent way.
      - One can laugh at the other's joke (Kev's laugh is a dry wheeze, Boomer's is a booming roar).
      - Friction should come from their energy levels, not just opposing views.
      - Use slang naturally: "Strewth", "No wuckas", "Flat out like a lizard drinking", "Cactus", "Mad as a cut snake".

      SCRIPT FLOW:
      1. Scene 1-2: Discovery/Intro. Either Boomer starts with high-energy hype, or Kev opens with a deadpan/lazy observation. Usually 2 blocks to set the scene.
      2. Scene 3: Response. The other character reacts to the opening premise.
      3. Scene 4-5: Dynamic Exchange. They interact. They might agree on a detail, share a laugh, or trade barbs.
      4. Scene 6: Wide Conclusion. A final takeaway or "vibe" moment for the studio.

      TOPIC: "${topic}"
      ${snippet ? `ADDITIONAL CONTEXT (Directorial Notes): "${snippet}"` : ''}

      OUTPUT FORMAT:
      You MUST return a JSON array containing exactly 6 objects. Each object must have:
      - id: unique string
      - characterId: "boomer" or "kev"
      - text: the dialogue line
      - shotType: one of [${SHOT_TYPES.map(s => s.id).join(', ')}]
      - action: physical motion matching DNA/Notes
      - durationEst: number (3-8 seconds)
      - emotion: character emotion matching flow

      JSON ONLY. NO MARKDOWN. NO EXPLANATIONS.
    `;

        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
