import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';

export async function POST(req: Request) {
    try {
        const { topic, answers, apiKey: clientApiKey } = await req.json();
        const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 400 });
        }

        let systemPrompt = "";

        if (!answers) {
            // Stage 1: Generate 3 questions
            systemPrompt = `
You are the "DIRECTORIAL INSTRUCTOR" for Boomer & Kev Studio. 
Expertise: Psychology, professional screenwriting, drama, and viral copywriting.

USER TOPIC: "${topic}"

TASK:
Based on the topic, generate EXACTLY 3 targeted, psychologically-driven questions to help the user define the "soul" of the video. 
These should be short, punchy questions that provoke creative thinking.

Output ONLY a JSON object:
{
  "questions": ["Question 1", "Question 2", "Question 3"]
}
`;
        } else {
            // Stage 2: Generate Master Blueprint
            systemPrompt = `
You are the "DIRECTORIAL INSTRUCTOR" for Boomer & Kev Studio.
Expertise: Psychologist, Dramatist, and Master Copywriter.

USER TOPIC: "${topic}"
USER ANSWERS:
${answers.map((a: string, i: number) => `Answer ${i + 1}: ${a}`).join('\n')}

TASK:
Synthesize these answers into a MASTER DIRECTORIAL BLUEPRINT. 
This blueprint will be used as "Directorial Notes" for our Script Engine.

REQUIREMENTS:
- Be descriptive and vivid.
- Specify visual details (clothing, props, environment).
- Define the conversational tone and specific character behaviors.
- Ensure it feels uniquely "Down Under Discourse" (Aussie vibes).
- The result should be a single, dense paragraph of professional directorial instructions.

Output ONLY a JSON object:
{
  "blueprint": "..."
}
`;
        }

        const { response } = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('No content returned from Neural Core');
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;

        return NextResponse.json(JSON.parse(jsonStr));

    } catch (error) {
        console.error("INSTRUCTOR_ERROR:", error);
        return NextResponse.json({ error: "INSTRUCTOR_LINK_FAILED", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
