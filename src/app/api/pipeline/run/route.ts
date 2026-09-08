import { NextResponse } from 'next/server';
import { existsSync, writeFileSync, mkdirSync, readFileSync, copyFileSync, unlinkSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import Replicate from 'replicate';
import { z } from 'zod';
import { CHARACTERS, STUDIO_SETTING, SHOT_TYPES, ANGLE_SPECS, voiceSettingsFor } from '@/data/characters';
import { fetchWithTimeout } from '@/lib/fetch-retry';
import { querySupabase } from '@/lib/supabase';
import { cleanupPipelineIntermediates, getSceneCheckpoint, validateSceneArtifacts, probeAudioDuration } from '@/lib/pipeline-storage';
import {
  pipelineConfigHash,
  acquireResumeLease,
  releaseResumeLease,
  refreshResumeLease,
  evaluateResume,
} from '@/lib/resume-policy';
import { fetchPredictionOutcome, reconciliationAction, reconcileProviderRequests } from '@/lib/reconciliation';
import { buildEditingPlan, klingDurationForAudio, type EditingPlan } from '@/lib/editing-policy';
import { buildAssSubtitles, type CaptionCue } from '@/lib/captions';

import { runPipelineSchema } from '@/lib/validations';

const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const jobIdSchema = z.string().uuid();
const workerInstanceId = crypto.randomUUID();
// Runs em curso NESTE processo: um job ativo tem um único executor autorizado.
const activeRuns = new Set<string>();

type SceneProviderRequest = {
  provider: string;
  model: string;
  predictionId: string;
  launchedAt: string;
};

type IdempotencyRecord = {
  jobId: string;
  payloadHash: string;
  createdAt: string;
};

function replayIdempotentJob(idempotencyPath: string, payloadHash: string, tmpDir: string) {
  if (!existsSync(idempotencyPath)) return null;

  const existing = JSON.parse(readFileSync(idempotencyPath, 'utf8')) as IdempotencyRecord;
  if (existing.payloadHash !== payloadHash) {
    return NextResponse.json({
      error: "IDEMPOTENCY_CONFLICT",
      details: "A mesma chave já foi usada com outro payload."
    }, { status: 409 });
  }

  const existingJobPath = path.resolve(tmpDir, `job_${existing.jobId}.json`);
  if (!existsSync(existingJobPath)) {
    return NextResponse.json({
      error: "IDEMPOTENCY_STATE_MISSING",
      details: "A reserva existe, mas o estado do job não foi encontrado."
    }, { status: 409 });
  }

  return NextResponse.json({
    status: "QUEUED",
    jobId: existing.jobId,
    statusUrl: `/api/pipeline/run?id=${existing.jobId}`,
    replayed: true
  });
}

function writeJsonAtomic(filePath: string, value: unknown) {
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { flag: 'wx' });
    renameSync(temporaryPath, filePath);
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}

// FFmpeg Video Assembly function
type Target = { width: number; height: number; fps: number };
// Dimensões de saída por formato. Quando os clipes já vêm no aspect escolhido
// (âncora recortada + aspect_ratio do Kling), o scale/crop abaixo é normalização,
// não decepa — o crop só gutava quando o aspect do clipe ≠ do alvo (bug antigo).
const aspectTarget = (aspect: string): Target =>
  aspect === '16:9' ? { width: 1920, height: 1080, fps: 30 } : { width: 1080, height: 1920, fps: 30 };

async function assembleVideo(
  clips: string[],
  outPath: string,
  target: Target,
  editingPlan?: Pick<EditingPlan, 'transitions' | 'comedyCues'>,
  subtitlesPath?: string,
): Promise<string> {
  if (!clips.length) throw new Error('assembleVideo: nenhum clipe fornecido');
  for (const c of clips) {
    if (!existsSync(c)) throw new Error(`clipe não encontrado: ${c}`);
  }
  const durs = await Promise.all(clips.map(probeDuration));
  const transitions = editingPlan?.transitions;

  const norm = clips.map((_, i) =>
    `[${i}:v]scale=${target.width}:${target.height}:force_original_aspect_ratio=increase,` +
    `crop=${target.width}:${target.height},setsar=1,fps=${target.fps}[v${i}]`
  );

  let filter: string;
  let duration: number;

  if (transitions && transitions.length === clips.length - 1 && clips.length > 1) {
    // WP 1.7: cadeia de xfade/acrossfade com offsets pelas durações REAIS (ffprobe).
    const anorm = clips.map((_, i) => `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`);

    let vPrev = 'v0', aPrev = 'a0', elapsed = durs[0];
    const chain: string[] = [];
    for (let i = 1; i < clips.length; i++) {
      const t = transitions[i - 1];
      const offset = Math.max(0.1, elapsed - t.dur).toFixed(3);
      const vOut = i === clips.length - 1 ? 'outv' : `vx${i}`;
      const aOut = i === clips.length - 1 ? 'outa' : `ax${i}`;
      chain.push(`[${vPrev}][v${i}]xfade=transition=${t.type}:duration=${t.dur}:offset=${offset}[${vOut}]`);
      chain.push(`[${aPrev}][a${i}]acrossfade=d=${Math.max(0.04, t.dur)}[${aOut}]`);
      vPrev = vOut; aPrev = aOut;
      elapsed = elapsed - t.dur + durs[i];
    }
    duration = elapsed;
    filter = [...norm, ...anorm, ...chain].join(';');
  } else {
    // Fallback: concat original (corte seco em tudo)
    const concatIn = clips.map((_, i) => `[v${i}][${i}:a]`).join('');
    duration = durs.reduce((sum, dur) => sum + dur, 0);
    filter = `${norm.join(';')};${concatIn}concat=n=${clips.length}:v=1:a=1[outv][outa]`;
  }

  const audioDir = path.resolve(process.cwd(), 'public/assets/audio');
  const bed = path.resolve(audioDir, 'Funny_Song.mp3');
  const drums = path.resolve(audioDir, 'Joke_Comedy_Drums.mp3');
  const laugh = path.resolve(audioDir, 'Hilarious_Laugh.mp3');
  const hasComedyMix = [bed, drums, laugh].every(existsSync);
  const comedyInputs = hasComedyMix ? [bed, drums, laugh] : [];
  const audioMap = hasComedyMix ? '[finala]' : '[outa]';

  if (hasComedyMix) {
    const bedIndex = clips.length;
    const drumsIndex = bedIndex + 1;
    const laughIndex = bedIndex + 2;
    const sceneStartMs = (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, durs.length - 1));
      const rawStart = durs.slice(0, safeIndex).reduce((sum, dur) => sum + dur, 0);
      const overlap = editingPlan?.transitions
        .slice(0, safeIndex)
        .reduce((sum, transition) => sum + transition.dur, 0) || 0;
      return Math.round(Math.max(0, rawStart - overlap) * 1000);
    };
    const drumsDelay = editingPlan ? sceneStartMs(editingPlan.comedyCues.drumsSceneIndex) : Math.round(duration * 0.42 * 1000);
    const laughDelay = editingPlan ? sceneStartMs(editingPlan.comedyCues.laughSceneIndex) : Math.round(duration * 0.72 * 1000);
    filter +=
      `;[outa]asplit=2[voice][key]` +
      `;[${bedIndex}:a]aloop=loop=-1:size=2147483647,atrim=duration=${duration.toFixed(3)},volume=0.22[bed]` +
      `;[bed][key]sidechaincompress=threshold=0.025:ratio=10:attack=15:release=350[ducked]` +
      `;[${drumsIndex}:a]atrim=duration=2.8,volume=0.72,adelay=${drumsDelay}:all=1[drums]` +
      `;[${laughIndex}:a]atrim=duration=2.4,volume=0.55,adelay=${laughDelay}:all=1[laugh]` +
      `;[voice][ducked][drums][laugh]amix=inputs=4:duration=longest:normalize=0,` +
      `loudnorm=I=-14:LRA=7:TP=-2[finala]`;
  }

  // BK-06: burn-in das legendas aplicado à saída final (não aos clipes) — um único
  // passo de subtitles após toda a montagem, com binário que tenha libass. Escape
  // ffmpeg: ':' -> '\:'; sem aspas externas porque spawn não passa por shell.
  const captionFfmpeg = subtitlesPath && existsSync(subtitlesPath) ? ffmpegWithSubtitles() : null;
  const videoOutLabel = subtitlesPath && existsSync(subtitlesPath) && captionFfmpeg
    ? (() => {
        const escaped = subtitlesPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
        filter += `;[outv]subtitles=${escaped}[subv]`;
        return '[subv]';
      })()
    : '[outv]';

  const args = [
    '-y',
    ...clips.flatMap((c) => ['-i', c]),
    ...comedyInputs.flatMap((c) => ['-i', c]),
    '-filter_complex', filter,
    '-map', videoOutLabel, '-map', audioMap,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-shortest',
    outPath,
  ];

  return new Promise((resolve, reject) => {
    // BK-06: se há legendas, usa o binário com libass; senão o ffmpeg padrão.
    const ffmpegBin = (subtitlesPath && existsSync(subtitlesPath) && ffmpegWithSubtitles()) || 'ffmpeg';
    const ff = spawn(ffmpegBin, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', (code) =>
      code === 0 ? resolve(outPath) : reject(new Error(`ffmpeg saiu com código ${code}`))
    );
  });
}

// Prompt generator helper (a cópia em page.tsx é só p/ exportar PDF; quem renderiza é esta).
// `aspect` importa: em 9:16 a âncora enviada ao Kling é SOLO (o two-shot lado-a-lado não cabe,
// ver escolha da anchorImage abaixo). Pedir "shows both characters" com uma âncora de um só faz
// o Kling INVENTAR o segundo personagem sem referência — infidelidade de personagem. Achado 30/07.
const SOLO_SHOTS_IN_VERTICAL = new Set(['WIDE', 'OTS_BOOMER', 'GOPRO_FISHEYE']);

export const getDetailedPrompt = (line: any, directorIdea = "Trending News", directorSnippet = "", sceneIndex = 0, wardrobe?: { boomer?: string, kev?: string, studio?: string }, aspect: '9:16' | '16:9' = '9:16') => {
  const char = CHARACTERS.find(c => c.id === line.characterId);
  const shot = SHOT_TYPES.find(s => s.id === line.shotType);

  if (!char) return "";

  // Em 9:16 esses planos viram solo vertical: mesma cena, mas enquadrando UM personagem.
  const forceSolo = aspect === '9:16' && !!shot && SOLO_SHOTS_IN_VERTICAL.has(shot.id);

  let angleSpec = ANGLE_SPECS.main;
  if (shot?.id === 'WIDE') angleSpec = ANGLE_SPECS.wide;
  else if (shot?.id.includes('CU')) angleSpec = ANGLE_SPECS.close;
  else if (shot?.id.includes('OTS')) angleSpec = ANGLE_SPECS.side;
  else if (shot?.id === 'GOPRO_FISHEYE') angleSpec = ANGLE_SPECS.wide;
  if (forceSolo) angleSpec = ANGLE_SPECS.main;

  let outfitBase = `Wearing ${char.defaultOutfit}.`;
  if (wardrobe && line.characterId === 'boomer' && wardrobe.boomer) {
    outfitBase = `Wearing ${wardrobe.boomer}.`;
  } else if (wardrobe && line.characterId === 'kev' && wardrobe.kev) {
    outfitBase = `Wearing ${wardrobe.kev}.`;
  }
  const directorialOverride = directorSnippet ? ` CRITICAL_DIRECTORIAL_OVERRIDE: ${directorSnippet}. Ensure all visual details like jerseys and text are prioritized.` : '';
  const characterAnchor = `${char.imagePromptContext}. ${outfitBase}${directorialOverride} Visual DNA: ${char.visualDescription}. Physicality: ${char.personality}.`;

  const anthropomorphicDirective = `ANTHROPOMORPHIC ACTING: This character is an animal but acts, sits, and gesticulates EXACTLY like a human podcast host. Extremely human-like posture, human-like hand gestures, interacting with the environment like a human. They must look like a person wearing a hyper-realistic animal head.`;

  const personalityLogic = line.characterId === 'boomer'
    ? "hyper-active muscle tension, leaning aggressively into the microphone, intense eye contact"
    : "deadpan low-energy, slow heavy blinking, relaxed posture, indifferent expression";

  const actionBlock = `BEHAVIOR: ${line.action}. ${personalityLogic}. EMOTION: ${line.emotion}. Talking actively into the microphone, lips articulating words clearly and naturally.`;

  // Em vertical, sobrescreve a regra do plano: o SHOT_TYPES fala em "shows both characters" /
  // "over Kev's shoulder at Boomer", e isso contradiz a âncora solo que o Kling recebe.
  const cameraRule = forceSolo
    ? `vertical solo framing on ${char.name} ONLY — no second host in frame, single subject centered, head and shoulders fully inside the frame, never cropped at the top`
    : shot?.cinematicRule;
  const cameraBlock = `Highly photorealistic, 8k RAW, movie grade textures, cinematic depth, subsurface scattering on fur, ray-traced lighting, masterpiece. CAMERA: ${forceSolo ? `${shot?.label} (vertical solo)` : shot?.label}, ${cameraRule}. ${angleSpec.desc}, ${angleSpec.requirements.join(', ')}.`;

  let activeProps = STUDIO_SETTING.props.filter(p => !p.includes(line.characterId === 'boomer' ? 'Tablet' : 'Gloves')).slice(0, 4).join(', ');
  let tvGraphics = directorIdea;

  // Emphasize sponsor integration in scenes 3 and 4 (0-indexed, so the 4th and 5th scenes)
  if (sceneIndex === 3 || sceneIndex === 4) {
    activeProps = "prominently displayed energy drink cans with bright logos, sponsored branded merch on the desk, " + activeProps;
    tvGraphics = "HUGE SPONSOR LOGO, bright commercial advertisement";
  }

  let envBlock = `ENVIRONMENT: ${STUDIO_SETTING.promptContext}. Visible props: ${activeProps}. TV screen graphics: ${tvGraphics}. Lighting: ${char.lightingKey}. Ambience: ${STUDIO_SETTING.acousticPanels}.`;
  if (wardrobe && wardrobe.studio) {
    envBlock += ` SPECIAL STUDIO DECOR: ${wardrobe.studio}.`;
  }

  // WP 1.6: cada clipe deve parecer um TRECHO de transmissão contínua, não um vídeo com início/fim.
  const continuityDirective = `CONTINUITY: This is a segment of an ONGOING live podcast broadcast. The character is ALREADY mid-conversation when the shot begins — no settling in, no greeting gesture, no looking for position. The shot ENDS mid-energy, as if the camera simply cut away; never a wrap-up pose, never a fade-out feeling.`;

  // --ar seguia cravado em 9:16 mesmo com o formato 16:9 selecionado (achado 30/07).
  return `CINEMATIC MASTERPIECE. ${characterAnchor} ${anthropomorphicDirective} ${actionBlock} ${continuityDirective} ${cameraBlock} ${envBlock} --ar ${aspect} --v 6.0`;
};

// BK-06: o binário ffmpeg precisa de libass (filtro subtitles). O ffmpeg padrão do
// Homebrew vem sem; ffmpeg-full tem. Detecção uma vez por processo, com fallback
// ordenado. null => sem burn-in (render segue, aviso explícito no job).
let captionCapableFfmpeg: string | null | undefined;
function ffmpegWithSubtitles(): string | null {
  if (captionCapableFfmpeg !== undefined) return captionCapableFfmpeg;
  const candidates = [
    process.env.FFMPEG_PATH,
    '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
    '/usr/local/opt/ffmpeg-full/bin/ffmpeg',
    'ffmpeg',
  ].filter(Boolean) as string[];
  for (const bin of candidates) {
    try {
      const out = spawnSync(bin, ['-hide_banner', '-filters'], { timeout: 10_000 });
      if (out.status === 0 && out.stdout.toString().includes('subtitles')) {
        captionCapableFfmpeg = bin;
        return captionCapableFfmpeg;
      }
    } catch { /* tenta o próximo */ }
  }
  captionCapableFfmpeg = null;
  return captionCapableFfmpeg;
}

// Replicate polling helper
async function pollPrediction(replicate: Replicate, predictionId: string, maxAttempts = 60): Promise<any> {  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prediction = await replicate.predictions.get(predictionId);
    if (prediction.status === 'succeeded') {
      return prediction.output;
    }
    if (prediction.status === 'failed') {
      throw new Error(`Prediction failed: ${prediction.error || 'Unknown error'}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Prediction timed out: ${predictionId}`);
}

// Kling create com retry no 429. Com < $5 de crédito o Replicate cai p/ 6/min
// (burst 1); como os creates já são sequenciais, honrar retry_after pauta os
// lançamentos na cadência permitida em vez de estourar. N tentativas → propaga.
async function createKlingPrediction(replicate: Replicate, input: any, maxRetries = 6): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await replicate.predictions.create({ model: "kwaivgi/kling-v2.6", input });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const is429 = msg.includes('429') || msg.toLowerCase().includes('throttled');
      if (!is429 || attempt >= maxRetries) throw e;
      const m = msg.match(/retry_after"?\s*[:=]\s*(\d+)/);
      const waitS = m ? parseInt(m[1], 10) + 1 : 12; // +1s de folga
      await new Promise(r => setTimeout(r, waitS * 1000));
    }
  }
}

// Kling herda o aspect da start_image, não do param aspect_ratio. Para o formato
// (9:16/16:9) valer de verdade, a âncora local é recortada via ffmpeg pro aspect
// escolhido e vira data URI. Remoto/ausente → devolve como está.
// `focusX` (0..1) diz ONDE está o personagem: o recorte centrado assumia o sujeito no
// meio da arte, o que corta quem está fora do centro (caso do Kev). Ver Character.anchorFocusX.
// clip() prende o recorte dentro da imagem: focus perto das bordas não gera x negativo nem
// estoura a largura — degrada para o recorte flush na borda. Exportado só para teste.
export function anchorCropFilter(aspect: '9:16' | '16:9', focusX = 0.5): string {
  if (aspect === '16:9') return `crop=iw:'min(ih,iw*9/16)'`;
  const fx = Math.min(1, Math.max(0, Number.isFinite(focusX) ? focusX : 0.5));
  return `crop='min(iw,ih*9/16)':ih:'clip(iw*${fx.toFixed(4)}-ow/2,0,iw-ow)':0`;
}

async function reframeAnchorToAspect(assetUrl: string | undefined, aspect: '9:16' | '16:9', tmpDir: string, tag: string, focusX = 0.5): Promise<string | undefined> {
  if (!assetUrl) return undefined;
  if (!assetUrl.startsWith('/')) return assetUrl;
  const src = path.join(process.cwd(), 'public', assetUrl);
  if (!existsSync(src)) return undefined;
  const out = path.resolve(tmpDir, `anchor_${tag}.jpg`);
  const crop = anchorCropFilter(aspect, focusX);
  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-i', src, '-vf', crop, '-frames:v', '1', out], { stdio: ['ignore', 'ignore', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', (c) => (c === 0 && existsSync(out)) ? resolve() : reject(new Error(`reframe âncora falhou (${tag})`)));
  });
  return `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`;
}

// WP 1.6/1.7 helpers ─────────────────────────────────────────────────────────

// Duração real de um clipe (ffprobe) — necessária p/ calcular offsets do xfade.
function probeDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const fp = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath]);
    let out = '';
    fp.stdout.on('data', (d) => (out += d));
    fp.on('error', reject);
    fp.on('close', (code) => {
      const dur = parseFloat(out.trim());
      code === 0 && dur > 0 ? resolve(dur) : reject(new Error(`ffprobe falhou p/ ${videoPath}`));
    });
  });
}

// Último frame de um clipe como data URI (jpg) — vira start_image da cena seguinte.
function extractLastFrameDataUri(videoPath: string, tmpDir: string, tag: string): Promise<string> {
  const framePath = path.resolve(tmpDir, `lastframe_${tag}.jpg`);
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-sseof', '-0.15', '-i', videoPath, '-frames:v', '1', '-q:v', '2', framePath],
      { stdio: ['ignore', 'ignore', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code !== 0 || !existsSync(framePath)) return reject(new Error(`extração de último frame falhou (${tag})`));
      resolve(`data:image/jpeg;base64,${readFileSync(framePath).toString('base64')}`);
    });
  });
}

// Background Job Worker
async function processPipeline(
  jobId: string,
  script: any[],
  directorIdea: string,
  directorSnippet: string,
  aspect: '9:16' | '16:9',
  wardrobe?: { boomer?: string, kev?: string, studio?: string },
  voiceIds?: { boomer?: string, kev?: string }
) {
  const target = aspectTarget(aspect);
  const tmpDir = path.resolve(process.cwd(), '.tmp');
  const jobFilePath = path.resolve(tmpDir, `job_${jobId}.json`);
  // BK-16: identifica a etapa da falha — o estado final diz ONDE o job parou,
  // e a retomada refaz só o necessário a partir dos checkpoints.
  let currentStage = 'startup';
  // BK-17 (parcial local): predições pagas persistidas ANTES do polling —
  // se o processo cair depois da cobrança, o resultado incerto fica conservado
  // no estado do job em vez de sumir com a memória do worker.
  let providerRequests: Record<string, SceneProviderRequest> = {};
  // BK-17 (incremento 1): ledger de estado por cena — o estado do job diz quais
  // cenas têm áudio/vídeo prontos mesmo após falha ou reinício.
  let sceneStates: Record<string, string> = {};
  try {
    const existingState = JSON.parse(readFileSync(jobFilePath, 'utf8'));
    providerRequests = existingState.providerRequests || {};
    sceneStates = existingState.sceneStates || {};
  } catch { /* job novo sem estado prévio */ }

  const markScene = (sceneId: string, state: 'AUDIO_READY' | 'VIDEO_READY') => {
    sceneStates = { ...sceneStates, [sceneId]: state };
    updateJob({ sceneStates });
  };

  const updateJob = (updates: any) => {
    try {
      const currentData = JSON.parse(readFileSync(jobFilePath, 'utf8'));
      const newData = {
        ...currentData,
        ...updates,
        updatedAt: new Date().toISOString(),
        logs: [...currentData.logs, ...(updates.logs || [])]
      };
      writeJsonAtomic(jobFilePath, newData);
      // Heartbeat do lease: o dono vivo atualiza o prazo; silence longo não expira
      // o lease desde que abaixo do TTL.
      refreshResumeLease(tmpDir, jobId, workerInstanceId);
    } catch (e) {
      console.error("Failed to write job status file:", e);
    }
  };

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const replicate = replicateToken ? new Replicate({ auth: replicateToken }) : null;
  let episodeRegistered = false;

  try {
    // VOICE_GATE começa pelas precondições locais: não cria episódio fantasma
    // quando a configuração já prova que nenhuma cena poderá ser sintetizada.
    if (!elevenLabsKey) {
      throw new Error("VOICE_GATE: ELEVENLABS_API_KEY ausente — run cancelado antes de persistir ou gastar render.");
    }

    // Write to Supabase if configured
    try {
      await querySupabase('episodes', {
        method: 'POST',
        useServiceRole: true,
        body: JSON.stringify({
          id: jobId,
          topic: directorIdea || "Trending News",
          director_idea: directorIdea,
          director_snippet: directorSnippet,
          status: 'draft',
          script_json: script
        })
      });
      episodeRegistered = true;
      updateJob({ logs: ["[Supabase] Episode successfully queued in cloud database."] });
    } catch (e: any) {
      updateJob({ logs: [`[Supabase] DB registration bypassed: ${e.message}`] });
    }

    updateJob({ progress: 10, logs: ["🧬 INJECTING_CHARACTER_DNA_PROMPTS..."] });

    // Step 1a: VOICE GATE — TODAS as vozes sintetizadas ANTES de qualquer render.
    // Decisão Felipe 19/07 (doutrina Deriva: degradar calado, nunca): voz falhou →
    // o run FALHA aqui, com US$0 gastos em Kling, em vez de gerar vídeo mudo "com sucesso".
    currentStage = 'voice_gate';
    const audioByScene = new Map<string, string>();
    // BK-16 (fala inteira): duração real do áudio por cena — dimensiona o clipe
    // do Kling em vez de confiar na estimativa do roteiro.
    const audioDurations = new Map<string, number>();

    for (let i = 0; i < script.length; i++) {
      const line = script[i];
      const index = i + 1;

      // BK-05: Checkpoint de áudio — se já foi sintetizado para este job, reutiliza sem gastar ElevenLabs.
      // BK-16: só reutiliza após validar conteúdo (ffprobe) — arquivo não vazio não é mídia íntegra.
      const checkpoint = getSceneCheckpoint(tmpDir, jobId, line.id);
      if (checkpoint.audioExists && checkpoint.audioPath) {
        const validated = await validateSceneArtifacts(checkpoint);
        if (validated.audioValid && validated.audioPath) {
          const buffer = readFileSync(validated.audioPath);
          audioByScene.set(line.id, `data:audio/mpeg;base64,${buffer.toString('base64')}`);
          const measured = await probeAudioDuration(validated.audioPath);
          if (measured !== null) audioDurations.set(line.id, measured);
          markScene(line.id, 'AUDIO_READY');
          updateJob({ logs: [`♻️ [Scene ${index}] Checkpoint áudio: sintetização prévia validada e reutilizada (ElevenLabs pulado).`] });
          continue;
        }
        // Checkpoint corrompido/parcial: descarta e ressintetiza — nunca mistura mídia inválida.
        try { unlinkSync(checkpoint.audioPath); } catch { /* já removido */ }
        updateJob({ logs: [`⚠️ [Scene ${index}] Checkpoint áudio inválido (corrompido/vazio) — ressintetizando.`] });
      }

      const character = CHARACTERS.find(c => c.id === line.characterId);
      if (!character) {
        throw new Error(`VOICE_GATE: personagem '${line.characterId}' desconhecido (cena ${index}).`);
      }
      // BK-16: voiceId editado na Engine DNA (interface) é efetivo na execução.
      const voiceId = voiceIds?.[line.characterId as 'boomer' | 'kev'] || character.voiceId;
      if (!voiceId) {
        throw new Error(`VOICE_GATE: personagem '${line.characterId}' sem voiceId (cena ${index}) — run cancelado antes de gastar render.`);
      }

      updateJob({ logs: [`🔊 [Scene ${index}] Requesting ElevenLabs audio (voice: ${voiceId === character.voiceId ? 'canônica' : 'override da interface'})...`] });
      let response: Response;
      try {
        response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey,
            'accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: line.text,
            model_id: character.voice.modelId,
            voice_settings: voiceSettingsFor(character, line.emotion),
          }),
        }, 60_000);
      } catch (e: any) {
        throw new Error(`VOICE_GATE: ElevenLabs inacessível na cena ${index} (${e.message}) — run cancelado antes de gastar render.`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VOICE_GATE: ElevenLabs HTTP ${response.status} na cena ${index}: ${errorText.substring(0, 120)} — run cancelado antes de gastar render.`);
      }

      const buffer = await response.arrayBuffer();
      audioByScene.set(line.id, `data:audio/mpeg;base64,${Buffer.from(buffer).toString('base64')}`);
      const sceneAudioPath = path.resolve(tmpDir, `audio_${jobId}_${line.id}.mp3`);
      writeFileSync(sceneAudioPath, Buffer.from(buffer));
      const measured = await probeAudioDuration(sceneAudioPath);
      if (measured !== null) audioDurations.set(line.id, measured);
      markScene(line.id, 'AUDIO_READY');
      updateJob({ logs: [`✅ [Scene ${index}] Voice synthesized successfully.`] });
    }

    updateJob({ progress: 25, logs: ["✅ VOICE_GATE_PASSED: todas as vozes prontas. Liberando renders."] });

    // Step 1b: Kling Launch — só executa com o gate de voz 100% verde
    currentStage = 'video_generation';
    const scenesToProcess = [];

    for (let i = 0; i < script.length; i++) {
      const line = script[i];
      const sceneId = line.id;
      const index = i + 1;
      const audioDataUri = audioByScene.get(line.id)!;

      // BK-05: Checkpoint de vídeo — se já foi renderizado e sincronizado, reutiliza sem gastar Kling/Replicate.
      // BK-16: só reutiliza após validar conteúdo (ffprobe) — checkpoint corrompido é descartado e re-renderizado.
      const checkpoint = getSceneCheckpoint(tmpDir, jobId, sceneId);
      if (checkpoint.videoExists && checkpoint.videoPath) {
        const validated = await validateSceneArtifacts(checkpoint);
        if (validated.videoValid && validated.videoPath) {
          updateJob({ logs: [`♻️ [Scene ${index}] Checkpoint vídeo: render prévio validado e reutilizado (Kling pulado).`] });
          markScene(sceneId, 'VIDEO_READY');
          continue;
        }
        try { unlinkSync(checkpoint.videoPath); } catch { /* já removido */ }
        updateJob({ logs: [`⚠️ [Scene ${index}] Checkpoint vídeo inválido (corrompido/parcial) — re-renderizando.`] });
      }

      // 1b. Video Generation (Kling)
      let videoUrl = "";
      const isSandbox = !replicate;

      // BK-17: reconciliação de predições incertas ANTES de repetir cobrança.
      // Sucesso => reutiliza o resultado pago; processando => retoma polling;
      // falha confirmada => nova predição; incerto/indisponível => run para
      // (PROVIDER_UNKNOWN), nunca predição nova às cegas.
      const pendingRequest = providerRequests[sceneId];
      if (replicate && pendingRequest?.predictionId) {
        const outcome = await fetchPredictionOutcome(replicate, pendingRequest.predictionId);
        const action = reconciliationAction(outcome);
        if (action === 'REUSE') {
          updateJob({ logs: [`🛟 [Scene ${index}] Predição paga reconciliada: SUCESSO no provedor — resultado reutilizado (Kling novo NÃO lançado).`] });
          scenesToProcess.push({
            sceneId, index, predictionId: pendingRequest.predictionId,
            audioDataUri, status: "PROCESSING",
            reconciledUrl: outcome.kind === 'succeeded' ? outcome.outputUrl : undefined
          });
          continue;
        }
        if (action === 'KEEP_POLLING') {
          updateJob({ logs: [`⏳ [Scene ${index}] Predição paga ainda processando no provedor — polling retomado sem nova cobrança.`] });
          scenesToProcess.push({ sceneId, index, predictionId: pendingRequest.predictionId, audioDataUri, status: "PROCESSING" });
          continue;
        }
        if (action === 'RELAUNCH') {
          updateJob({ logs: [`⚠️ [Scene ${index}] Predição paga confirmada como FALHA pelo provedor (${outcome.kind === 'failed' ? outcome.error : 'sem detalhe'}) — lançando nova predição.`] });
          delete providerRequests[sceneId];
          updateJob({ providerRequests });
        }
        if (action === 'RECONCILE_UNAVAILABLE') {
          throw new Error(`PROVIDER_UNKNOWN: não foi possível reconciliar a predição paga ${pendingRequest.predictionId} (${outcome.kind === 'unknown' ? outcome.reason : 'desconhecido'}). Run interrompido para evitar cobrança duplicada — reconcilie e retome.`);
        }
      }

      // WP 1.6: mesma personagem em cenas consecutivas → a cena N+1 nasce do último
      // frame da cena N (continuidade real). O launch é ADIADO p/ o Step 2, quando o
      // clipe anterior já existe. Troca de personagem = corte de câmera (âncora normal).
      const chainFrom = i > 0 && script[i - 1].characterId === line.characterId ? script[i - 1].id : null;

      if (replicate && chainFrom) {
        updateJob({ logs: [`🔗 [Scene ${index}] Encadeada à anterior (mesmo personagem) — launch adiado p/ herdar o último frame.`] });
        scenesToProcess.push({
          sceneId, index, predictionId: null as string | null, audioDataUri, status: "CHAINED",
          chainFrom,
          launch: { prompt: getDetailedPrompt(line, directorIdea, directorSnippet, i, wardrobe, aspect), duration: klingDurationForAudio(audioDurations.get(sceneId), line.durationEst <= 5 ? 5 : 10) }
        });
        continue;
      }

      if (replicate) {
        try {
          updateJob({ logs: [`🎬 [Scene ${index}] Launching Kling v2.6 prediction on Replicate...`] });
          const prompt = getDetailedPrompt(line, directorIdea, directorSnippet, i, wardrobe, aspect);
          const character = CHARACTERS.find(c => c.id === line.characterId);
          
          // WP 1.5: em 16:9, cenas que mostram os DOIS (WIDE/OTS) ancoram no two-shot master.
          // Em 9:16 o two-shot lado-a-lado NÃO cabe → usa a âncora solo do personagem.
          // ponytail: two-shot vertical de verdade (OTS/empilhado) exige arte nova — P0a item 4.
          // Mesma regra do prompt (SOLO_SHOTS_IN_VERTICAL): two-shot so em 16:9. Se estas duas
          // condicoes divergirem, o prompt volta a pedir dois personagens com ancora de um.
          // BK-16: referência escolhida na interface (Engine DNA) é efetiva — vence a canônica.
          const anchorImage = line.characterReference
            || (aspect === '16:9' && (line.shotType === 'WIDE' || line.shotType === 'OTS_BOOMER')
              ? '/assets/master_wide.png'
              : character?.referenceImage);

          // O two-shot (16:9) nao tem dono: usa o centro. Ancora solo herda o foco do personagem.
          const anchorFocusX = anchorImage === character?.referenceImage ? character?.anchorFocusX : undefined;
          const startImage = await reframeAnchorToAspect(anchorImage, aspect, tmpDir, `${jobId}_${sceneId}`, anchorFocusX);
          if (line.characterReference && line.characterReference !== character?.referenceImage) {
            updateJob({ logs: [`🎨 [Scene ${index}] Referência de personagem da interface em uso (não canônica).`] });
          }

          // BK-16 (fala inteira): clipe Kling dimensionado pelo áudio REAL medido —
          // áudio > 5s pede clipe de 10s; -shortest no mux não corta mais a fala.
          const klingDuration = klingDurationForAudio(audioDurations.get(sceneId), line.durationEst <= 5 ? 5 : 10);
          if (klingDuration === 10 && (line.durationEst <= 5)) {
            updateJob({ logs: [`⏱️ [Scene ${index}] Áudio real excede 5s — clipe Kling de 10s para fala inteira.`] });
          }

          const prediction = await createKlingPrediction(replicate, {
            prompt: prompt,
            duration: klingDuration,
            aspect_ratio: aspect,
            start_image: startImage,
            negative_prompt: "morphing, anatomical mutations, bare hands, human fingers, extra fingers, deformed gloves, missing clothes, naked, shirtless, bad anatomy, deformed limbs",
            generate_audio: false
          });

          // Persiste a predição paga ANTES do polling: queda após cobrança deixa
          // o ID conservado no estado do job p/ reconciliação (não retry cego).
          providerRequests[sceneId] = {
            provider: 'replicate',
            model: 'kwaivgi/kling-v2.6',
            predictionId: prediction.id,
            launchedAt: new Date().toISOString(),
          };
          updateJob({ providerRequests });

          scenesToProcess.push({
            sceneId,
            index,
            predictionId: prediction.id,
            audioDataUri,
            status: "PROCESSING"
          });
        } catch (e: any) {
          // BK-16: com Replicate configurado, falha de launch é falha real —
          // sem piloto silencioso. Estado identifica a etapa; intermediários
          // preservados no finally para retomada.
          throw new Error(`[Scene ${index}] Kling launch failed (${currentStage}): ${e.message}`);
        }
      }

      if (isSandbox) {
        // Fallback: Copy pilot video
        const pilotPath = path.resolve(process.cwd(), '../00_Legacy_Archives/Piloto', `cena${(i % 4) + 1}.mp4`);
        const targetPath = path.resolve(tmpDir, `sync_${jobId}_${sceneId}.mp4`);
        if (existsSync(pilotPath)) {
          copyFileSync(pilotPath, targetPath);
          updateJob({ logs: [`✅ [Scene ${index}] Sandbox active. Copied pilot video cena${(i % 4) + 1}.mp4.`] });
        } else {
          // Produção não tem os pilotos — falha limpa e acionável (não fingir sandbox).
          throw new Error(`[Scene ${index}] Kling não gerou e não há piloto de fallback (produção). Causa provável: crédito/rate-limit do Replicate — recarregue o saldo.`);
        }
      }
    }

    // Step 2: Poll Kling video generations and trigger LipSync
    currentStage = 'video_poll';
    updateJob({ progress: 40 });

    const finalClipPaths: string[] = [];

    // Process each real scene sequentially or concurrently
    for (const scene of scenesToProcess) {
      try {
        // WP 1.6: cena encadeada — o clipe anterior já foi processado neste loop
        // sequencial; extrai o último frame dele e SÓ AGORA lança o Kling.
        if (!scene.predictionId && scene.chainFrom && scene.launch) {
          const prevClip = path.resolve(tmpDir, `sync_${jobId}_${scene.chainFrom}.mp4`);
          updateJob({ logs: [`🔗 [Scene ${scene.index}] Extraindo último frame da cena anterior p/ continuidade...`] });
          const frameUri = await extractLastFrameDataUri(prevClip, tmpDir, `${jobId}_${scene.sceneId}`);
          const prediction = await createKlingPrediction(replicate!, {
            prompt: scene.launch.prompt,
            duration: scene.launch.duration,
            aspect_ratio: aspect,
            start_image: frameUri,
            negative_prompt: "morphing, anatomical mutations, bare hands, human fingers, extra fingers, deformed gloves, missing clothes, naked, shirtless, bad anatomy, deformed limbs",
            generate_audio: false
          });
          scene.predictionId = prediction.id;
          providerRequests[scene.sceneId] = {
            provider: 'replicate',
            model: 'kwaivgi/kling-v2.6',
            predictionId: prediction.id,
            launchedAt: new Date().toISOString(),
          };
          updateJob({ providerRequests });
        }

        if (!scene.predictionId) throw new Error(`cena ${scene.index}: sem predictionId (launch encadeado falhou?)`);
        let klingVideoUrl: string;
        if ('reconciledUrl' in scene && scene.reconciledUrl) {
          klingVideoUrl = scene.reconciledUrl;
          updateJob({ logs: [`🛟 [Scene ${scene.index}] Resultado reconciliado do provedor em uso (polling pulado).`] });
        } else {
          updateJob({ logs: [`⏳ [Scene ${scene.index}] Polling Kling video generation...`] });
          const output = await pollPrediction(replicate!, scene.predictionId);
          klingVideoUrl = Array.isArray(output) ? output[0] : output;
        }
        updateJob({ logs: [`✅ [Scene ${scene.index}] Kling video generated: ${klingVideoUrl}`] });

        // Wav2Lip removido (decisão 06/08 §P0): lipsync descartado por decisão do Felipe —
        // o episódio régua (oatmilk.mp4) nunca teve lipsync e os clipes do Kling articulam mais.
        // Cada cena poupava 1 prediction paga que falhava sempre (compute + latência queimados).
        const syncVideoUrl = klingVideoUrl;

        // Download final synced video to local disk
        currentStage = 'download';
        updateJob({ logs: [`📥 [Scene ${scene.index}] Downloading scene video...`] });
        const videoResponse = await fetchWithTimeout(syncVideoUrl, {}, 120_000);
        if (!videoResponse.ok) {
          throw new Error(`download HTTP ${videoResponse.status}`);
        }
        const videoBuffer = await videoResponse.arrayBuffer();
        const scenePath = path.resolve(tmpDir, `kling_${jobId}_${scene.sceneId}.mp4`);
        writeFileSync(scenePath, Buffer.from(videoBuffer));

        const finalScenePath = path.resolve(tmpDir, `sync_${jobId}_${scene.sceneId}.mp4`);
        const audioPath = path.resolve(tmpDir, `audio_${jobId}_${scene.sceneId}.mp3`);

        // Sem lipsync: sempre multiplexa o áudio TTS por cima do clipe do Kling.
        currentStage = 'mux';
        updateJob({ logs: [`🎵 [Scene ${scene.index}] Multiplexing audio and video locally...`] });
        await new Promise((resolve, reject) => {
            const args = ['-y', '-i', scenePath];

            if (existsSync(audioPath)) {
              args.push('-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0?', '-map', '1:a:0', '-shortest');
            } else {
              args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0?', '-map', '1:a:0', '-shortest');
            }
            args.push(finalScenePath);

            const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
            ff.on('error', reject);
            ff.on('close', (code) =>
              code === 0 ? resolve(finalScenePath) : reject(new Error(`ffmpeg multiplex exited with code ${code}`))
            );
        });

        finalClipPaths.push(finalScenePath);
        markScene(scene.sceneId, 'VIDEO_READY');
        updateJob({ logs: [`✅ [Scene ${scene.index}] Scene completed & saved.`] });
      } catch (err: any) {
        // BK-16: falha real com provedor configurado — estado identifica a etapa
        // e a causa; sem substituição silenciosa por piloto. Intermediários e
        // checkpoints ficam preservados no finally para retomada.
        updateJob({ logs: [`❌ [Scene ${scene.index}] Falha real em ${currentStage}: ${err.message}. Job interrompido; checkpoints preservados para retomada.`] });
        throw err;
      }
    }

    // Reúne todos os clipes na ordem estrita do roteiro (1..N), garantindo que checkpoints e novos renders fiquem ordenados
    finalClipPaths.length = 0;
    for (let i = 0; i < script.length; i++) {
      const sceneId = script[i].id;
      const scenePath = path.resolve(tmpDir, `sync_${jobId}_${sceneId}.mp4`);
      if (existsSync(scenePath) && statSync(scenePath).size > 0) {
        finalClipPaths.push(scenePath);
      } else {
        throw new Error(`Cena ${i + 1} (${sceneId}) não gerou vídeo sincronizado válido para a montagem.`);
      }
    }

    // Step 3: Run Video Assembly (FFmpeg merge)
    currentStage = 'assembly';
    updateJob({ progress: 85, logs: ["🎬 LAUNCHING_FFMPEG_VIDEO_ASSEMBLER...", "STITCHING_SCENES_AND_NORMALIZING_AUDIO..."] });

    const finalVideoPath = path.resolve(tmpDir, `final_${jobId}.mp4`);

    // BK-06: legendas burn-in — spec canônica (branco, contorno 3px, keyword laranja,
    // centro-inferior). Cues derivados do roteiro: cada cena ocupa o intervalo do
    // clipe correspondente; sem quebrar o render se algo falhar (legenda é acabamento).
    const subtitlesPath = path.resolve(tmpDir, `captions_${jobId}.ass`);
    try {
      const durations = await Promise.all(finalClipPaths.map(probeDuration));
      let elapsed = 0;
      const captionCues: CaptionCue[] = [];
      for (let i = 0; i < finalClipPaths.length; i++) {
        const line = script[i];
        const start = elapsed;
        elapsed += durations[i];
        if (!line?.text) continue;
        // Fala dividida em blocos legíveis (~7 palavras por cue).
        const words = line.text.split(/\s+/).filter(Boolean);
        const chunkSize = 7;
        const chunks: string[][] = [];
        for (let w = 0; w < words.length; w += chunkSize) chunks.push(words.slice(w, w + chunkSize));
        const sceneSpan = Math.max(0.5, durations[i] - 0.2);
        chunks.forEach((chunk, chunkIdx) => {
          const chunkStart = start + 0.1 + (sceneSpan * chunkIdx) / chunks.length;
          const chunkEnd = start + 0.1 + (sceneSpan * (chunkIdx + 1)) / chunks.length;
          captionCues.push({
            start: chunkStart,
            end: Math.min(chunkEnd, start + durations[i] - 0.05),
            text: chunk.join(' '),
          });
        });
      }
      if (captionCues.length) {
        writeFileSync(subtitlesPath, buildAssSubtitles(captionCues, target.width, target.height));
        const captionFfmpeg = ffmpegWithSubtitles();
        if (!captionFfmpeg) {
          updateJob({ logs: [`⚠️ [Captions] ${captionCues.length} cues gerados, mas o ffmpeg local não tem libass (filtro subtitles). Instale ffmpeg-full ou defina FFMPEG_PATH — render segue SEM burn-in.`] });
        } else {
          updateJob({ logs: [`💬 [Captions] ${captionCues.length} cues gerados (spec canônica) — burn-in via ${captionFfmpeg === 'ffmpeg' ? 'ffmpeg' : path.basename(path.dirname(path.dirname(captionFfmpeg)))}.`] });
        }
      }
    } catch (captionError) {
      updateJob({ logs: [`⚠️ [Captions] Falha ao gerar legendas — render segue sem burn-in: ${captionError instanceof Error ? captionError.message : String(captionError)}`] });
    }

    // Constituição de edição: beats, transições e SFX derivam do roteiro.
    const editingPlan = finalClipPaths.length === script.length
      ? buildEditingPlan(script)
      : undefined;
    if (editingPlan) {
      updateJob({ logs: [
        `🧭 Beats: ${editingPlan.beats.join(' → ')}`,
        `🎞️ Transições: ${editingPlan.transitions.map(t => `${t.type}${t.dur >= 0.1 ? '' : '(corte)'}`).join(' → ')}`,
        `🔊 SFX por beat: rufo=cena ${editingPlan.comedyCues.drumsSceneIndex + 1}, risada=cena ${editingPlan.comedyCues.laughSceneIndex + 1}`,
      ] });
    }

    await assembleVideo(finalClipPaths, finalVideoPath, target, editingPlan, existsSync(subtitlesPath) ? subtitlesPath : undefined);

    let finalVideoUrl = `/api/pipeline/download?id=${jobId}`;
    let delivery: 'cloud' | 'local' = 'local';
    try {
      currentStage = 'delivery';
      const fileBuffer = readFileSync(finalVideoPath);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceRole) {
        updateJob({ logs: ["☁️ UPLOADING_TO_SUPABASE_STORAGE..."] });
        const res = await fetchWithTimeout(`${supabaseUrl}/storage/v1/object/videos/${jobId}.mp4`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRole}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            'Content-Type': 'video/mp4'
          },
          body: fileBuffer
        }, 60_000);
        
        if (res.ok) {
          finalVideoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${jobId}.mp4`;
          delivery = 'cloud';
          updateJob({ logs: ["✅ UPLOAD_SUCCESSFUL. Entrega em cloud storage confirmada."] });
        } else {
          const errText = await res.text();
          updateJob({ logs: [`⚠️ UPLOAD_FAILED: ${errText}. Entrega LOCAL explícita (não é entrega cloud): ${finalVideoUrl}`] });
        }
      }
    } catch (e: any) {
      updateJob({ logs: [`⚠️ UPLOAD_ERROR: ${e.message}. Entrega LOCAL explícita (não é entrega cloud): ${finalVideoUrl}`] });
    }

    // Update Supabase episode state
    try {
      await querySupabase(`episodes?id=eq.${jobId}`, {
        method: 'PATCH',
        useServiceRole: true,
        body: JSON.stringify({
          status: 'assembled',
          video_url: finalVideoUrl
        })
      });
      updateJob({ logs: ["[Supabase] Episode row updated to 'assembled' state."] });
    } catch (e: any) {
      console.warn("[Supabase] Failed to update episode row:", e.message);
    }

    // Done! BK-16: a entrega real (cloud vs local) fica explícita no estado.
    updateJob({
      status: "COMPLETED",
      progress: 100,
      delivery,
      logs: ["🎉 PIPELINE_ASSEMBLY_COMPLETE. FINAL_VIDEO_RENDERED_SUCCESSFULLY."],
      finalVideoUrl
    });

  } catch (error: any) {
    console.error("MAESTRO_PIPELINE_CRASH:", error);

    if (episodeRegistered) {
      try {
        await querySupabase(`episodes?id=eq.${jobId}`, {
          method: 'PATCH',
          useServiceRole: true,
          body: JSON.stringify({
            status: 'failed'
          })
        });
      } catch (e: any) {
        console.warn("[Supabase] Failed to mark episode as failed in DB:", e.message);
      }
    }

    const uncertainPredictions = Object.entries(providerRequests)
      .map(([sceneId, request]) => `${sceneId}:${request.predictionId}`);
    updateJob({
      status: "FAILED",
      progress: 0,
      failureStage: currentStage,
      logs: [
        `🔴 CRITICAL_PIPELINE_ERROR em ${currentStage}: ${error.message}`,
        ...(uncertainPredictions.length
          ? [`⚠️ PREDICTIONS UNCERTAIN (pagas, resultado não reconciliado — consultar antes de re-renderizar): ${uncertainPredictions.join(', ')}`]
          : [])
      ]
    });
  } finally {
    activeRuns.delete(jobId);
    releaseResumeLease(tmpDir, jobId);
    try {
      // BK-05: Só remove intermediários se o job terminou com sucesso (COMPLETED).
      // Se falhou, os intermediários são preservados para permitir retomada do checkpoint!
      const currentJobState = existsSync(jobFilePath)
        ? JSON.parse(readFileSync(jobFilePath, 'utf8'))
        : null;

      if (currentJobState?.status === 'COMPLETED') {
        const removed = cleanupPipelineIntermediates(tmpDir, jobId);
        if (removed.length) {
          console.log(`[Pipeline Cleanup] Removed ${removed.length} intermediate files for completed job ${jobId}.`);
        }
      } else {
        console.log(`[Pipeline Checkpoint] Job ${jobId} não concluiu com sucesso; intermediários preservados para retomada.`);
      }
    } catch (cleanupError) {
      console.warn(`[Pipeline Cleanup] Failed for ${jobId}:`, cleanupError);
    }
  }
}

// Next.js API Handlers
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const validation = runPipelineSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json({ error: "INVALID_INPUT_SIGNAL", details: validation.error.format() }, { status: 400 });
    }

    const approval = validation.data.approval;
    if (!approval) {
      return NextResponse.json({ error: "RENDER_APPROVAL_REQUIRED" }, { status: 403 });
    }

    const keyValidation = idempotencyKeySchema.safeParse(req.headers.get('idempotency-key'));
    if (!keyValidation.success) {
      return NextResponse.json({
        error: "IDEMPOTENCY_KEY_REQUIRED",
        details: "Envie Idempotency-Key com 16-128 caracteres seguros."
      }, { status: 400 });
    }

    const { script, directorIdea = "", directorSnippet = "", engine = "kling", aspect = "9:16", wardrobe, resumeJobId } = validation.data;

    // Create .tmp directory
    const tmpDir = path.resolve(process.cwd(), '.tmp');
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }

    const keyHash = crypto.createHash('sha256').update(keyValidation.data).digest('hex');
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(validation.data)).digest('hex');
    const idempotencyPath = path.resolve(tmpDir, `idempotency_${keyHash}.json`);
    const replay = replayIdempotentJob(idempotencyPath, payloadHash, tmpDir);
    if (replay) return replay;

    const approvalAgeMs = Date.now() - Date.parse(approval.approvedAt);
    if (approvalAgeMs < -60_000 || approvalAgeMs > 10 * 60_000) {
      return NextResponse.json({ error: "RENDER_APPROVAL_EXPIRED" }, { status: 403 });
    }

    const isResume = Boolean(resumeJobId);
    const jobId = resumeJobId || crypto.randomUUID();
    const jobFilePath = path.resolve(tmpDir, `job_${jobId}.json`);

    if (isResume) {
      if (!existsSync(jobFilePath)) {
        return NextResponse.json({
          error: "RESUME_JOB_NOT_FOUND",
          details: `O job ${jobId} para retomada não existe no storage local.`
        }, { status: 404 });
      }

      const existingData = JSON.parse(readFileSync(jobFilePath, 'utf8'));
      if (existingData.status === 'COMPLETED') {
        return NextResponse.json({
          status: "COMPLETED",
          jobId,
          finalVideoUrl: existingData.finalVideoUrl,
          replayed: true
        });
      }

      // BK-16: retomada usa a versão aprovada. Roteiro/voz/aspecto/referências/
      // figurino diferentes = conflito explícito (nova versão ou job novo), nunca
      // mistura de cache antigo com payload novo.
      const configHash = pipelineConfigHash(validation.data);
      const decision = evaluateResume(
        existingData,
        { configHash },
        { isRunActive: activeRuns.has(jobId) },
      );
      if (decision.action === 'conflict') {
        return NextResponse.json({
          error: decision.code,
          details: decision.code === 'RESUME_CONFIG_CONFLICT'
            ? "O roteiro/voz/aspecto/referências mudaram desde o job original. Crie um novo job (nova versão) em vez de retomar com conteúdo alterado."
            : "Este job já tem um executor ativo. Aguarde a conclusão ou a reconciliação do worker atual."
        }, { status: 409 });
      }

      // Exclusividade entre processos: lease atômico em disco. De dois resumes
      // simultâneos, no máximo um vira executor.
      const lease = acquireResumeLease(tmpDir, jobId, workerInstanceId);
      if (!lease.acquired) {
        return NextResponse.json({
          error: "RESUME_ACTIVE_WORKER",
          details: "Outro executor assumiu este job neste momento (lease ativo). Não há segundo worker."
        }, { status: 409 });
      }

      const resumeJobState = {
        ...existingData,
        status: "PROCESSING",
        configHash,
        workerInstanceId,
        updatedAt: new Date().toISOString(),
        logs: [
          ...(Array.isArray(existingData.logs) ? existingData.logs : []),
          `🔄 RESUMING_PIPELINE_FROM_CHECKPOINT...`,
          `JOB_ID: ${jobId}`
        ]
      };
      writeJsonAtomic(jobFilePath, resumeJobState);
    } else {
      const idempotencyRecord: IdempotencyRecord = {
        jobId,
        payloadHash,
        createdAt: new Date().toISOString()
      };

      try {
        writeFileSync(idempotencyPath, JSON.stringify(idempotencyRecord, null, 2), { flag: 'wx' });
      } catch (error) {
        const fileError = error as NodeJS.ErrnoException;
        if (fileError.code !== 'EEXIST') throw error;
        return replayIdempotentJob(idempotencyPath, payloadHash, tmpDir)!;
      }

      const now = new Date().toISOString();
      const initialJobState = {
        id: jobId,
        status: "PROCESSING",
        progress: 0,
        logs: ["🚀 PIPELINE_ORCHESTRATOR_TRIGGERED.", `JOB_ID: ${jobId}`],
        engine,
        // BK-16: identidade da versão aprovada — retomadas com conteúdo diferente
        // são rejeitadas por comparação de hash, não por confiança do cliente.
        configHash: pipelineConfigHash(validation.data),
        providerRequests: {},
        workerInstanceId,
        createdAt: now,
        updatedAt: now,
        finalVideoUrl: null
      };

      try {
        if (existsSync(jobFilePath)) throw new Error(`Job file collision: ${jobId}`);
        writeJsonAtomic(jobFilePath, initialJobState);
      } catch (error) {
        unlinkSync(idempotencyPath);
        throw error;
      }
    }

    // Fire background task
    activeRuns.add(jobId);
    processPipeline(jobId, script, directorIdea, directorSnippet, aspect, wardrobe, validation.data.voiceIds).catch(err => {
      console.error(`Uncaught background task error for job ${jobId}:`, err);
    });

    return NextResponse.json({
      status: isResume ? "RESUMING" : "QUEUED",
      jobId,
      statusUrl: `/api/pipeline/run?id=${jobId}`
    });

  } catch (error) {
    console.error("PIPELINE_RUN_API_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const idValidation = jobIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: "INVALID_JOB_ID" }, { status: 400 });
    }

    const jobFilePath = path.resolve(process.cwd(), '.tmp', `job_${idValidation.data}.json`);
    if (!existsSync(jobFilePath)) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let jobData = JSON.parse(readFileSync(jobFilePath, 'utf8'));
    if (jobData.status === 'PROCESSING' && jobData.workerInstanceId !== workerInstanceId) {
      // BK-16: reconciliação de estado — o worker original morreu com o restart do
      // processo. O job é marcado FAILED (sem retry automático), mas os artefatos
      // e checkpoints são PRESERVADOS: retomada valida e reutiliza o que já foi pago.
      const uncertainPredictions = Object.entries(jobData.providerRequests || {})
        .map(([sceneId, request]) => `${sceneId}:${(request as SceneProviderRequest).predictionId}`);
      // BK-17 (incremento 2): se há credencial do provedor, reconcilia AGORA —
      // o operador vê o destino de cada predição paga no próprio status.
      let reconciliationLogs: string[] = [];
      if (uncertainPredictions.length && process.env.REPLICATE_API_TOKEN) {
        try {
          const reconciled = await reconcileProviderRequests(
            new Replicate({ auth: process.env.REPLICATE_API_TOKEN }),
            jobData.providerRequests || {},
          );
          reconciliationLogs = Object.values(reconciled).map((r) =>
            `🔎 RECONCILED ${r.sceneId}:${r.predictionId} => ${r.action}${r.detail ? ` (${r.detail})` : ''}`
          );
        } catch (reconcileError) {
          console.warn(`[Pipeline Status] Reconciliação falhou para ${idValidation.data}:`, reconcileError);
          reconciliationLogs = [`⚠️ RECONCILE_UNAVAILABLE: não foi possível consultar as predições pagas agora.`];
        }
      }
      jobData = {
        ...jobData,
        status: 'FAILED',
        progress: 0,
        failureCode: 'WORKER_RESTARTED',
        failureStage: 'reconciliation',
        updatedAt: new Date().toISOString(),
        logs: [
          ...(Array.isArray(jobData.logs) ? jobData.logs : []),
          '🔴 WORKER_RESTARTED: o processo original não existe mais; job encerrado sem retry automático.',
          '♻️ Checkpoints e intermediários preservados para retomada com reuso validado.',
          ...reconciliationLogs,
          ...(uncertainPredictions.length && !reconciliationLogs.length
            ? [`⚠️ PREDICTIONS UNCERTAIN (pagas, resultado não reconciliado — consultar antes de re-renderizar): ${uncertainPredictions.join(', ')}`]
            : [])
        ]
      };
      writeJsonAtomic(jobFilePath, jobData);
      // O dono anterior do lease está morto (provado acima): libera para a retomada.
      releaseResumeLease(path.resolve(process.cwd(), '.tmp'), idValidation.data);
    }
    return NextResponse.json(jobData);

  } catch (error) {
    console.error("PIPELINE_STATUS_API_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}
