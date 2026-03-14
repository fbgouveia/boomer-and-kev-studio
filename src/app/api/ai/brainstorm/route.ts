import { NextResponse } from 'next/server';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<{ response: Response, retryAfter?: number }> {
    const response = await fetch(url, options);

    if (response.status === 429 && retries > 0) {
        const delay = INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1);
        console.log(`[Neural Link] Alpha Overflow (429). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1);
    }

    if (response.status === 429 && retries === 0) {
        // Find retry duration in the error message if possible
        const errorData = await response.clone().json();
        const errorMessage = errorData.error?.message || "";
        const match = errorMessage.match(/retry in ([\d.]+)s/i);
        const retryAfter = match ? parseFloat(match[1]) : 30; // Default to 30s if not found
        return { response, retryAfter };
    }

    return { response };
}

export async function POST(req: Request) {
    try {
        const { topic, snippet, apiKey: clientApiKey, modelOverride } = await req.json();
        const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 400 });
        }

        const systemPrompt = `
You are the NEURAL NARRATIVE CORE for "Boomer & Kev Studio".
Your goal is to provide a "DRAFTING TABLE" of options for a viral video script based on a specific TREND.

CHARACTERS:
1. BOOMER: Aggressive, high-energy, shadow-boxing, hyper-enthusiastic Aussie alpha. Uses Queensland slang.
2. KEV: Deadpan, cynical, bored, low-energy koala-like personality. 

TASK:
Provide 3 distinct options for each of the following sections of a script about "${topic}".
The conversation must feel NATURAL and HUMAN. They can agree, laugh at each other, or trade barbs without constant opposition.

IMPORTANT: You MUST strictly follow the DIRECTORIAL NOTES provided. If they specify visual details like jerseys, specific catchphrases, or particular motions, YOU MUST incorporate them into the 'text', 'action', and 'emotion' fields.

SECTIONS:
1. hooks: Opening scroll-stopper. (Boomer for high energy, or Kev for lazy cynicism).
2. bridges: Building the premise or context. (Usually matches the starter).
3. reactions: The other character's response (reacting to the energy or the lack thereof).
4. interaction1: Mid-script dynamic exchange. (Boomer or Kev)
5. interaction2: Escalating the energy, trading a joke, or finding common ground. (Boomer or Kev)
6. closings: Final takeaway or explosive studio vibe. (Variable)

Output ONLY a JSON object with this structure:
{
  "hooks": [{ "characterId": "boomer", "text": "...", "action": "...", "emotion": "...", "retentionScore": 95, "reasoning": "..." }, ...],
  "bridges": [{ "characterId": "boomer", "text": "...", "action": "...", "emotion": "...", "retentionScore": 88, "reasoning": "..." }, ...],
  "reactions": [{ "characterId": "kev", "text": "...", "action": "...", "emotion": "...", "retentionScore": 92, "reasoning": "..." }, ...],
  "interaction1": [{ "characterId": "boomer", "text": "...", "action": "...", "emotion": "...", "retentionScore": 90, "reasoning": "..." }, ...],
  "interaction2": [{ "characterId": "kev", "text": "...", "action": "...", "emotion": "...", "retentionScore": 90, "reasoning": "..." }, ...],
  "closings": [{ "characterId": "boomer", "text": "...", "action": "...", "emotion": "...", "retentionScore": 90, "reasoning": "..." }]
}

DIRECTORIAL NOTES (Visual requirements, jerseys, specific lines): ${snippet}
`;

        const apiUrl = modelOverride ? `https://generativelanguage.googleapis.com/${modelOverride}:generateContent?key=${apiKey}` : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const { response, retryAfter } = await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json();

        if (data.error || response.status === 429) {
            return NextResponse.json({
                error: "BRAINSTORM_SIGNAL_LOSS",
                details: data.error?.message || "Gemini API Error",
                retryAfter: retryAfter || 30
            }, { status: response.status });
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('No content returned from Gemini');
        }

        // Robust JSON extraction
        let jsonStr = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        return NextResponse.json(JSON.parse(jsonStr));

    } catch (error) {
        console.error("BRAINSTORM_API_CRASH:", error);
        return NextResponse.json({
            error: "BRAINSTORM_SIGNAL_LOSS",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
