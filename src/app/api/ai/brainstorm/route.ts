import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';

export async function POST(req: Request) {
  try {
    const { topic, snippet, apiKey: clientApiKey } = await req.json();
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 400 });
    }

    const systemPrompt = `
      You are the Creative Director and Lead Scriptwriter for "Down Under Discourse", a hilarious Aussie podcast starring:
      - BOOMER: A high-energy, hyperactive Queensland kangaroo who loves fitness, boxing, and yelling "Fair dinkum!".
      - KEV: A lazy, deadpan, cynical grey koala who loves sleeping, chewing gum leaves, and saying "Yeah, nah".

      Task: Generate a brainstorming JSON block containing 3 creative options for each section of a script based on:
      TOPIC: "${topic}"
      CONTEXT: "${snippet || 'No additional notes'}"

      You MUST generate exactly 3 options for each of these 6 categories:
      1. hooks (starting lines - usually high energy Boomer or lazy Kev greeting)
      2. bridges (moving into the core topic details)
      3. reactions (how they respond to each other's take on the topic)
      4. interaction1 (first major back-and-forth dialogue block)
      5. interaction2 (second major back-and-forth dialogue block)
      6. closings (final concluding remarks and outro)

      Each option in the list must be a JSON object containing:
      - characterId: "boomer" or "kev"
      - text: dialogue string filled with rich Aussie slang and character humor. Keep it short (1-2 sentences).
      - action: physical motion description matching character DNA.
      - emotion: emotion value (e.g. "INTENSE", "DEADPAN", "EXCITED", "CONFUSED").
      - retentionScore: number (integer between 80 and 99 representing viral hook strength).
      - reasoning: 1 short sentence explanation of the comedic/narrative value of this option.

      JSON Format:
      {
        "hooks": [ ... 3 options ... ],
        "bridges": [ ... 3 options ... ],
        "reactions": [ ... 3 options ... ],
        "interaction1": [ ... 3 options ... ],
        "interaction2": [ ... 3 options ... ],
        "closings": [ ... 3 options ... ]
      }

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

    // Extract JSON array/object block
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsedBrainstorm = JSON.parse(jsonStr);
    return NextResponse.json(parsedBrainstorm);

  } catch (error) {
    console.error('BRAINSTORM_API_FAIL:', error);
    const message = error instanceof Error ? error.message : 'Unknown brainstorm generation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
