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

      [COMPLIANCE & BRAND IDENTITY GUARDRAILS]
      1. NEVER use the names, catchphrases, or exact visual aesthetics of real-world influencers, VTubers, or podcasts (e.g., Theo Von, Joe Rogan, Superplastic, Nobody Sausage, Ironmouse).
      2. If the TOPIC or CONTEXT references a real-world creator, EXTRACT ONLY the structural pacing (e.g., "fast cuts", "deadpan reaction") and APPLY it to Boomer and Kev.
      3. Boomer is ALWAYS a kangaroo. Kev is ALWAYS a koala. Never turn them into humans or other IPs.
      4. Do not include unauthorized third-party trademarked products in the sponsorPitch; always invent a satirized fake product.


      You MUST generate exactly 3 options for each of these 8 categories (each category maps to a scene):
      1. hooks (Scene 1: High energy hook. Jump straight into the action. AMYGDALA HIJACK.)
      2. bridges (Scene 2: Moving into the core topic details)
      3. reactions (Scene 3: How they respond to each other's take on the topic)
      4. sponsorPitch (Scene 4: Boomer urgently pitching a satirical, absurd, hyper-masculine, or chaotic fake sponsor product)
      5. sponsorRebuttal (Scene 5: Kev deadpan reacting and dismissing Boomer's fake sponsor product)
      6. interaction1 (Scene 6: First major back-and-forth dialogue block returning to the main topic)
      7. interaction2 (Scene 7: Second major back-and-forth dialogue block escalating the topic)
      8. closings (Scene 8: Final concluding remarks with an abrupt cut after the punchline for the Anticipation Loop)

      CHARACTER BALANCE (HARD RULE): this is a DUO show. In EVERY category (except sponsorPitch=Boomer
      and sponsorRebuttal=Kev, which are fixed), the 3 options MUST include at least 1 Boomer option AND
      at least 1 Kev option, so the assembled episode can alternate. An episode dominated by one character
      is a FAILED episode — Kev's deadpan reactions are the punchlines.

      Each option in the list must be a JSON object containing:
      - characterId: "boomer" or "kev"
      - text: dialogue string filled with rich Aussie slang and character humor. Keep it short (1-2 sentences).
      - action: physical motion description matching character DNA.
      - emotion: emotion value (e.g. "INTENSE", "DEADPAN", "EXCITED", "CONFUSED").
      - retentionScore: number (integer between 80 and 99 representing viral hook strength).
      - reasoning: 1 short sentence explanation of the comedic/narrative value of this option.

      Additionally, generate a "wardrobe" object with 3 keys:
      - "boomer": A short description of Boomer's outfit for this episode (e.g., "A Hawaiian shirt over his black singlet, holding a fake coconut").
      - "kev": A short description of Kev's outfit (e.g., "A tiny sombrero and sunglasses").
      - "studio": Any special decor for the studio desk matching the theme.

      JSON Format:
      {
        "hooks": [ ... 3 options ... ],
        "bridges": [ ... 3 options ... ],
        "reactions": [ ... 3 options ... ],
        "sponsorPitch": [ ... 3 options ... ],
        "sponsorRebuttal": [ ... 3 options ... ],
        "interaction1": [ ... 3 options ... ],
        "interaction2": [ ... 3 options ... ],
        "closings": [ ... 3 options ... ],
        "wardrobe": {
          "boomer": "outfit description",
          "kev": "outfit description",
          "studio": "decor description"
        }
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
