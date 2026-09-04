import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SHOT_TYPES } from '@/data/characters';

// Schema do roteiro. Substitui o `content.match(/\[[\s\S]*\]/)` que raspava JSON
// da resposta do Gemini: o modelo agora nao consegue devolver fora deste formato.
// Envelopado em { scenes: [...] } porque structured outputs exige objeto na raiz.
const SCRIPT_SCHEMA = {
    type: 'object',
    properties: {
        scenes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'unique string' },
                    characterId: { type: 'string', enum: ['boomer', 'kev'] },
                    text: { type: 'string', description: 'the dialogue line' },
                    shotType: { type: 'string', enum: SHOT_TYPES.map(s => s.id) },
                    action: { type: 'string', description: 'physical motion matching DNA/Notes' },
                    durationEst: { type: 'integer', description: 'seconds, 3 to 8' },
                    emotion: { type: 'string', description: 'character emotion matching flow' },
                },
                required: ['id', 'characterId', 'text', 'shotType', 'action', 'durationEst', 'emotion'],
                additionalProperties: false,
            },
        },
    },
    required: ['scenes'],
    additionalProperties: false,
} as const;

export async function POST(req: Request) {
    try {
        const { topic, snippet, apiKey: clientApiKey, model } = await req.json();
        const apiKey = clientApiKey || process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Anthropic API Key' }, { status: 400 });
        }
        // Sonnet 5 e o padrao: a US$0,02/roteiro o custo e irrelevante perto do
        // render (US$3-6). `model` no body existe so para o A/B cego contra Opus 5.
        const modelId = model || process.env.SCRIPT_MODEL || 'claude-sonnet-5';

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
      - IMMEDIATE HOOK: Scene 1 MUST begin inside conflict, surprise, or a specific curiosity gap. No "hello", intro, or slow setup. High arousal is useful when the topic earns it, but never manufacture shouting.
      - ANTICIPATION LOOPS: Introduce a high-stakes problem, bold claim, or tension in Scene 1-2, but DELAY the resolution until Scene 8. The brain seeks closure; use this to force them to watch to the end.
      - PURPOSEFUL CONTRAST: Use shot, emotion, dialogue rhythm, or silence to mark a meaningful change. Do not add a visual effect merely to satisfy a timing quota.
      - DEADPAN IS A PATTERN INTERRUPT: Kev's pause and low energy are deliberate contrast against Boomer. Preserve comedic breathing room instead of making every scene frantic.
      - MIXED EMOTIONS: Build a readable tension curve from hook to payoff. Vary intensity when the story changes; no unsupported fixed-seconds rule.
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

      SCENE COUNT: free. Use as many scenes as the story needs — typically 7 to 10.
      Never pad to hit a number and never cut a beat to save one. What matters is
      holding the viewer, not the count.

      TOTAL RUNTIME: keep the sum of durationEst within short-form norms. Aim for
      35-75 seconds. Never exceed 90 seconds — beyond that, retention on 9:16
      collapses regardless of platform ceilings.
    `;

        // Sem `temperature`: Sonnet 5 / Opus 5 retornam 400 se ela for enviada.
        // A variacao entre episodios vem do topic + snippet, nao de amostragem.
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
            model: modelId,
            max_tokens: 8000, // teto cobre thinking + saida (~1500 tokens de roteiro)
            messages: [{ role: 'user', content: systemPrompt }],
            output_config: { format: { type: 'json_schema', schema: SCRIPT_SCHEMA } },
        });

        if (message.stop_reason === 'refusal') {
            throw new Error('Roteiro recusado pelos classificadores de seguranca do modelo.');
        }
        if (message.stop_reason === 'max_tokens') {
            throw new Error('Roteiro truncado: aumente max_tokens.');
        }

        const block = message.content.find(b => b.type === 'text');
        if (!block || block.type !== 'text') {
            throw new Error('No content returned from Claude');
        }

        const parsedScript = JSON.parse(block.text).scenes;

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

        // RUNTIME_GATE: o numero de cenas e livre de proposito (decisao do Felipe,
        // 07/08) — 7, 9 ou 10 cenas nao importa, o que importa e segurar o
        // espectador. O que NAO e livre e a duracao: passou disso, nao e mais
        // short-form viral em nenhuma plataforma. Trava por segundos, nao por cenas.
        const MAX_RUNTIME_S = 90;
        const runtime = parsedScript.reduce((a: number, l: { durationEst?: number }) => a + (l.durationEst || 0), 0);
        if (runtime > MAX_RUNTIME_S) {
            throw new Error(`SCRIPT_RUNTIME: ${runtime}s em ${parsedScript.length} cenas (maximo ${MAX_RUNTIME_S}s). Roteiro longo demais para 9:16.`);
        }

        // LOOP_GATE (04/09): trava nº 2 do handoff 07/08. "No A/B isto separou bom de
        // fraco — o NRL abriu com 'os refs roubaram a final' e fechou sem pagar nada."
        // Julga SENTIDO, nao conta campo: segunda chamada barata (~US$0.02) avalia se
        // a ultima cena paga o que a primeira plantou. FAIL = roteiro rejeitado, o
        // frontend regenera. Limite honesto: isto nao julga timing comico (juiz V2 = Felipe).
        const first = parsedScript[0];
        const last = parsedScript[parsedScript.length - 1];
        const loopJudge = await client.messages.create({
            model: modelId,
            max_tokens: 300,
            messages: [{
                role: 'user',
                content: `You are a strict script editor for a comedy duo podcast. A short video opens with a hook and must pay it off by the end.\nOPENING HOOK (scene 1, by ${first.characterId}): "${first.text}"\nCLOSING SCENE (last, by ${last.characterId}): "${last.text}"\nDoes the closing scene PAY OFF the opening hook (resolves, lands the promised joke/value, or closes the loop)? Answer with exactly one word PASS or FAIL, then a short reason (max 15 words).`
            }]
        });
        const loopVerdict = (loopJudge.content.find(b => b.type === 'text')?.text || '').trim();
        const hasPass = /\bPASS\b/i.test(loopVerdict);
        const hasFail = /\bFAIL\b/i.test(loopVerdict);
        if (loopJudge.stop_reason === 'max_tokens' || (!hasPass && !hasFail)) {
            // Falha-open com registro: juiz indisponivel nao incenera roteiro aprovavel.
            console.warn(`[LOOP_GATE] UNJUDGED (stop=${loopJudge.stop_reason}) — roteiro segue com loop não verificado`);
        } else if (hasFail && !hasPass) {
            throw new Error(`SCRIPT_LOOP: a última cena não paga o gancho da primeira. Veredito do juiz: ${loopVerdict.slice(0, 200)}`);
        } else {
            console.log(`[LOOP_GATE] PASS — ${loopVerdict.slice(0, 120)}`);
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
