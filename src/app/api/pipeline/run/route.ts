import { NextResponse } from 'next/server';
import { existsSync, writeFileSync, mkdirSync, readFileSync, copyFileSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import Replicate from 'replicate';
import { z } from 'zod';
import { STUDIO_SETTING, SHOT_TYPES, ANGLE_SPECS, voiceSettingsFor } from '@/data/characters';
import { resolveCharacter } from '@/lib/cast-registry';
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
import { writeJsonAtomic, mergeJobUpdate } from '@/lib/pipeline-job-state';
import {
  resolveVideoProviderConfig,
  VideoProviderConfigError,
  DEFAULT_HIGGSFIELD_MODEL,
  LEGACY_REPLICATE_MODEL,
  type FrozenVideoProviderConfig,
  type VideoProviderName,
} from '@/lib/video-provider';
import {
  HiggsfieldClient,
  validateMediaUrl,
  type HiggsfieldSound,
} from '@/lib/higgsfield';
import { budgetCapMicrosFromEnv, chargeCost, readBudgetSummary, releaseCost } from '@/lib/cost-ledger';
import { formatUsd } from '@/lib/money';
import {
  HiggsfieldSceneError,
  fetchHiggsfieldOutcomeOrNull,
  launchHiggsfieldScene,
  planHiggsfieldRecovery,
  pollHiggsfieldScene,
  reconcileHiggsfieldRequests,
  resubmitHiggsfieldScene,
  type HiggsfieldSceneRequest,
} from '@/lib/higgsfield-scene';

import { runPipelineSchema, type RunPipelineInput } from '@/lib/validations';
import type { Prediction } from 'replicate';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
type PromptLine = { characterId: string; shotType: string; text: string; action?: string; emotion?: string };
type JobUpdate = Record<string, unknown> & { logs?: string[] };

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

// Item de trabalho do loop de vídeo: predição Replicate (legado) OU geração
// Higgsfield (API direta), com submissão encadeada adiada quando preciso.
type SceneWorkItem = {
  sceneId: string;
  index: number;
  audioDataUri?: string;
  status: 'PROCESSING' | 'CHAINED';
  predictionId?: string | null;
  chainFrom?: string | null;
  launch?: { prompt: string; duration: 5 | 10 };
  hf?: HiggsfieldSceneRequest;
  hfLaunch?: { prompt: string; duration: number; attempt: number; sound: HiggsfieldSound };
  reconciledUrl?: string;
};

type AnySceneRequest = SceneProviderRequest | HiggsfieldSceneRequest;

const isHiggsfieldRequest = (request: AnySceneRequest | undefined | null): request is HiggsfieldSceneRequest =>
  !!request && request.provider === 'higgsfield';

const isReplicateRequest = (request: AnySceneRequest | undefined | null): request is SceneProviderRequest =>
  !!request && request.provider !== 'higgsfield';

// Soma das reservas ativas das cenas Higgsfield (para o topo do job JSON).
const sumHiggsfieldReserves = (requests: Record<string, AnySceneRequest>) =>
  Object.values(requests).reduce(
    (sum, request) => (isHiggsfieldRequest(request) ? sum + request.reservedUsdMicros : sum),
    0,
  );

const describeHiggsfieldError = (error: unknown): string => {
  if (error instanceof HiggsfieldSceneError) {
    const details = Object.entries(error.details).map(([key, value]) => `${key}=${String(value)}`).join(' ');
    return `${error.code}: ${error.message}${details ? ` (${details})` : ''}`;
  }
  return errorMessage(error);
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

// Uma lista só para o launch normal e o encadeado (antes duplicada).
// Sem "missing clothes/naked/shirtless": Boomer (sem camisa) e Kev (só pelagem) são assim
// por design — pedir para evitar "sem roupa" fazia o Kling vestir o Kev (gravata, teste 27/10).
const KLING_NEGATIVE_PROMPT = "morphing, anatomical mutations, bare hands, human fingers, extra fingers, deformed gloves, added clothing, bow tie, necktie, shirt, accessories not in the reference image, bad anatomy, deformed limbs, camera cut, scene change, transition, zoom, camera movement, brand logos, readable text";

export const getDetailedPrompt = (line: PromptLine, directorIdea = "Trending News", directorSnippet = "", sceneIndex = 0, wardrobe?: { boomer?: string, kev?: string, studio?: string }, aspect: '9:16' | '16:9' = '9:16', voiceMode: 'kling_native' | 'elevenlabs' = 'kling_native') => {
  const char = resolveCharacter(line.characterId);
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

  // BK-19: a direção de atuação vem do pack (actingStyle), não de id cravado.
  // Boomer declara 'hyper', Kev declara 'deadpan' — comportamento idêntico ao
  // anterior, mas um elenco novo declara o próprio tom sem editar engine.
  const personalityLogic = (char.actingStyle ?? 'hyper') === 'hyper'
    ? "hyper-active muscle tension, leaning aggressively into the microphone, intense eye contact"
    : "deadpan low-energy, slow heavy blinking, relaxed posture, indifferent expression";

  const actionBlock = `BEHAVIOR: ${line.action}. ${personalityLogic}. EMOTION: ${line.emotion}. Talking actively into the microphone, lips articulating words clearly and naturally.`;

  // BK-18 (régua vocal): no modo nativo a fala vai LITERAL no prompt — é o Kling
  // quem fala (veredito Felipe: S13/S14 venceram). No modo elevenlabs o áudio é
  // sintetizado fora e sobreposto, então o prompt não carrega a fala.
  const speechBlock = voiceMode === 'kling_native'
    ? `SPEECH: The character SAYS OUT LOUD, with clear natural Australian accent and lip articulation, exactly this line: "${line.text}" No subtitles, no on-screen text.`
    : '';

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
  // Teste 27/10: "as if the camera simply cut away" coincidiu com cortes inventados pelo
  // Kling na 2ª metade dos clipes de 10s, e o "cinematic" com zoom lento. Câmera travada:
  // ritmo e cortes são decididos na montagem (corte seco), nunca dentro do clipe.
  const continuityDirective = `CONTINUITY: This is a segment of an ONGOING live podcast broadcast. The character is ALREADY mid-conversation when the shot begins — no settling in, no greeting gesture, no looking for position. ONE single continuous shot from start to end: locked-off static camera on a tripod, no zoom, no push-in, no pan, no camera cuts, no change of angle, no scene change. Same framing in the last frame as in the first frame. The character stays SEATED at the desk for the whole shot: never stands up, walks or leaves the chair.`;

  // --ar seguia cravado em 9:16 mesmo com o formato 16:9 selecionado (achado 30/07).
  return `CINEMATIC MASTERPIECE. ${characterAnchor} ${anthropomorphicDirective} ${actionBlock} ${speechBlock} ${continuityDirective} ${cameraBlock} ${envBlock} --ar ${aspect} --v 6.0`;
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
async function pollPrediction(replicate: Replicate, predictionId: string, maxAttempts = 60): Promise<Prediction['output']> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
async function createKlingPrediction(replicate: Replicate, input: Record<string, unknown>, maxRetries = 6): Promise<Prediction> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await replicate.predictions.create({ model: "kwaivgi/kling-v2.6", input });
    } catch (e) {
      const msg = errorMessage(e);
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

// Entradas visuais de launch COMPARTILHADAS pelos dois provedores: prompt canônico,
// âncora recortada pro aspect (data URI local ou URL remota) e duração pela regra
// de fala 5/10s. Comportamento idêntico ao fluxo Replicate original.
async function resolveSceneLaunchVisuals(args: {
  line: RunPipelineInput['script'][number];
  sceneIndex: number;
  aspect: '9:16' | '16:9';
  directorIdea: string;
  directorSnippet: string;
  wardrobe?: { boomer?: string, kev?: string, studio?: string };
  voiceMode: 'kling_native' | 'elevenlabs';
  audioDuration: number | undefined;
  fallbackDuration: 5 | 10;
  tmpDir: string;
  jobId: string;
  sceneId: string;
}): Promise<{ prompt: string; startImage?: string; duration: 5 | 10; interfaceReferenceUsed: boolean }> {
  const prompt = getDetailedPrompt(args.line, args.directorIdea, args.directorSnippet, args.sceneIndex, args.wardrobe, args.aspect, args.voiceMode);
  const character = resolveCharacter(args.line.characterId);

  // WP 1.5: em 16:9, cenas que mostram os DOIS (WIDE/OTS) ancoram no two-shot master.
  // Em 9:16 o two-shot lado-a-lado NÃO cabe → usa a âncora solo do personagem.
  // BK-16: referência escolhida na interface (Engine DNA) é efetiva — vence a canônica.
  const anchorImage = args.line.characterReference
    || (args.aspect === '16:9' && (args.line.shotType === 'WIDE' || args.line.shotType === 'OTS_BOOMER')
      ? '/assets/master_wide.png'
      : character?.referenceImage);

  // O two-shot (16:9) nao tem dono: usa o centro. Ancora solo herda o foco do personagem.
  const anchorFocusX = anchorImage === character?.referenceImage ? character?.anchorFocusX : undefined;
  const startImage = await reframeAnchorToAspect(anchorImage, args.aspect, args.tmpDir, `${args.jobId}_${args.sceneId}`, anchorFocusX);

  // BK-16 (fala inteira): clipe Kling dimensionado pelo áudio REAL medido.
  const duration = klingDurationForAudio(args.audioDuration, args.fallbackDuration);
  return {
    prompt,
    startImage,
    duration,
    interfaceReferenceUsed: Boolean(args.line.characterReference && args.line.characterReference !== character?.referenceImage),
  };
}

// WP 1.6/1.7 helpers ─────────────────────────────────────────────────────────

// Duração real de um clipe (ffprobe) — necessária p/ calcular offsets do xfade.
// BK-18 (modo nativo): clipe do Kling precisa ter fala audível — checa stream de
// áudio E nível médio (áudio presente porém mudo/silencioso = falha do gate).
function clipHasAudibleAudio(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', filePath], { stdio: ['ignore', 'pipe', 'ignore'] });
    let streams = '';
    probe.stdout.on('data', (d) => (streams += d));
    probe.on('error', () => resolve(false));
    probe.on('close', (code) => {
      if (code !== 0 || !streams.trim()) return resolve(false);
      const vol = spawn('ffmpeg', ['-hide_banner', '-nostats', '-i', filePath, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      vol.stderr.on('data', (d) => (err += d));
      vol.on('error', () => resolve(false));
      vol.on('close', () => {
        const m = err.match(/mean_volume:\s*(-?[\d.]+) dB/);
        resolve(m ? parseFloat(m[1]) > -60 : false);
      });
    });
  });
}

// Síntese TTS de uma cena (voice gate no modo elevenlabs + fallback do modo nativo).
type ScriptLineLike = {
  characterId: string;
  text: string;
  emotion?: string;
};

async function ttsForScene(line: ScriptLineLike, character: NonNullable<ReturnType<typeof resolveCharacter>>, voiceIds?: Record<string, string | undefined>): Promise<Buffer> {
  const voiceId = voiceIds?.[line.characterId] || character.voiceId;
  const response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY || '', 'accept': 'audio/mpeg' } as Record<string, string>,
    body: JSON.stringify({
      text: line.text,
      model_id: character.voice.modelId,
      voice_settings: voiceSettingsFor(character, line.emotion),
    }),
  }, 60_000);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs HTTP ${response.status}: ${errorText.substring(0, 120)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function probeDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const fp = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath]);
    let out = '';
    fp.stdout.on('data', (d) => (out += d));
    fp.on('error', reject);
    fp.on('close', (code) => {
      const dur = parseFloat(out.trim());
      if (code === 0 && dur > 0) resolve(dur);
      else reject(new Error(`ffprobe falhou p/ ${videoPath}`));
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
  script: RunPipelineInput['script'],
  directorIdea: string,
  directorSnippet: string,
  aspect: '9:16' | '16:9',
  wardrobe?: { boomer?: string, kev?: string, studio?: string },
  voiceIds?: Record<string, string | undefined>,
  voiceMode: 'kling_native' | 'elevenlabs' = 'kling_native'
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
  let providerRequests: Record<string, AnySceneRequest> = {};
  // BK-17 (incremento 1): ledger de estado por cena — o estado do job diz quais
  // cenas têm áudio/vídeo prontos mesmo após falha ou reinício.
  let sceneStates: Record<string, string> = {};
  // Provedor congelado na criação do job: retomadas NUNCA trocam de provedor
  // (jobs legados sem o campo continuam no replicate).
  let jobProvider: VideoProviderName = 'replicate';
  let jobModel: string = LEGACY_REPLICATE_MODEL;
  try {
    const existingState = JSON.parse(readFileSync(jobFilePath, 'utf8'));
    providerRequests = existingState.providerRequests || {};
    sceneStates = existingState.sceneStates || {};
    if (existingState.provider === 'higgsfield') jobProvider = 'higgsfield';
    jobModel = typeof existingState.providerModel === 'string' && existingState.providerModel
      ? existingState.providerModel
      : (jobProvider === 'higgsfield' ? DEFAULT_HIGGSFIELD_MODEL : LEGACY_REPLICATE_MODEL);
  } catch { /* job novo sem estado prévio */ }

  const markScene = (sceneId: string, state: 'AUDIO_READY' | 'VIDEO_READY') => {
    sceneStates = { ...sceneStates, [sceneId]: state };
    const completed = Object.values(sceneStates).filter((s) => s === 'VIDEO_READY').length;
    // Progresso por cena como dados para o controle existente (sem tocar UI).
    updateJob({ sceneStates, sceneProgress: { completed, total: script.length } });
  };

  // Persistência CRÍTICA: falha de gravação PROPAGA — chamadas antes/depois de
  // submissão paga não podem fingir checkpoint e lançar geração sem ele.
  const updateJobCritical = (updates: JobUpdate) => {
    const currentData = JSON.parse(readFileSync(jobFilePath, 'utf8'));
    const newData = mergeJobUpdate(currentData, updates);
    writeJsonAtomic(jobFilePath, newData);
    // Heartbeat do lease: o dono vivo atualiza o prazo; silence longo não expira
    // o lease desde que abaixo do TTL.
    refreshResumeLease(tmpDir, jobId, workerInstanceId);
  };

  const updateJob = (updates: JobUpdate) => {
    try {
      updateJobCritical(updates);
    } catch (e) {
      console.error("Failed to write job status file:", e);
    }
  };

  // Persistidor crítico do registro de cena Higgsfield (payload/chave/reserva).
  const makeHiggsfieldPersister = (sceneId: string) => (record: HiggsfieldSceneRequest) => {
    providerRequests[sceneId] = record;
    updateJobCritical({
      providerRequests,
      costReserveUsdMicros: sumHiggsfieldReserves(providerRequests),
    });
  };

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  // Cada job usa SOMENTE o provedor congelado: replicate instanciado apenas
  // quando o job é replicate; cliente HF apenas quando o job é higgsfield.
  const replicate = jobProvider === 'replicate' && replicateToken ? new Replicate({ auth: replicateToken }) : null;
  let hfClient: HiggsfieldClient | null = null;
  let hfCapMicros = 0;
  let episodeRegistered = false;

  try {
    // Configuração do provedor Higgsfield precisa estar íntegra ANTES de qualquer
    // gasto (voz incluída no modo elevenlabs). Sem chave não há fallback pago.
    if (jobProvider === 'higgsfield') {
      const hfApiKey = process.env.HF_API_KEY;
      if (!hfApiKey) {
        throw new Error('PROVIDER_CONFIG: HF_API_KEY ausente para job congelado em higgsfield — sem fallback para Replicate (evita gasto duplicado).');
      }
      hfClient = new HiggsfieldClient({ apiKey: hfApiKey });
      hfCapMicros = budgetCapMicrosFromEnv(process.env);
      const budget = readBudgetSummary(tmpDir, hfCapMicros);
      if (budget.corruptEntries.length) {
        updateJob({ logs: [`⚠️ [Orçamento] ${budget.corruptEntries.length} entrada(s) ilegível(is) no ledger — novas reservas ficam bloqueadas até revisão manual.`] });
      }
      updateJob({ logs: [`🏦 [Orçamento] Testes iniciais Higgsfield: comprometido ${formatUsd(budget.reservedMicros + budget.chargedMicros)} de teto ${formatUsd(budget.capMicros)} (restante ${formatUsd(budget.remainingMicros)}).`] });
      updateJob({ logs: [`🎞️ PROVIDER: higgsfield (modelo ${jobModel}) — congelado neste job.`] });
    }

    // VOICE_GATE (modo elevenlabs) começa pelas precondições locais: não cria
    // episódio fantasma quando a configuração já prova que nenhuma cena poderá ser
    // sintetizada. No modo kling_native (régua BK-18) o Kling fala — não há TTS.
    if (voiceMode === 'elevenlabs' && !elevenLabsKey) {
      throw new Error("VOICE_GATE: ELEVENLABS_API_KEY ausente — run cancelado antes de persistir ou gastar render.");
    }
    if (voiceMode === 'kling_native') {
      updateJob({ logs: ["🎙️ VOICE_MODE: kling_native (régua BK-18) — o Kling fala a fala literal; TTS só como fallback de degradação."] });
    }

    // Write to Supabase if configured
    // BK-18: sem service role a chamada degrada para anon e o RLS rejeita (erro
    // garantido e fútil) — pula com aviso em vez de fazer a chamada inútil.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      updateJob({ logs: ["[Supabase] Sem SUPABASE_SERVICE_ROLE_KEY — registro do episódio pulado (modo local/teste)."] });
    } else {
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
      } catch (e) {
        updateJob({ logs: [`[Supabase] DB registration bypassed: ${errorMessage(e)}`] });
      }
    }

    updateJob({ progress: 10, logs: ["🧬 INJECTING_CHARACTER_DNA_PROMPTS..."] });

    // Step 1a: VOICE GATE (só no modo elevenlabs) — TODAS as vozes sintetizadas
    // ANTES de qualquer render. Decisão Felipe 19/07 (doutrina Deriva: degradar
    // calado, nunca): voz falhou → o run FALHA aqui, com US$0 gastos em Kling, em
    // vez de gerar vídeo mudo "com sucesso". No modo kling_native o Kling fala.
    currentStage = 'voice_gate';
    const audioByScene = new Map<string, string>();
    // BK-16 (fala inteira): duração real do áudio por cena — dimensiona o clipe
    // do Kling em vez de confiar na estimativa do roteiro.
    const audioDurations = new Map<string, number>();

    if (voiceMode === 'elevenlabs') {
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

      const character = resolveCharacter(line.characterId);
      if (!character) {
        throw new Error(`VOICE_GATE: personagem '${line.characterId}' desconhecido (cena ${index}).`);
      }
      // BK-16: voiceId editado na Engine DNA (interface) é efetivo na execução.
      const voiceId = voiceIds?.[line.characterId] || character.voiceId;
      if (!voiceId) {
        throw new Error(`VOICE_GATE: personagem '${line.characterId}' sem voiceId (cena ${index}) — run cancelado antes de gastar render.`);
      }

      updateJob({ logs: [`🔊 [Scene ${index}] Requesting ElevenLabs audio (voice: ${voiceId === character.voiceId ? 'canônica' : 'override da interface'})...`] });
      let buffer: Buffer;
      try {
        buffer = await ttsForScene(line, character, voiceIds);
      } catch (e) {
        throw new Error(`VOICE_GATE: ElevenLabs falhou na cena ${index} (${errorMessage(e)}) — run cancelado antes de gastar render.`);
      }

      audioByScene.set(line.id, `data:audio/mpeg;base64,${buffer.toString('base64')}`);
      const sceneAudioPath = path.resolve(tmpDir, `audio_${jobId}_${line.id}.mp3`);
      writeFileSync(sceneAudioPath, Buffer.from(buffer));
      const measured = await probeAudioDuration(sceneAudioPath);
      if (measured !== null) audioDurations.set(line.id, measured);
      markScene(line.id, 'AUDIO_READY');
      updateJob({ logs: [`✅ [Scene ${index}] Voice synthesized successfully.`] });
    }

    } // fim do gate de voz (modo elevenlabs)
    updateJob({ progress: 25, logs: voiceMode === 'elevenlabs'
      ? ["✅ VOICE_GATE_PASSED: todas as vozes prontas. Liberando renders."]
      : ["✅ VOICE_MODE_NATIVE: sem TTS prévio — o Kling fala em cada cena."] });

    // Step 1b: Kling Launch — só executa com o gate de voz 100% verde
    currentStage = 'video_generation';
    const scenesToProcess: SceneWorkItem[] = [];

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

      // 1b. Video Generation. Sandbox de piloto existe SOMENTE no caminho replicate.
      const isReplicateSandbox = jobProvider === 'replicate' && !replicate;

      // BK-17: reconciliação de predições incertas ANTES de repetir cobrança.
      // Sucesso => reutiliza o resultado pago; processando => retoma polling;
      // falha confirmada => nova predição; incerto/indisponível => run para
      // (PROVIDER_UNKNOWN), nunca predição nova às cegas.
      const pendingRequest = providerRequests[sceneId];
      if (replicate && isReplicateRequest(pendingRequest) && pendingRequest.predictionId) {
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
          launch: { prompt: getDetailedPrompt(line, directorIdea, directorSnippet, i, wardrobe, aspect, voiceMode), duration: klingDurationForAudio(audioDurations.get(sceneId), line.durationEst <= 5 ? 5 : 10) }
        });
        continue;
      }

      if (replicate) {
        try {
          updateJob({ logs: [`🎬 [Scene ${index}] Launching Kling v2.6 prediction on Replicate...`] });
          const visuals = await resolveSceneLaunchVisuals({
            line, sceneIndex: i, aspect, directorIdea, directorSnippet, wardrobe, voiceMode,
            audioDuration: audioDurations.get(sceneId), fallbackDuration: line.durationEst <= 5 ? 5 : 10,
            tmpDir, jobId, sceneId,
          });
          if (visuals.interfaceReferenceUsed) {
            updateJob({ logs: [`🎨 [Scene ${index}] Referência de personagem da interface em uso (não canônica).`] });
          }

          const klingDuration = visuals.duration;
          if (klingDuration === 10 && (line.durationEst <= 5)) {
            updateJob({ logs: [`⏱️ [Scene ${index}] Áudio real excede 5s — clipe Kling de 10s para fala inteira.`] });
          }

          const prediction = await createKlingPrediction(replicate, {
            prompt: visuals.prompt,
            duration: klingDuration,
            aspect_ratio: aspect,
            start_image: visuals.startImage,
            negative_prompt: KLING_NEGATIVE_PROMPT,
            generate_audio: voiceMode === 'kling_native'
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
        } catch (e) {
          // BK-16: com Replicate configurado, falha de launch é falha real —
          // sem piloto silencioso. Estado identifica a etapa; intermediários
          // preservados no finally para retomada.
          throw new Error(`[Scene ${index}] Kling launch failed (${currentStage}): ${errorMessage(e)}`);
        }
      }

      if (jobProvider === 'higgsfield') {
        // ── Caminho Higgsfield (API direta) ──────────────────────────────────
        // Mesmos contratos do caminho replicate: reconciliar antes de repetir
        // cobrança, encadeamento adiado, persistência crítica de payload/chave.
        const pending = isHiggsfieldRequest(pendingRequest) ? pendingRequest : undefined;
        if (pending) {
          const outcome = await fetchHiggsfieldOutcomeOrNull(hfClient!, pending);
          const plan = planHiggsfieldRecovery(pending, outcome);

          if (plan.kind === 'reuse_result') {
            // Concluída no provedor: cobrança confirmada (fica retida no ledger).
            const charge = chargeCost({ ledgerDir: tmpDir, operationKey: pending.operationKey });
            if (charge.kind !== 'charged' && charge.kind !== 'already_charged') {
              updateJob({ logs: [`⚠️ [Orçamento] Sucesso pago de ${sceneId} sem registro cobrável no ledger (${charge.kind}) — revise o ledger manualmente.`] });
            }
            updateJob({ logs: [`🛟 [Scene ${index}] Geração Higgsfield reconciliada: SUCESSO no provedor — resultado reutilizado (nada novo lançado). Cobrança confirmada: ${formatUsd(pending.reservedUsdMicros)}.`] });
            scenesToProcess.push({ sceneId, index, audioDataUri, status: "PROCESSING", hf: pending, reconciledUrl: plan.outputUrl });
            continue;
          }
          if (plan.kind === 'keep_polling') {
            updateJob({ logs: [`⏳ [Scene ${index}] Geração Higgsfield ainda processando no provedor — polling retomado sem nova cobrança.`] });
            scenesToProcess.push({ sceneId, index, audioDataUri, status: "PROCESSING", hf: pending });
            continue;
          }
          if (plan.kind === 'resubmit_same_key') {
            // POST anterior de resultado desconhecido: MESMA chave + MESMO payload
            // persistidos. Nunca chave nova (evitaria cobrança duplicada).
            updateJob({ logs: [`🛟 [Scene ${index}] Submissão Higgsfield incerta (sem requestId) — resubmissão com a MESMA chave/payload persistidos.`] });
            let resubmitted: HiggsfieldSceneRequest | undefined;
            try {
              resubmitted = await resubmitHiggsfieldScene({
                record: pending,
                client: hfClient!,
                ledgerDir: tmpDir,
                capMicros: hfCapMicros,
                persistRequest: makeHiggsfieldPersister(sceneId),
                log: (m) => updateJob({ logs: [m] }),
              });
            } catch (error) {
              if (!(error instanceof HiggsfieldSceneError && error.code === 'KEY_RELEASED')) {
                throw new Error(`[Scene ${index}] Higgsfield resubmit falhou (${currentStage}): ${describeHiggsfieldError(error)}`);
              }
              // 1º POST recusado (4xx) já liberou a verba: descarta o registro e
              // cai no launch fresco abaixo com attempt = pending.attempt + 1.
              updateJob({ logs: [`↩️ [Scene ${index}] Tentativa ${pending.attempt} foi recusada sem cobrança — nova tentativa com chave nova.`] });
              delete providerRequests[sceneId];
              updateJobCritical({
                providerRequests,
                costReserveUsdMicros: sumHiggsfieldReserves(providerRequests),
              });
            }
            if (resubmitted) {
              scenesToProcess.push({ sceneId, index, audioDataUri, status: "PROCESSING", hf: resubmitted });
              continue;
            }
          }
          if (plan.kind === 'relaunch_new_attempt') {
            const terminalStatus = outcome?.kind === 'failed_terminal' ? outcome.terminalStatus : 'desconhecido';
            updateJob({ logs: [`⚠️ [Scene ${index}] Geração Higgsfield confirmada como ${terminalStatus} pelo provedor — reserva liberada (sem cobrança) e nova tentativa com chave nova.`] });
            releaseCost({ ledgerDir: tmpDir, operationKey: pending.operationKey, reason: 'provider_terminal_no_charge' });
            delete providerRequests[sceneId];
            updateJobCritical({
              providerRequests,
              costReserveUsdMicros: sumHiggsfieldReserves(providerRequests),
            });
            // cai para o launch fresco abaixo (attempt = pending.attempt + 1)
          }
          if (plan.kind === 'stop_unresolved') {
            throw new Error(`PROVIDER_UNKNOWN: não foi possível reconciliar a geração paga ${pending.requestId} (${plan.reason}). Run interrompido para evitar cobrança duplicada — reconcilie e retome.`);
          }
        }

        const attempt = (pending?.attempt ?? 0) + 1;
        const hfSound: HiggsfieldSound = voiceMode === 'kling_native' ? 'on' : 'off';

        const visuals = await resolveSceneLaunchVisuals({
          line, sceneIndex: i, aspect, directorIdea, directorSnippet, wardrobe, voiceMode,
          audioDuration: audioDurations.get(sceneId), fallbackDuration: line.durationEst <= 5 ? 5 : 10,
          tmpDir, jobId, sceneId,
        });
        if (visuals.interfaceReferenceUsed) {
          updateJob({ logs: [`🎨 [Scene ${index}] Referência de personagem da interface em uso (não canônica).`] });
        }

        if (chainFrom) {
          updateJob({ logs: [`🔗 [Scene ${index}] Encadeada à anterior (mesmo personagem) — submissão Higgsfield adiada p/ herdar o último frame.`] });
          scenesToProcess.push({
            sceneId, index, audioDataUri, status: "CHAINED", chainFrom,
            hfLaunch: { prompt: visuals.prompt, duration: visuals.duration, attempt, sound: hfSound },
          });
          continue;
        }

        updateJob({ logs: [`🎬 [Scene ${index}] Submetendo ${jobModel} via Higgsfield (duração ${visuals.duration}s, sound ${hfSound})...`] });
        try {
          const record = await launchHiggsfieldScene({
            jobId,
            sceneId,
            attempt,
            anchor: visuals.startImage,
            prompt: visuals.prompt,
            duration: visuals.duration,
            sound: hfSound,
            client: hfClient!,
            model: jobModel,
            ledgerDir: tmpDir,
            capMicros: hfCapMicros,
            persistRequest: makeHiggsfieldPersister(sceneId),
            log: (m) => updateJob({ logs: [m] }),
          });
          scenesToProcess.push({ sceneId, index, audioDataUri, status: "PROCESSING", hf: record });
        } catch (error) {
          throw new Error(`[Scene ${index}] Higgsfield launch falhou (${currentStage}): ${describeHiggsfieldError(error)}`);
        }
        continue;
      }

      if (isReplicateSandbox) {
        // Sem Replicate não há render real. Vídeo piloto só com opt-in explícito
        // de desenvolvimento — nunca entregar clipe de outro episódio como se fosse este.
        if (process.env.STUDIO_SANDBOX !== '1') {
          throw new Error(`[Scene ${index}] REPLICATE_API_TOKEN não configurado: render real impossível. Para testar localmente com os vídeos piloto, defina STUDIO_SANDBOX=1.`);
        }
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
        // sequencial; extrai o último frame dele e SÓ AGORA lança a geração.
        if (!scene.hf && scene.hfLaunch && scene.chainFrom) {
          // Higgsfield encadeado: o frame vira data URI ⇒ upload ⇒ payload com a
          // public_url (mesmos passos do launch comum, MESMA chave por tentativa).
          const prevClip = path.resolve(tmpDir, `sync_${jobId}_${scene.chainFrom}.mp4`);
          updateJob({ logs: [`🔗 [Scene ${scene.index}] Extraindo último frame da cena anterior p/ continuidade...`] });
          const frameUri = await extractLastFrameDataUri(prevClip, tmpDir, `${jobId}_${scene.sceneId}`);
          try {
            const record = await launchHiggsfieldScene({
              jobId,
              sceneId: scene.sceneId,
              attempt: scene.hfLaunch.attempt,
              anchor: frameUri,
              prompt: scene.hfLaunch.prompt,
              duration: scene.hfLaunch.duration,
              sound: scene.hfLaunch.sound,
              client: hfClient!,
              model: jobModel,
              ledgerDir: tmpDir,
              capMicros: hfCapMicros,
              persistRequest: makeHiggsfieldPersister(scene.sceneId),
              log: (m) => updateJob({ logs: [m] }),
            });
            scene.hf = record;
          } catch (error) {
            throw new Error(`[Scene ${scene.index}] Higgsfield launch encadeado falhou (${currentStage}): ${describeHiggsfieldError(error)}`);
          }
        }

        if (!scene.hf && !scene.predictionId && scene.chainFrom && scene.launch) {
          // WP 1.6 (replicate): encadeada — extrai o último frame e lança o Kling.
          const prevClip = path.resolve(tmpDir, `sync_${jobId}_${scene.chainFrom}.mp4`);
          updateJob({ logs: [`🔗 [Scene ${scene.index}] Extraindo último frame da cena anterior p/ continuidade...`] });
          const frameUri = await extractLastFrameDataUri(prevClip, tmpDir, `${jobId}_${scene.sceneId}`);
          const prediction = await createKlingPrediction(replicate!, {
            prompt: scene.launch.prompt,
            duration: scene.launch.duration,
            aspect_ratio: aspect,
            start_image: frameUri,
            negative_prompt: KLING_NEGATIVE_PROMPT,
            generate_audio: voiceMode === 'kling_native'
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

        if (!scene.hf && !scene.predictionId) throw new Error(`cena ${scene.index}: sem referência de geração (launch encadeado falhou?)`);
        let klingVideoUrl: string;
        if (scene.hf) {
          if ('reconciledUrl' in scene && scene.reconciledUrl) {
            klingVideoUrl = scene.reconciledUrl;
            updateJob({ logs: [`🛟 [Scene ${scene.index}] Resultado reconciliado do Higgsfield em uso (polling pulado).`] });
          } else {
            updateJob({ logs: [`⏳ [Scene ${scene.index}] Polling Higgsfield (requestId ${scene.hf.requestId})...`] });
            try {
              const result = await pollHiggsfieldScene({
                record: scene.hf,
                client: hfClient!,
                ledgerDir: tmpDir,
                log: (m) => updateJob({ logs: [m] }),
              });
              klingVideoUrl = result.outputUrl;
            } catch (error) {
              // Reserva/estado permanecem em disco: retomada reconcilia ou relança
              // com chave de tentativa nova — nunca gasto às cegas.
              updateJob({ costReserveUsdMicros: sumHiggsfieldReserves(providerRequests) });
              throw new Error(`Higgsfield polling falhou (${describeHiggsfieldError(error)})`);
            }
          }
          // URL de mídia: HTTPS válido, sem credenciais — o download não leva
          // Authorization alguma (storage/CDN do provedor).
          klingVideoUrl = validateMediaUrl(klingVideoUrl, 'video.url');
        } else {
          if ('reconciledUrl' in scene && scene.reconciledUrl) {
            klingVideoUrl = scene.reconciledUrl;
            updateJob({ logs: [`🛟 [Scene ${scene.index}] Resultado reconciliado do provedor em uso (polling pulado).`] });
          } else {
            updateJob({ logs: [`⏳ [Scene ${scene.index}] Polling Kling video generation...`] });
            const output = await pollPrediction(replicate!, scene.predictionId!);
            klingVideoUrl = Array.isArray(output) ? output[0] : output;
          }
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

        // BK-18 QC (modo nativo): o clipe do Kling TEM que ter fala audível — clip
        // mudo em modo nativo é degradação COM AVISO (TTS fallback se houver chave),
        // nunca entrega calada.
        if (voiceMode === 'kling_native' && !existsSync(audioPath)) {
          const audible = await clipHasAudibleAudio(scenePath);
          if (!audible && elevenLabsKey) {
            const character = resolveCharacter(script[scene.index - 1].characterId);
            if (character?.voiceId) {
              updateJob({ logs: [`⚠️ [Scene ${scene.index}] Kling não gerou fala audível — FALLBACK TTS (degradação com aviso, régua BK-18).`] });
              const buffer = await ttsForScene(script[scene.index - 1], character, voiceIds);
              writeFileSync(audioPath, buffer);
              const measured = await probeAudioDuration(audioPath);
              if (measured !== null) audioDurations.set(scene.sceneId, measured);
            }
          } else if (!audible) {
            throw new Error(`VOICE_MISSING_NATIVE: clipe do Kling sem áudio falado (cena ${scene.index}) e sem ELEVENLABS_API_KEY para fallback. Resume re-renderiza a cena.`);
          }
        }

        // Multiplexação: com áudio TTS (modo elevenlabs ou fallback) sobrepõe; no
        // nativo SEM fallback o áudio do próprio Kling é preservado com -c copy —
        // o anullsrc antigo trocaria a fala do Kling por silêncio.
        currentStage = 'mux';
        updateJob({ logs: [`🎵 [Scene ${scene.index}] Multiplexing audio and video locally...`] });
        await new Promise((resolve, reject) => {
            const args = ['-y', '-i', scenePath];

            if (existsSync(audioPath)) {
              args.push('-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0?', '-map', '1:a:0', '-shortest');
            } else if (voiceMode === 'kling_native') {
              args.push('-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy');
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
      } catch (err) {
        // BK-16: falha real com provedor configurado — estado identifica a etapa
        // e a causa; sem substituição silenciosa por piloto. Intermediários e
        // checkpoints ficam preservados no finally para retomada.
        updateJob({ logs: [`❌ [Scene ${scene.index}] Falha real em ${currentStage}: ${errorMessage(err)}. Job interrompido; checkpoints preservados para retomada.`] });
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
    } catch (e) {
      updateJob({ logs: [`⚠️ UPLOAD_ERROR: ${errorMessage(e)}. Entrega LOCAL explícita (não é entrega cloud): ${finalVideoUrl}`] });
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
    } catch (e) {
      console.warn("[Supabase] Failed to update episode row:", errorMessage(e));
    }

    // Done! BK-16: a entrega real (cloud vs local) fica explícita no estado.
    updateJob({
      status: "COMPLETED",
      progress: 100,
      delivery,
      logs: ["🎉 PIPELINE_ASSEMBLY_COMPLETE. FINAL_VIDEO_RENDERED_SUCCESSFULLY."],
      finalVideoUrl
    });

  } catch (error) {
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
      } catch (e) {
        console.warn("[Supabase] Failed to mark episode as failed in DB:", errorMessage(e));
      }
    }

    const uncertainReplicate = Object.entries(providerRequests)
      .filter(([, request]) => isReplicateRequest(request))
      .map(([sceneId, request]) => `${sceneId}:${(request as SceneProviderRequest).predictionId}`);
    const uncertainHiggsfield = Object.entries(providerRequests)
      .filter(([, request]) => isHiggsfieldRequest(request) && request.requestId)
      .map(([sceneId, request]) => `${sceneId}:${(request as HiggsfieldSceneRequest).requestId}`);
    const higgsfieldUnresolved = Object.entries(providerRequests)
      .filter(([, request]) => isHiggsfieldRequest(request) && !request.requestId)
      .map(([sceneId]) => sceneId);
    updateJob({
      status: "FAILED",
      progress: 0,
      failureStage: currentStage,
      logs: [
        `🔴 CRITICAL_PIPELINE_ERROR em ${currentStage}: ${errorMessage(error)}`,
        ...(uncertainReplicate.length
          ? [`⚠️ PREDICTIONS UNCERTAIN (pagas, resultado não reconciliado — consultar antes de re-renderizar): ${uncertainReplicate.join(', ')}`]
          : []),
        ...(uncertainHiggsfield.length
          ? [`⚠️ HIGGSFIELD SUBMISSIONS UNCERTAIN (reservas retidas — reconciliar pelo requestId antes de relançar): ${uncertainHiggsfield.join(', ')}`]
          : []),
        ...(higgsfieldUnresolved.length
          ? [`⚠️ HIGGSFIELD SUBMISSÕES INCERTAS SEM requestId (retomada resubmete a MESMA chave/payload — nunca chave nova): ${higgsfieldUnresolved.join(', ')}`]
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

    // Provedor resolvido no SERVIDOR e congelado por job. O schema zod já descarta
    // campos desconhecidos — o cliente nunca envia chave HF nem escolhe o modelo.
    // Configuração inválida é erro explícito, sem fallback silencioso p/ Replicate.
    let providerConfig: FrozenVideoProviderConfig;
    try {
      providerConfig = resolveVideoProviderConfig(process.env);
    } catch (error) {
      const code = error instanceof VideoProviderConfigError ? error.code : 'VIDEO_PROVIDER_INVALID';
      return NextResponse.json({ error: code, details: errorMessage(error) }, { status: 500 });
    }

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

      // Troca de provedor/modelo entre criação e retomada é conflito explícito:
      // clipe gerado por outro provedor/modelo não é reutilizado silenciosamente.
      if (existingData.provider && existingData.provider !== providerConfig.provider) {
        return NextResponse.json({
          error: "RESUME_CONFIG_CONFLICT",
          details: `Job congelado no provedor ${existingData.provider}; o servidor agora resolve ${providerConfig.provider}. Provedor não troca no meio do job.`
        }, { status: 409 });
      }
      if (providerConfig.provider === 'higgsfield' && existingData.providerModel && existingData.providerModel !== providerConfig.model) {
        return NextResponse.json({
          error: "RESUME_CONFIG_CONFLICT",
          details: `Modelo Higgsfield mudou (${existingData.providerModel} → ${providerConfig.model}). Crie um job novo em vez de retomar.`
        }, { status: 409 });
      }

      // BK-16: retomada usa a versão aprovada. Roteiro/voz/aspecto/referências/
      // figurino diferentes = conflito explícito (nova versão ou job novo), nunca
      // mistura de cache antigo com payload novo. Em higgsfield, provedor/modelo
      // congelados também entram no hash (legado replicate mantém hash anterior).
      const providerForHash = providerConfig.provider === 'higgsfield'
        ? { provider: providerConfig.provider, model: providerConfig.model }
        : undefined;
      const configHash = pipelineConfigHash(validation.data, providerForHash);
      const decision = evaluateResume(
        existingData,
        { configHash },
        { isRunActive: activeRuns.has(jobId) },
      );
      if (decision.action === 'conflict') {
        return NextResponse.json({
          error: decision.code,
          details: decision.code === 'RESUME_CONFIG_CONFLICT'
            ? "O roteiro/voz/aspecto/referências (ou provedor/modelo) mudaram desde o job original. Crie um novo job (nova versão) em vez de retomar com conteúdo alterado."
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
        provider: providerConfig.provider,
        providerModel: providerConfig.model,
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
        configHash: pipelineConfigHash(
          validation.data,
          providerConfig.provider === 'higgsfield'
            ? { provider: providerConfig.provider, model: providerConfig.model }
            : undefined,
        ),
        // Provedor/modelo congelados na criação — o worker usa EXCLUSIVAMENTE estes.
        provider: providerConfig.provider,
        providerModel: providerConfig.model,
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
    processPipeline(jobId, script, directorIdea, directorSnippet, aspect, wardrobe, validation.data.voiceIds, validation.data.voiceMode).catch(err => {
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
      const statusTmpDir = path.resolve(process.cwd(), '.tmp');
      const allRequests: Record<string, AnySceneRequest> = jobData.providerRequests || {};
      const replicateEntries = Object.entries(allRequests).filter(([, request]) => isReplicateRequest(request));
      const higgsfieldEntries = Object.entries(allRequests).filter(([, request]) => isHiggsfieldRequest(request));
      const uncertainPredictions = replicateEntries
        .map(([sceneId, request]) => `${sceneId}:${(request as SceneProviderRequest).predictionId}`);
      const higgsfieldWithId = higgsfieldEntries
        .filter(([, request]) => isHiggsfieldRequest(request) && request.requestId)
        .map(([sceneId, request]) => `${sceneId}:${(request as HiggsfieldSceneRequest).requestId}`);
      const higgsfieldWithoutId = higgsfieldEntries
        .filter(([, request]) => isHiggsfieldRequest(request) && !request.requestId)
        .map(([sceneId]) => sceneId);
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
      if (higgsfieldEntries.length) {
        if (process.env.HF_API_KEY) {
          try {
            const hfRequests: Record<string, HiggsfieldSceneRequest> = {};
            for (const [sceneId, request] of higgsfieldEntries) {
              hfRequests[sceneId] = request as HiggsfieldSceneRequest;
            }
            const reconciled = await reconcileHiggsfieldRequests(
              new HiggsfieldClient({ apiKey: process.env.HF_API_KEY }),
              hfRequests,
            );
            reconciliationLogs.push(
              ...Object.values(reconciled).map((r) =>
                `🔎 RECONCILED [higgsfield] ${r.sceneId}:${r.requestId} => ${r.action}${r.detail ? ` (${r.detail})` : ''}`
              ),
            );
            // Efeitos no ledger comprovados pelo provedor: conclusão cobra (fica
            // retida); término terminal failed/nsfw/canceled libera (contrato de
            // não-cobrança). Incertezas NUNCA mexem no ledger.
            for (const entry of Object.values(reconciled)) {
              const record = hfRequests[entry.sceneId];
              if (!record) continue;
              if (entry.action === 'REUSE') {
                const charge = chargeCost({ ledgerDir: statusTmpDir, operationKey: record.operationKey });
                reconciliationLogs.push(
                  charge.kind === 'conflict'
                    ? `⚠️ [Orçamento] Cobrança de ${entry.sceneId} conflitante (estado ${charge.state}) — reserve preservada.`
                    : `💰 [Orçamento] ${entry.sceneId} confirmado cobrado (${formatUsd(record.reservedUsdMicros)}).`
                );
              }
              if (entry.action === 'RELAUNCH') {
                const release = releaseCost({
                  ledgerDir: statusTmpDir,
                  operationKey: record.operationKey,
                  reason: 'provider_terminal_no_charge',
                });
                reconciliationLogs.push(
                  release.kind === 'released'
                    ? `↩️ [Orçamento] Reserva de ${entry.sceneId} liberada (término terminal sem cobrança).`
                    : `⚠️ [Orçamento] Reserva de ${entry.sceneId} mantida (estado ${release.kind}).`
                );
              }
            }
          } catch (reconcileError) {
            console.warn(`[Pipeline Status] Reconciliação Higgsfield falhou para ${idValidation.data}:`, reconcileError);
            reconciliationLogs.push(`⚠️ RECONCILE_UNAVAILABLE [higgsfield]: não foi possível consultar as gerações pagas agora — reservas preservadas.`);
          }
        } else {
          reconciliationLogs.push(`⚠️ RECONCILE_UNAVAILABLE [higgsfield]: HF_API_KEY ausente — reservas preservadas; reconcilie após restaurar a credencial.`);
        }
        if (higgsfieldWithoutId.length) {
          reconciliationLogs.push(`♻️ [higgsfield] ${higgsfieldWithoutId.length} submissão(ões) incerta(s) sem requestId — a retomada resubmete a MESMA chave/payload (nunca chave nova).`);
        }
      }
      jobData = {
        ...jobData,
        status: 'FAILED',
        progress: 0,
        failureCode: 'WORKER_RESTARTED',
        failureStage: 'reconciliation',
        costReserveUsdMicros: sumHiggsfieldReserves(allRequests),
        updatedAt: new Date().toISOString(),
        logs: [
          ...(Array.isArray(jobData.logs) ? jobData.logs : []),
          '🔴 WORKER_RESTARTED: o processo original não existe mais; job encerrado sem retry automático.',
          '♻️ Checkpoints e intermediários preservados para retomada com reuso validado.',
          ...reconciliationLogs,
          ...(uncertainPredictions.length && !reconciliationLogs.length
            ? [`⚠️ PREDICTIONS UNCERTAIN (pagas, resultado não reconciliado — consultar antes de re-renderizar): ${uncertainPredictions.join(', ')}`]
            : []),
          ...(higgsfieldWithId.length && !reconciliationLogs.length
            ? [`⚠️ HIGGSFIELD SUBMISSIONS UNCERTAIN (reservas retidas — reconciliar antes de relançar): ${higgsfieldWithId.join(', ')}`]
            : [])
        ]
      };
      writeJsonAtomic(jobFilePath, jobData);
      // O dono anterior do lease está morto (provado acima): libera para a retomada.
      releaseResumeLease(statusTmpDir, idValidation.data);
    }
    return NextResponse.json(jobData);

  } catch (error) {
    console.error("PIPELINE_STATUS_API_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}
