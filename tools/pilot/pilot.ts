// Piloto pago de 24/11 (autorizado por Felipe: até US$10 no total).
// Uso (node --import tsx tools/pilot/pilot.ts ...):
//   keyframe <boomer|kev> <plate.png> <out.jpg> "<pose/expressão>"
//   video <keyframe.jpg> <sceneId> "<prompt de fala/ação>"
// Todo gasto é registrado em design/rig-v1/pilot/spend.jsonl ANTES do resultado e o teto
// é conferido antes de cada chamada paga. Chaves lidas do .env.local, nunca impressas.
// ponytail: script de piloto, não rota do app; vira rota só se o piloto for aprovado.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { HiggsfieldClient } from '@/lib/higgsfield';
import { launchHiggsfieldScene, pollHiggsfieldScene } from '@/lib/higgsfield-scene';
import { readBudgetSummary } from '@/lib/cost-ledger';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'design/rig-v1/pilot');
const SPEND_LOG = path.join(OUT_DIR, 'spend.jsonl');
const PILOT_CAP_USD = 10;
const GEMINI_IMAGE_USD = 0.137; // US$0,134 saída + ~US$0,0011 por imagem de entrada (página oficial, 24/11)
const KLING_5S_USD = 0.714; // cotação REST 08/11; o launch recota antes de reservar

mkdirSync(OUT_DIR, { recursive: true });

function env(name: string): string {
    const line = readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n').find((l) => l.startsWith(`${name}=`));
    const value = line?.slice(name.length + 1).trim();
    if (!value) throw new Error(`${name} ausente no .env.local`);
    return value;
}

const LEDGER_DIR = path.join(ROOT, '.tmp/pilot-ledger');

// Imagens: log local. Vídeo: o ledger do Higgsfield (reservado + cobrado) — inclui
// submissões incertas, que nunca são descontadas por suposição.
function spentUsd(): number {
    const images = existsSync(SPEND_LOG)
        ? readFileSync(SPEND_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
            .filter((e) => e.kind === 'gemini-3-pro-image').reduce((sum, e) => sum + (e.usd as number), 0)
        : 0;
    const v = readBudgetSummary(LEDGER_DIR, 30_000_000);
    if (v.corruptEntries.length) throw new Error('ledger do piloto ilegível — parar e conferir');
    return images + (v.reservedMicros + v.chargedMicros) / 1_000_000;
}

function guard(nextUsd: number): void {
    const spent = spentUsd();
    if (spent + nextUsd > PILOT_CAP_USD) {
        throw new Error(`teto do piloto: gasto US$${spent.toFixed(3)} + próximo US$${nextUsd} > US$${PILOT_CAP_USD}`);
    }
}

function record(entry: Record<string, unknown>): void {
    appendFileSync(SPEND_LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

const inline = (file: string) => ({
    inlineData: { mimeType: file.endsWith('.png') ? 'image/png' : 'image/jpeg', data: readFileSync(file).toString('base64') },
});

async function keyframe(character: 'boomer' | 'kev', plate: string, out: string, pose: string) {
    guard(GEMINI_IMAGE_USD);
    const master = path.join(ROOT, `public/assets/master_${character}.png`);
    const side = character === 'boomer' ? 'LEFT seat (camera-left)' : 'RIGHT seat (camera-right)';
    const vertical = plate.includes('9x16');
    const prompt = [
        'Image 1 is the EXACT character identity. Image 2 is the EXACT studio set and camera framing.',
        `Place the character from image 1 seated at the desk in the ${side} position, in the empty seat (the set has no people).`,
        'Keep image 2 unchanged: same camera, lens, framing, walls, desk, lights, microphones and screens. The screens stay plain flat grey with nothing on them.',
        'Keep the character identical to image 1: same face, fur, ears, body, gloves/headset/accessories. Do not add clothing, jewelry, logos or text. Only this one character in frame.',
        `Pose and expression: ${pose}.`,
        `Photorealistic single frame, ${vertical ? 'vertical 9:16 portrait' : 'horizontal 16:9'}, no captions, no borders.`,
    ].join(' ');
    record({ kind: 'gemini-3-pro-image', usd: GEMINI_IMAGE_USD, character, plate: path.basename(plate), out: path.basename(out), note: 'registrado antes da chamada (custo assumido mesmo se falhar)' });
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
        body: JSON.stringify({ contents: [{ parts: [inline(master), inline(plate), { text: prompt }] }] }),
        signal: AbortSignal.timeout(180_000),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Gemini: ${data.error.message}`);
    const part = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
    if (!part) throw new Error('Gemini não devolveu imagem');
    writeFileSync(out, Buffer.from(part.inlineData.data, 'base64'));
    console.log(`ok ${out} | gasto acumulado US$${spentUsd().toFixed(3)}`);
}

// Desde 24/11 o /estimate devolve type=description com taxa USD/segundo em texto, sem
// `usd`. O app continua bloqueando isso; o piloto aceita SÓ o formato estrito abaixo
// (uma única taxa para a resolução de saída), reserva taxa × duração arredondado para
// cima e registra o texto do provedor.
// ponytail: leitura estrita só no piloto; levar ao app exige revisão do código de dinheiro.
class PricedClient extends HiggsfieldClient {
    constructor(private readonly key: string, private readonly resolution: string) { super({ apiKey: key }); }
    async estimate(model: string, payload: Parameters<HiggsfieldClient['estimate']>[1]) {
        const res = await fetch(`https://api.higgsfield.ai/estimate/${model}`, {
            method: 'POST', redirect: 'manual',
            headers: { 'Content-Type': 'application/json', Authorization: `Key ${this.key}` },
            body: JSON.stringify(payload), signal: AbortSignal.timeout(60_000),
        });
        const body = await res.json().catch(() => null);
        const text: string = body?.pricing_description ?? '';
        if (!res.ok || body?.type !== 'description' || !/rates in USD per video second/.test(text)) {
            return { ok: false as const, code: 'UNKNOWN_PRICE' as const, reason: `formato inesperado: ${JSON.stringify(body).slice(0, 200)}` };
        }
        const rates = [...text.matchAll(new RegExp(`${this.resolution}: \\$([0-9]+\\.[0-9]+)`, 'g'))].map((m) => m[1]);
        if (rates.length !== 1) return { ok: false as const, code: 'UNKNOWN_PRICE' as const, reason: `taxa ${this.resolution} ambígua/ausente` };
        const [int, frac = ''] = rates[0].split('.');
        const microsPerSecond = Number(int) * 1_000_000 + Number(frac.padEnd(6, '0').slice(0, 6)) + (/[1-9]/.test(frac.slice(6)) ? 1 : 0);
        const usdMicros = microsPerSecond * payload.duration;
        console.log(`💵 preço do provedor: "${text}" ⇒ ${payload.duration}s × ${rates[0]} = US$${(usdMicros / 1e6).toFixed(4)}`);
        return { ok: true as const, usdMicros };
    }
    async submit(...args: Parameters<HiggsfieldClient['submit']>) {
        try {
            return await super.submit(...args);
        } catch (e) {
            console.log(`↪ resposta do provedor: ${e instanceof Error ? e.message : String(e)}`);
            throw e;
        }
    }
}

async function video(keyframeFile: string, sceneId: string, prompt: string) {
    guard(KLING_5S_USD);
    const client = new PricedClient(env('HF_API_KEY'), '1080p');
    const mime = keyframeFile.endsWith('.png') ? 'png' : 'jpeg';
    const anchor = `data:image/${mime};base64,${readFileSync(keyframeFile).toString('base64')}`;
    const ledgerDir = LEDGER_DIR;
    const remaining = PILOT_CAP_USD - spentUsd();
    const record0 = await launchHiggsfieldScene({
        jobId: 'pilot-20261124', sceneId, attempt: 1, anchor, prompt, duration: 5, sound: 'on',
        client, model: 'kling-video/v3.0/pro/image-to-video', ledgerDir,
        capMicros: Math.min(30_000_000, Math.floor(remaining * 1_000_000)),
        persistRequest: (r) => writeFileSync(path.join(OUT_DIR, `${sceneId}.request.json`), JSON.stringify(r, null, 2)),
        log: (m) => console.log(m),
    });
    record({ kind: 'higgsfield-kling-3.0-pro-5s', usd: record0.reservedUsdMicros / 1_000_000, sceneId, requestId: record0.requestId, note: 'reserva cotada (cobrança confirmada no término)' });
    const result = await pollHiggsfieldScene({ record: record0, client, ledgerDir, log: (m) => console.log(m) });
    const mp4 = await fetch(result.outputUrl, { signal: AbortSignal.timeout(120_000) });
    if (!mp4.ok) throw new Error(`download HTTP ${mp4.status}`);
    const out = path.join(OUT_DIR, `${sceneId}.mp4`);
    writeFileSync(out, Buffer.from(await mp4.arrayBuffer()));
    console.log(`ok ${out} (${result.charge}) | gasto acumulado US$${spentUsd().toFixed(3)}`);
}

const [cmd, ...args] = process.argv.slice(2);
const run = cmd === 'keyframe'
    ? keyframe(args[0] as 'boomer' | 'kev', path.resolve(args[1]), path.resolve(args[2]), args[3] ?? 'neutral, talking')
    : cmd === 'video'
        ? video(path.resolve(args[0]), args[1], args[2] ?? '')
        : Promise.reject(new Error('uso: keyframe|video ...'));
run.catch((e) => { console.error(`ERRO: ${e instanceof Error ? e.message : e}`); process.exit(1); });
