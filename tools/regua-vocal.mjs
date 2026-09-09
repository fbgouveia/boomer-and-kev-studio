// BK-18 — Régua vocal: gera amostras A/B/C para julgamento às cegas do Felipe.
//
// Rotas:
//   B (TTS atual)      — ElevenLabs com voiceSettingsFor() canônico (idêntico ao pipeline).
//   C (TTS dirigido)   — ElevenLabs com direção revisada por emoção (stability/style afinados).
//   A (Kling nativo)   — Kling v2.6 com generate_audio:true e fala literal no prompt (PAGO por clipe).
//
// Contrato da sessão: orçamento autorizado US$1–3. A rota A é a cara (vídeo) —
// gera apenas 2 amostras (1 por personagem) para leitura direcional; o set completo
// de 6 clipes Kling só com reforço de orçamento.
//
// Saída: review_frames/regua-vocal/ (fora do git) com áudio normalizado (-16 LUFS),
// rótulos cegos (S1..Sn embaralhados) e CHAVE.json separada. Read-only fora da pasta.
//
// Uso: node tools/regua-vocal.mjs [--tts-only] [--skip-existing]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvConfig(project, true, { info() {}, error() {} });

const args = new Set(process.argv.slice(2));
const TTS_ONLY = args.has('--tts-only');
const SKIP_EXISTING = args.has('--skip-existing');

const OUT_DIR = path.resolve(project, '..', '..', 'review_frames', 'regua-vocal');
const RAW_DIR = path.join(OUT_DIR, 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

const ELEVEN_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Seis falas: três por personagem, cobrindo explosão, sarcasmo, hesitação, reação e punchline.
const FALAS = [
  { id: 'b1', characterId: 'boomer', emotion: 'EXPLOSIVE', label: 'explosão', text: "Absolute STREWTH! Stop scrolling right now!" },
  { id: 'b2', characterId: 'boomer', emotion: 'ENTHUSIASTIC', label: 'convicção', text: "Fair dinkum, this is a game changer!" },
  { id: 'b3', characterId: 'boomer', emotion: 'INTENSE', label: 'punchline', text: "Righto, let's get down to brass tacks!" },
  { id: 'k1', characterId: 'kev', emotion: 'DEADPAN', label: 'sarcasmo', text: "Yeah, nah. Not today, mate." },
  { id: 'k2', characterId: 'kev', emotion: 'SARCASTIC', label: 'reação', text: "Classic Boomer... you're hallucinating again." },
  { id: 'k3', characterId: 'kev', emotion: 'RESIGNED', label: 'hesitação', text: "Can we wrap this up? I've got a leaf with my name on it." },
];

// BK-18: direção revisada por emoção (rota C). A rota B usa os settings canônicos do pack.
const DIRECAO_REVISADA = {
  EXPLOSIVE: { stability: 0.20, style: 0.90 },
  ENTHUSIASTIC: { stability: 0.30, style: 0.80 },
  INTENSE: { stability: 0.35, style: 0.75 },
  DEADPAN: { stability: 0.65, style: 0.35 },
  SARCASTIC: { stability: 0.55, style: 0.50 },
  RESIGNED: { stability: 0.70, style: 0.30 },
};

const CHARACTERS = {
  boomer: { voiceId: 'IKne3meq5aSn9XLyUdCD', modelId: 'eleven_multilingual_v2', base: { stability: 0.30, style: 0.70, similarityBoost: 0.75, speakerBoost: true }, anchor: '/assets/master_boomer.png' },
  kev: { voiceId: 'CwhRBWXzGAHq8TQ4Fs17', modelId: 'eleven_multilingual_v2', base: { stability: 0.82, style: 0.15, similarityBoost: 0.80, speakerBoost: true }, anchor: '/assets/master_kev.png' },
};

function log(msg) { console.log(`[régua] ${msg}`); }

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', d => (out += d));
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(`${cmd} saiu com ${code}`))));
    if (opts.timeoutMs) setTimeout(() => { child.kill('SIGKILL'); reject(new Error('timeout')); }, opts.timeoutMs);
  });
}

async function elevenLabsTTS(fala, settings) {
  const character = CHARACTERS[fala.characterId];
  const response = await fetch(`${ELEVEN_URL}/${character.voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY, accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: fala.text,
      model_id: character.modelId,
      voice_settings: { similarity_boost: character.base.similarityBoost, use_speaker_boost: character.base.speakerBoost, ...settings },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs HTTP ${response.status}: ${body.slice(0, 160)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// Rota A: Kling v2.6 COM áudio nativo e fala literal no prompt (o pipeline normal manda false).
async function klingNativo(fala) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN ausente');
  const Replicate = require('replicate');
  const replicate = new Replicate({ auth: token });
  const character = CHARACTERS[fala.characterId];
  const anchorPath = path.join(project, 'public', character.anchor);
  const anchorUri = `data:image/png;base64,${fs.readFileSync(anchorPath).toString('base64')}`;
  const prompt = `CINEMATIC MASTERPIECE. The character looks at the camera and SAYS OUT LOUD, with clear lip movement and natural Australian accent, exactly this line: "${fala.text}" No subtitles, no text on screen. ${fala.label} energy, podcast studio, --ar 9:16 --v 6.0`;
  // SDK resolve model -> versão publicada (a API raw exige hash de version).
  const prediction = await replicate.predictions.create({
    model: 'kwaivgi/kling-v2.6',
    input: { prompt, duration: 5, aspect_ratio: '9:16', start_image: anchorUri, generate_audio: true },
  });
  log(`A/${fala.id} predição ${prediction.id} lançada — polling (pago, ~$0.5)...`);
  for (let attempt = 0; attempt < 90; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    const state = await replicate.predictions.get(prediction.id);
    if (state.status === 'succeeded') {
      const url = Array.isArray(state.output) ? state.output[0] : state.output;
      if (typeof url !== 'string') throw new Error('output inesperado');
      const video = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      return Buffer.from(await video.arrayBuffer());
    }
    if (state.status === 'failed' || state.status === 'canceled') throw new Error(`predição falhou: ${state.error || state.status}`);
  }
  throw new Error(`polling timeout: ${prediction.id}`);
}

function loudnorm16(inputPath, outputPath) {
  // Normaliza escuta: mesma loudness para julgamento justo (sem viés de volume).
  return run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', outputPath], { timeoutMs: 120_000 });
}

// ---- Execução ----
const samples = []; // {sampleId, route, falaId}
const spend = { tts: 0, kling: 0 };

for (const fala of FALAS) {
  // Rota B — TTS atual (settings canônicos do pack)
  const bOut = path.join(RAW_DIR, `B_${fala.id}.mp3`);
  if (!SKIP_EXISTING || !fs.existsSync(bOut)) {
    const buffer = await elevenLabsTTS(fala, CHARACTERS[fala.characterId].base);
    fs.writeFileSync(bOut, buffer);
    spend.tts += fala.text.length;
  }
  samples.push({ route: 'B', falaId: fala.id, file: `B_${fala.id}.mp3` });
  log(`B/${fala.id} ok`);

  // Rota C — TTS dirigido
  const cOut = path.join(RAW_DIR, `C_${fala.id}.mp3`);
  if (!SKIP_EXISTING || !fs.existsSync(cOut)) {
    const buffer = await elevenLabsTTS(fala, DIRECAO_REVISADA[fala.emotion]);
    fs.writeFileSync(cOut, buffer);
    spend.tts += fala.text.length;
  }
  samples.push({ route: 'C', falaId: fala.id, file: `C_${fala.id}.mp3` });
  log(`C/${fala.id} ok`);
}

// Rota A — Kling nativo: 1 fala por personagem (leitura direcional dentro do orçamento).
if (!TTS_ONLY) {
  for (const falaId of ['b1', 'k1']) {
    const fala = FALAS.find(f => f.id === falaId);
    const aOut = path.join(RAW_DIR, `A_${fala.id}.mp4`);
    if (SKIP_EXISTING && fs.existsSync(aOut)) { samples.push({ route: 'A', falaId: fala.id, file: `A_${fala.id}.mp4` }); continue; }
    const buffer = await klingNativo(fala);
    fs.writeFileSync(aOut, buffer);
    spend.kling += 1;
    samples.push({ route: 'A', falaId: fala.id, file: `A_${fala.id}.mp4` });
    log(`A/${fala.id} ok`);
  }
}

// Normalização + rótulos cegos.
const seed = Date.now();
const shuffled = [...samples]
  .map(s => ({ s, k: (seed * 1103515245 + samples.indexOf(s) * 12345) % 2147483647 }))
  .sort((a, b) => a.k - b.k)
  .map(x => x.s);

const manifest = [];
let n = 0;
for (const sample of shuffled) {
  n += 1;
  const blindName = `S${String(n).padStart(2, '0')}`;
  const ext = sample.file.endsWith('.mp4') ? 'mp4' : 'mp3';
  const blindPath = path.join(OUT_DIR, `${blindName}.${ext}`);
  await loudnorm16(path.join(RAW_DIR, sample.file), blindPath);
  manifest.push({ sample: blindName, file: `${blindName}.${ext}` });
  log(`${blindName} normalizado (-16 LUFS)`);
}

const chave = {
  advertencia: 'NÃO LER ANTES DO JULGAMENTO — contém o mapa cego',
  geradoEm: new Date().toISOString(),
  seed,
  orcamento: { ttsChars: spend.tts, klingClipes: spend.kling },
  falas: FALAS,
  mapa: manifest.map((m, i) => ({ sample: m.sample, ...shuffled[i] })),
};
fs.writeFileSync(path.join(OUT_DIR, 'CHAVE.json'), JSON.stringify(chave, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildPlayer(manifest));

log(`CONCLUÍDO: ${manifest.length} amostras cegas em ${OUT_DIR}`);
log(`Gasto: ${spend.kling} clipe(s) Kling + ${spend.tts} chars TTS (dentro do teto autorizado).`);
log('Julgamento: abrir index.html, ouvir, anotar preferências; CHAVE.json só depois.');

function buildPlayer(manifest) {
  const items = manifest.map(m => `
  <div class="card">
    <h2>${m.sample}</h2>
    <audio controls preload="none" src="${m.file}"></audio>
    <p class="note">Julgue: identidade do personagem · excentricidade · humor · inteligibilidade · timing</p>
  </div>`).join('\n');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Régua Vocal — Julgamento Cego</title>
<style>body{background:#09090b;color:#fff;font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:32px}
h1{color:#FF5F1F}.card{background:#111;border:2px solid #FF5F1F;padding:16px;margin:16px 0;border-radius:4px}
audio{width:100%}.note{color:#999;font-size:13px}</style></head><body>
<h1>🎬 RÉGUA VOCAL — JULGAMENTO CEGO</h1>
<p>Ouça cada amostra SEM saber quem é quem. Anote: melhor para Boomer, melhor para Kev, e quais rejeitaria. A chave está em CHAVE.json (abra só depois).</p>${items}</body></html>`;
}
