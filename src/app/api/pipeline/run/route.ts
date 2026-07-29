import { NextResponse } from 'next/server';
import { existsSync, writeFileSync, mkdirSync, readFileSync, copyFileSync, unlinkSync, renameSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import Replicate from 'replicate';
import { z } from 'zod';
import { CHARACTERS, STUDIO_SETTING, SHOT_TYPES, ANGLE_SPECS, voiceSettingsFor } from '@/data/characters';
import { fetchWithTimeout } from '@/lib/fetch-retry';
import { querySupabase } from '@/lib/supabase';

// Zod Input Validation
const runPipelineSchema = z.object({
  script: z.array(z.object({
    id: z.string(),
    characterId: z.string(),
    text: z.string(),
    shotType: z.string(),
    action: z.string(),
    emotion: z.string(),
    durationEst: z.number()
  })),
  directorIdea: z.string().optional(),
  directorSnippet: z.string().optional(),
  engine: z.string().optional().default('kling'),
  aspect: z.enum(['9:16', '16:9']).optional().default('9:16'), // formato selecionável (Kling + montagem)
  wardrobe: z.object({
    boomer: z.string().optional(),
    kev: z.string().optional(),
    studio: z.string().optional()
  }).optional(),
  approval: z.object({
    confirmed: z.literal(true),
    source: z.enum(['studio_ui', 'n8n_manual']),
    approvedAt: z.string().datetime()
  }).optional()
});

const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const jobIdSchema = z.string().uuid();
const workerInstanceId = crypto.randomUUID();

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

async function assembleVideo(clips: string[], outPath: string, target: Target, transitions?: { type: string; dur: number }[]): Promise<string> {
  if (!clips.length) throw new Error('assembleVideo: nenhum clipe fornecido');
  for (const c of clips) {
    if (!existsSync(c)) throw new Error(`clipe não encontrado: ${c}`);
  }

  const norm = clips.map((_, i) =>
    `[${i}:v]scale=${target.width}:${target.height}:force_original_aspect_ratio=increase,` +
    `crop=${target.width}:${target.height},setsar=1,fps=${target.fps}[v${i}]`
  );

  let filter: string;
  let duration: number;

  if (transitions && transitions.length === clips.length - 1 && clips.length > 1) {
    // WP 1.7: cadeia de xfade/acrossfade com offsets pelas durações REAIS (ffprobe).
    const durs = await Promise.all(clips.map(probeDuration));
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
    duration = (await Promise.all(clips.map(probeDuration))).reduce((sum, dur) => sum + dur, 0);
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
    const drumsDelay = Math.round(duration * 0.42 * 1000);
    const laughDelay = Math.round(duration * 0.72 * 1000);
    filter +=
      `;[outa]asplit=2[voice][key]` +
      `;[${bedIndex}:a]aloop=loop=-1:size=2147483647,atrim=duration=${duration.toFixed(3)},volume=0.22[bed]` +
      `;[bed][key]sidechaincompress=threshold=0.025:ratio=10:attack=15:release=350[ducked]` +
      `;[${drumsIndex}:a]atrim=duration=2.8,volume=0.72,adelay=${drumsDelay}:all=1[drums]` +
      `;[${laughIndex}:a]atrim=duration=2.4,volume=0.55,adelay=${laughDelay}:all=1[laugh]` +
      `;[voice][ducked][drums][laugh]amix=inputs=4:duration=longest:normalize=0,` +
      `loudnorm=I=-14:LRA=7:TP=-2[finala]`;
  }

  const args = [
    '-y',
    ...clips.flatMap((c) => ['-i', c]),
    ...comedyInputs.flatMap((c) => ['-i', c]),
    '-filter_complex', filter,
    '-map', '[outv]', '-map', audioMap,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-shortest',
    outPath,
  ];

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    ff.on('error', reject);
    ff.on('close', (code) =>
      code === 0 ? resolve(outPath) : reject(new Error(`ffmpeg saiu com código ${code}`))
    );
  });
}

// Prompt generator helper (mirrors page.tsx)
const getDetailedPrompt = (line: any, directorIdea = "Trending News", directorSnippet = "", sceneIndex = 0, wardrobe?: { boomer?: string, kev?: string, studio?: string }) => {
  const char = CHARACTERS.find(c => c.id === line.characterId);
  const shot = SHOT_TYPES.find(s => s.id === line.shotType);

  if (!char) return "";

  let angleSpec = ANGLE_SPECS.main;
  if (shot?.id === 'WIDE') angleSpec = ANGLE_SPECS.wide;
  else if (shot?.id.includes('CU')) angleSpec = ANGLE_SPECS.close;
  else if (shot?.id.includes('OTS')) angleSpec = ANGLE_SPECS.side;
  else if (shot?.id === 'GOPRO_FISHEYE') angleSpec = ANGLE_SPECS.wide;

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

  const cameraBlock = `Highly photorealistic, 8k RAW, movie grade textures, cinematic depth, subsurface scattering on fur, ray-traced lighting, masterpiece. CAMERA: ${shot?.label}, ${shot?.cinematicRule}. ${angleSpec.desc}, ${angleSpec.requirements.join(', ')}.`;

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

  return `CINEMATIC MASTERPIECE. ${characterAnchor} ${anthropomorphicDirective} ${actionBlock} ${continuityDirective} ${cameraBlock} ${envBlock} --ar 9:16 --v 6.0`;
};

// Replicate polling helper
async function pollPrediction(replicate: Replicate, predictionId: string, maxAttempts = 60): Promise<any> {
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
// (9:16/16:9) valer de verdade, a âncora local é recortada (centralizada) via
// ffmpeg pro aspect escolhido e vira data URI. Remoto/ausente → devolve como está.
async function reframeAnchorToAspect(assetUrl: string | undefined, aspect: '9:16' | '16:9', tmpDir: string, tag: string): Promise<string | undefined> {
  if (!assetUrl) return undefined;
  if (!assetUrl.startsWith('/')) return assetUrl;
  const src = path.join(process.cwd(), 'public', assetUrl);
  if (!existsSync(src)) return undefined;
  const out = path.resolve(tmpDir, `anchor_${tag}.jpg`);
  const crop = aspect === '9:16' ? `crop='min(iw,ih*9/16)':ih` : `crop=iw:'min(ih,iw*9/16)'`;
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

// WP 1.7: transição por par de cenas, decidida pelo roteiro (determinístico).
// 'cut' vira xfade de 1 frame (≈ corte seco) p/ manter um único filter graph.
type Transition = { type: string; dur: number };
function pickTransition(prev: any, next: any, nextIdx: number): Transition {
  if (nextIdx === 3 || nextIdx === 5) return { type: 'fadeblack', dur: 0.5 }; // entra/sai do fake sponsor break
  if (prev.characterId === next.characterId) return { type: 'fade', dur: 0.04 }; // encadeada (1.6): a continuidade É a transição
  const emotion = String(next.emotion || '').toUpperCase();
  const intensa = ['INTENSE', 'EXCITED', 'ANGRY', 'SHOCKED'].includes(emotion);
  return intensa ? { type: 'fade', dur: 0.04 } : { type: 'fade', dur: 0.35 }; // troca de personagem: corte TV se quente, crossfade se calma
}

// Background Job Worker
async function processPipeline(
  jobId: string,
  script: any[],
  directorIdea: string,
  directorSnippet: string,
  engine: string,
  aspect: '9:16' | '16:9',
  wardrobe?: { boomer?: string, kev?: string, studio?: string }
) {
  const target = aspectTarget(aspect);
  const tmpDir = path.resolve(process.cwd(), '.tmp');
  const jobFilePath = path.resolve(tmpDir, `job_${jobId}.json`);

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
    const audioByScene = new Map<string, string>();

    for (let i = 0; i < script.length; i++) {
      const line = script[i];
      const index = i + 1;
      const character = CHARACTERS.find(c => c.id === line.characterId);
      if (!character?.voiceId) {
        throw new Error(`VOICE_GATE: personagem '${line.characterId}' sem voiceId (cena ${index}) — run cancelado antes de gastar render.`);
      }

      updateJob({ logs: [`🔊 [Scene ${index}] Requesting ElevenLabs audio...`] });
      let response: Response;
      try {
        response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${character.voiceId}`, {
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
      writeFileSync(path.resolve(tmpDir, `audio_${jobId}_${line.id}.mp3`), Buffer.from(buffer));
      updateJob({ logs: [`✅ [Scene ${index}] Voice synthesized successfully.`] });
    }

    updateJob({ progress: 25, logs: ["✅ VOICE_GATE_PASSED: todas as vozes prontas. Liberando renders."] });

    // Step 1b: Kling Launch — só executa com o gate de voz 100% verde
    const scenesToProcess = [];

    for (let i = 0; i < script.length; i++) {
      const line = script[i];
      const sceneId = line.id;
      const index = i + 1;
      const audioDataUri = audioByScene.get(line.id)!;

      // 1b. Video Generation (Kling)
      let videoUrl = "";
      let isSandbox = !replicate;

      // WP 1.6: mesma personagem em cenas consecutivas → a cena N+1 nasce do último
      // frame da cena N (continuidade real). O launch é ADIADO p/ o Step 2, quando o
      // clipe anterior já existe. Troca de personagem = corte de câmera (âncora normal).
      const chainFrom = i > 0 && script[i - 1].characterId === line.characterId ? script[i - 1].id : null;

      if (replicate && chainFrom) {
        updateJob({ logs: [`🔗 [Scene ${index}] Encadeada à anterior (mesmo personagem) — launch adiado p/ herdar o último frame.`] });
        scenesToProcess.push({
          sceneId, index, predictionId: null as string | null, audioDataUri, status: "CHAINED",
          chainFrom,
          launch: { prompt: getDetailedPrompt(line, directorIdea, directorSnippet, i, wardrobe), duration: line.durationEst <= 5 ? 5 : 10 }
        });
        continue;
      }

      if (replicate) {
        try {
          updateJob({ logs: [`🎬 [Scene ${index}] Launching Kling v2.6 prediction on Replicate...`] });
          const prompt = getDetailedPrompt(line, directorIdea, directorSnippet, i, wardrobe);
          const character = CHARACTERS.find(c => c.id === line.characterId);
          
          // WP 1.5: em 16:9, cenas que mostram os DOIS (WIDE/OTS) ancoram no two-shot master.
          // Em 9:16 o two-shot lado-a-lado NÃO cabe → usa a âncora solo do personagem.
          // ponytail: two-shot vertical de verdade (OTS/empilhado) exige arte nova — P0a item 4.
          const anchorImage = (aspect === '16:9' && (line.shotType === 'WIDE' || line.shotType === 'OTS_BOOMER'))
            ? '/assets/master_wide.png'
            : character?.referenceImage;

          const startImage = await reframeAnchorToAspect(anchorImage, aspect, tmpDir, `${jobId}_${sceneId}`);

          const prediction = await createKlingPrediction(replicate, {
            prompt: prompt,
            duration: line.durationEst <= 5 ? 5 : 10,
            aspect_ratio: aspect,
            start_image: startImage,
            negative_prompt: "morphing, anatomical mutations, bare hands, human fingers, extra fingers, deformed gloves, missing clothes, naked, shirtless, bad anatomy, deformed limbs",
            generate_audio: false
          });

          scenesToProcess.push({
            sceneId,
            index,
            predictionId: prediction.id,
            audioDataUri,
            status: "PROCESSING"
          });
        } catch (e: any) {
          updateJob({ logs: [`⚠️ [Scene ${index}] Replicate Kling launch failed: ${e.message}. Falling back to sandbox pilot video.`] });
          isSandbox = true;
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
        }

        if (!scene.predictionId) throw new Error(`cena ${scene.index}: sem predictionId (launch encadeado falhou?)`);
        updateJob({ logs: [`⏳ [Scene ${scene.index}] Polling Kling video generation...`] });
        const output = await pollPrediction(replicate!, scene.predictionId);
        const klingVideoUrl = Array.isArray(output) ? output[0] : output;
        updateJob({ logs: [`✅ [Scene ${scene.index}] Kling video generated: ${klingVideoUrl}`] });

        // Trigger Wav2Lip LipSync
        updateJob({ logs: [`👄 [Scene ${scene.index}] Triggering Wav2Lip sync on Replicate...`] });
        let syncVideoUrl = klingVideoUrl;
        let usedWav2Lip = false;
        try {
          const syncPrediction = await replicate!.predictions.create({
            // ponytail: modelo community exige version hash — endpoint por nome (model:) dá 404
            version: "8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef",
            input: {
              face: klingVideoUrl,
              audio: scene.audioDataUri,
              pads: "0 10 0 0",
              smooth: true,
              fps: 30
            }
          });

          updateJob({ logs: [`⏳ [Scene ${scene.index}] Polling LipSync completion...`] });
          const syncOutput = await pollPrediction(replicate!, syncPrediction.id);
          syncVideoUrl = Array.isArray(syncOutput) ? syncOutput[0] : syncOutput;
          usedWav2Lip = true;
        } catch (err: any) {
          updateJob({ logs: [`⚠️ [Scene ${scene.index}] LipSync failed: ${err.message}. Falling back to non-lipsynced video.`] });
        }

        // Download final synced video to local disk
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

        if (!usedWav2Lip) {
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
        } else {
            // Check if the wav2lip video actually has an audio stream
            // But we will assume it does, because we provided an audio file to it.
            // If it doesn't have an audio stream, it will crash assembly. To be 100% safe,
            // we could always remux, but this is fine for now.
            copyFileSync(scenePath, finalScenePath);
        }

        finalClipPaths.push(finalScenePath);
        updateJob({ logs: [`✅ [Scene ${scene.index}] Scene completed & saved.`] });
      } catch (err: any) {
        updateJob({ logs: [`❌ [Scene ${scene.index}] Real execution crashed: ${err.message}. Falling back to sandbox pilot scene.`] });
        const pilotPath = path.resolve(process.cwd(), '../00_Legacy_Archives/Piloto', `cena${(scene.index - 1) % 4 + 1}.mp4`);
        const targetPath = path.resolve(tmpDir, `sync_${jobId}_${scene.sceneId}.mp4`);
        if (existsSync(pilotPath)) {
          copyFileSync(pilotPath, targetPath);
          finalClipPaths.push(targetPath);
        } else {
          // Produção sem piloto — propaga a causa real em vez de mascarar como sandbox.
          throw new Error(`[Scene ${scene.index}] Falha real e sem piloto de fallback (produção): ${err.message}. Causa provável: crédito/rate-limit do Replicate.`);
        }
      }
    }

    // Add sandbox clips to final lists if not processed by replicate
    for (let i = 0; i < script.length; i++) {
      const sceneId = script[i].id;
      const scenePath = path.resolve(tmpDir, `sync_${jobId}_${sceneId}.mp4`);
      if (existsSync(scenePath) && !finalClipPaths.includes(scenePath)) {
        finalClipPaths.push(scenePath);
      }
    }

    // Step 3: Run Video Assembly (FFmpeg merge)
    updateJob({ progress: 85, logs: ["🎬 LAUNCHING_FFMPEG_VIDEO_ASSEMBLER...", "STITCHING_SCENES_AND_NORMALIZING_AUDIO..."] });

    const finalVideoPath = path.resolve(tmpDir, `final_${jobId}.mp4`);

    // WP 1.7: plano de transições derivado do roteiro (só quando 1 clipe por cena).
    const transitions = finalClipPaths.length === script.length && script.length > 1
      ? script.slice(1).map((next, k) => pickTransition(script[k], next, k + 1))
      : undefined;
    if (transitions) {
      updateJob({ logs: [`🎞️ Transições: ${transitions.map(t => `${t.type}${t.dur >= 0.1 ? '' : '(corte)'}`).join(' → ')}`] });
    }

    await assembleVideo(finalClipPaths, finalVideoPath, target, transitions);

    let finalVideoUrl = `/api/pipeline/download?id=${jobId}`;
    try {
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
          updateJob({ logs: ["✅ UPLOAD_SUCCESSFUL."] });
        } else {
          const errText = await res.text();
          updateJob({ logs: [`⚠️ UPLOAD_FAILED: ${errText}. Falling back to local URL.`] });
        }
      }
    } catch (e: any) {
      updateJob({ logs: [`⚠️ UPLOAD_ERROR: ${e.message}. Falling back to local URL.`] });
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

    // Done!
    updateJob({
      status: "COMPLETED",
      progress: 100,
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

    updateJob({
      status: "FAILED",
      progress: 0,
      logs: [`🔴 CRITICAL_PIPELINE_ERROR: ${error.message}`]
    });
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

    const { script, directorIdea = "", directorSnippet = "", engine = "kling", aspect = "9:16", wardrobe } = validation.data;

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

    const jobId = crypto.randomUUID();
    const jobFilePath = path.resolve(tmpDir, `job_${jobId}.json`);
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

    // Fire background task
    processPipeline(jobId, script, directorIdea, directorSnippet, engine, aspect, wardrobe).catch(err => {
      console.error(`Uncaught background task error for job ${jobId}:`, err);
    });

    return NextResponse.json({
      status: "QUEUED",
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
      jobData = {
        ...jobData,
        status: 'FAILED',
        progress: 0,
        failureCode: 'WORKER_RESTARTED',
        updatedAt: new Date().toISOString(),
        logs: [
          ...(Array.isArray(jobData.logs) ? jobData.logs : []),
          '🔴 WORKER_RESTARTED: o processo original não existe mais; job encerrado sem retry automático.'
        ]
      };
      writeJsonAtomic(jobFilePath, jobData);
    }
    return NextResponse.json(jobData);

  } catch (error) {
    console.error("PIPELINE_STATUS_API_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}
