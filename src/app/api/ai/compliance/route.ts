import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';

export async function POST(req: Request) {
  try {
    const { script, countries = ['AU', 'US', 'EU'], apiKey: clientApiKey } = await req.json();
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key for Legal Compliance Scan' }, { status: 400 });
    }

    const scriptText = script.map((line: { characterId: string, text: string }, idx: number) => 
      `[Scene ${idx + 1}] ${line.characterId.toUpperCase()}: "${line.text}"`
    ).join('\n');

    const legalPrompt = `
      You are an AI Legal Compliance Officer and Media Attorney specialized in international intellectual property, defamation, right of publicity, and synthetic media laws (updated to 2026 standards).
      
      You must scan the following script intended for neural video generation (using Kling/Higgsfield) and flag potential lawsuit/litigation risks based on the target jurisdictions: ${countries.join(', ')}.

      JURISDICTION RULES (2026 STANDARDS):
      1. AUSTRALIA (AU): Very strict Defamation laws. Even satire can be actionable if it causes serious harm to reputation or depicts real people without absolute factual truth. Check for trademark dilution.
      2. UNITED STATES (US): Right of Publicity (unauthorized voice/likeness recreation), state-level deepfake laws (election disclaimers), and the Federal TAKE IT DOWN Act (notice-and-takedown obligations). 
      3. EUROPEAN UNION (EU): EU AI Act (mandatory labeling of AI-generated content and deepfakes by August 2026). Trademark/Copyright infringement of brands.
      4. BRASIL (BR): Código Civil (Art. 20 - proibição de uso comercial de imagem/voz sem autorização expressa, mesmo sem intenção de difamar). Lei Geral de Proteção de Dados (LGPD) em dados biométricos. Resoluções do TSE contra desinformação via deepfakes. Defamação/Calúnia/Injúria criminal no Código Penal.

      SCRIPT TO SCAN:
      """
      ${scriptText}
      """

      Analyze the script and return a JSON object with:
      - overallRisk: "LOW" | "MEDIUM" | "HIGH"
      - flags: An array of specific issues found. Each flag must have:
        - category: "DEFAMATION" | "RIGHT_OF_PUBLICITY" | "TRADEMARK" | "EU_AI_ACT" | "COPYRIGHT" | "OTHER"
        - riskLevel: "LOW" | "MEDIUM" | "HIGH"
        - description: Explanation of the risk (e.g. "Mention of sportsbet logo may constitute trademark use issues if generated on Koala").
        - recommendation: Actionable change (e.g. "Add a verbal/visual satire disclaimer or change brand name to 'OzzyBet'").
        - targetCountry: The country abbreviation (AU, US, EU, etc.) where this is a primary issue.
      - watermarkingRequired: boolean (true if EU AI Act requires an 'AI Generated' label/watermark).
      - suggestedDisclaimer: A legal disclaimer string to display at the beginning/end of the video to minimize risk.

      Return ONLY valid JSON. No markdown backticks, no explanations.
    `;

    const { response } = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: legalPrompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Gemini API Compliance Error');
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No compliance analysis returned from Gemini');
    }

    // Extraction helper to strip potential markdown blocks
    let jsonStr = content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsedCompliance = JSON.parse(jsonStr);
    return NextResponse.json(parsedCompliance);

  } catch (error) {
    console.error('LEGAL_COMPLIANCE_SCAN_FAIL:', error);
    const message = error instanceof Error ? error.message : 'Unknown compliance scan error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
