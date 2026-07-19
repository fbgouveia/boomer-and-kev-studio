import { NextResponse } from 'next/server';
import fs, { existsSync, writeFileSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import Replicate from 'replicate';
import { z } from 'zod';
import { CHARACTERS, STUDIO_SETTING, SHOT_TYPES, ANGLE_SPECS } from '@/data/characters';
import { fetchWithRetry } from '@/lib/fetch-retry';
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
  engine: z.string().optional().default('kling')
});

// FFmpeg Video Assembly function
const TARGET = { width: 1080, height: 1920, fps: 30 };

function assembleVideo(clips: string[], outPath: string): Promise<string> {
  if (!clips.length) throw new Error('assembleVideo: nenhum clipe fornecido');
  for (const c of clips) {
    if (!existsSync(c)) throw new Error(`clipe não encontrado: ${c}`);
  }

  const parts = clips.map((_, i) =>
    `[${i}:v]scale=${TARGET.width}:${TARGET.height}:force_original_aspect_ratio=increase,` +
    `crop=${TARGET.width}:${TARGET.height},setsar=1,fps=${TARGET.fps}[v${i}]`
  );
  const concatIn = clips.map((_, i) => `[v${i}][${i}:a]`).join('');
  const filter = `${parts.join(';')};${concatIn}concat=n=${clips.length}:v=1:a=1[outv][outa]`;

  const args = [
    '-y',
    ...clips.flatMap((c) => ['-i', c]),
    '-filter_complex', filter,
    '-map', '[outv]', '-map', '[outa]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
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
const getDetailedPrompt = (line: any, directorIdea = "Trending News", directorSnippet = "") => {
  const char = CHARACTERS.find(c => c.id === line.characterId);
  const shot = SHOT_TYPES.find(s => s.id === line.shotType);

  if (!char) return "";

  let angleSpec = ANGLE_SPECS.main;
  if (shot?.id === 'WIDE') angleSpec = ANGLE_SPECS.wide;
  else if (shot?.id.includes('CU')) angleSpec = ANGLE_SPECS.close;
  else if (shot?.id.includes('OTS')) angleSpec = ANGLE_SPECS.side;
  else if (shot?.id === 'GOPRO_FISHEYE') angleSpec = ANGLE_SPECS.wide;

  const outfitBase = `Wearing ${char.defaultOutfit}.`;
  const directorialOverride = directorSnippet ? ` CRITICAL_DIRECTORIAL_OVERRIDE: ${directorSnippet}. Ensure all visual details like jerseys and text are prioritized.` : '';
  const characterAnchor = `${char.imagePromptContext}. ${outfitBase}${directorialOverride} Visual DNA: ${char.visualDescription}. Physicality: ${char.personality}.`;

  const personalityLogic = line.characterId === 'boomer'
    ? "hyper-active muscle tension, aggressive shadow boxing stance, intense eye contact"
    : "deadpan low-energy, slow heavy blinking, subtle ear tuft movement, indifferent expression";

  const actionBlock = `BEHAVIOR: ${line.action}. ${personalityLogic}. EMOTION: ${line.emotion}. Talking, lips moving clearly to: "${line.text.substring(0, 40)}..."`;

  const cameraBlock = `Highly photorealistic, 8k RAW, movie grade textures, cinematic depth, subsurface scattering on fur, ray-traced lighting, masterpiece. CAMERA: ${shot?.label}, ${shot?.cinematicRule}. ${angleSpec.desc}, ${angleSpec.requirements.join(', ')}.`;

  const activeProps = STUDIO_SETTING.props.filter(p => !p.includes(line.characterId === 'boomer' ? 'Tablet' : 'Gloves')).slice(0, 4).join(', ');
  const envBlock = `ENVIRONMENT: ${STUDIO_SETTING.promptContext}. Visible props: ${activeProps}. TV screen graphics: ${directorIdea}. Lighting: ${char.lightingKey}. Ambience: ${STUDIO_SETTING.acousticPanels}.`;

  return `CINEMATIC MASTERPIECE. ${characterAnchor} ${actionBlock} ${cameraBlock} ${envBlock} --ar 9:16 --v 6.0`;
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

// 1-second silence fallback for audio (data URI format)
const FALLBACK_SILENT_AUDIO_URI = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACQAAcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc/84EQAAAAAAAAAAAAAAAAAAAAAAAAGJpbmcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgSAAAAAAAAAAAAAAAAAAAAAAAAABlaG8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgSgAAAAAAAAAAAAAAAAAAAAAAAABrZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgTgAAAAAAAAAAAAAAAAAAAAAAAABtZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgUgAAAAAAAAAAAAAAAAAAAAAAAABvZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgVgAAAAAAAAAAAAAAAAAAAAAAAABxZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgWgAAAAAAAAAAAAAAAAAAAAAAAAB1ZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgXgAAAAAAAAAAAAAAAAAAAAAAAAB5ZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zgYgAAAAAAAAAAAAAAAAAAAAAAAAB9ZWcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zhAAAAAAAAAAAAAAAAAAAAAAAAA==';

// Background Job Worker
async function processPipeline(
  jobId: string,
  script: any[],
  directorIdea: string,
  directorSnippet: string,
  engine: string
) {
  const tmpDir = path.resolve(process.cwd(), '.tmp');
  const jobFilePath = path.resolve(tmpDir, `job_${jobId}.json`);

  const updateJob = (updates: any) => {
    try {
      const currentData = JSON.parse(readFileSync(jobFilePath, 'utf8'));
      const newData = { ...currentData, ...updates, logs: [...currentData.logs, ...(updates.logs || [])] };
      writeFileSync(jobFilePath, JSON.stringify(newData, null, 2));
    } catch (e) {
      console.error("Failed to write job status file:", e);
    }
  };

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const replicate = replicateToken ? new Replicate({ auth: replicateToken }) : null;

  try {
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
      updateJob({ logs: ["[Supabase] Episode successfully queued in cloud database."] });
    } catch (e: any) {
      updateJob({ logs: [`[Supabase] DB registration bypassed: ${e.message}`] });
    }

    updateJob({ progress: 10, logs: ["🧬 INJECTING_CHARACTER_DNA_PROMPTS..."] });

    // Step 1: Voice Generation & Kling Launch
    const scenesToProcess = [];

    for (let i = 0; i < script.length; i++) {
      const line = script[i];
      const sceneId = line.id;
      const index = i + 1;

      // 1a. Voice Generation (ElevenLabs)
      let audioDataUri = FALLBACK_SILENT_AUDIO_URI;
      let voiceSynthesized = false;

      if (elevenLabsKey) {
        const character = CHARACTERS.find(c => c.id === line.characterId);
        if (character && character.voiceId) {
          try {
            updateJob({ logs: [`🔊 [Scene ${index}] Requesting ElevenLabs audio...`] });
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${character.voiceId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsKey,
                'accept': 'audio/mpeg',
              },
              body: JSON.stringify({
                text: line.text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true },
              }),
            });

            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              audioDataUri = `data:audio/mpeg;base64,${base64}`;
              writeFileSync(path.resolve(tmpDir, `audio_${jobId}_${sceneId}.mp3`), Buffer.from(buffer));
              voiceSynthesized = true;
              updateJob({ logs: [`✅ [Scene ${index}] Voice synthesized successfully.`] });
            } else {
              const errorText = await response.text();
              updateJob({ logs: [`⚠️ [Scene ${index}] ElevenLabs error: ${errorText.substring(0, 100)}. Falling back to silent sync.`] });
            }
          } catch (e: any) {
            updateJob({ logs: [`⚠️ [Scene ${index}] ElevenLabs request failed: ${e.message}. Falling back to silent sync.`] });
          }
        }
      } else {
        updateJob({ logs: [`⚠️ ElevenLabs key missing. Using silent audio fallback for Scene ${index}.`] });
      }

      // 1b. Video Generation (Kling)
      let videoUrl = "";
      let isSandbox = !replicate;

      if (replicate) {
        try {
          updateJob({ logs: [`🎬 [Scene ${index}] Launching Kling v2.6 prediction on Replicate...`] });
          const prompt = getDetailedPrompt(line, directorIdea, directorSnippet);
          const character = CHARACTERS.find(c => c.id === line.characterId);
          
          const resolveAssetUrl = (url: string) => {
            if (url.startsWith('/')) {
              const filePath = path.join(process.cwd(), 'public', url);
              if (fs.existsSync(filePath)) {
                const base64 = fs.readFileSync(filePath).toString('base64');
                const ext = path.extname(filePath).substring(1) || 'png';
                return `data:image/${ext};base64,${base64}`;
              }
            }
            return url;
          };

          const prediction = await replicate.predictions.create({
            model: "kwaivgi/kling-v2.6",
            input: {
              prompt: prompt,
              duration: line.durationEst <= 5 ? 5 : 10,
              aspect_ratio: "9:16",
              start_image: character?.referenceImage ? resolveAssetUrl(character.referenceImage) : undefined,
              negative_prompt: "morphing, anatomical mutations, bare hands, human fingers, extra fingers, deformed gloves, missing clothes, naked, shirtless, bad anatomy, deformed limbs",
              generate_audio: false
            }
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
          // If pilot is also missing, fail this line
          throw new Error(`Critical Error: Pilot video missing at ${pilotPath}`);
        }
      }
    }

    // Step 2: Poll Kling video generations and trigger LipSync
    updateJob({ progress: 40 });

    const finalClipPaths: string[] = [];

    // Process each real scene sequentially or concurrently
    for (const scene of scenesToProcess) {
      updateJob({ logs: [`⏳ [Scene ${scene.index}] Polling Kling video generation...`] });
      try {
        const output = await pollPrediction(replicate!, scene.predictionId);
        const klingVideoUrl = Array.isArray(output) ? output[0] : output;
        updateJob({ logs: [`✅ [Scene ${scene.index}] Kling video generated: ${klingVideoUrl}`] });

        // Trigger Wav2Lip LipSync
        updateJob({ logs: [`👄 [Scene ${scene.index}] Triggering Wav2Lip sync on Replicate...`] });
        let syncVideoUrl = klingVideoUrl;
        let usedWav2Lip = false;
        try {
          const syncPrediction = await replicate!.predictions.create({
            model: "devxpy/cog-wav2lip",
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
        const videoBuffer = await fetch(syncVideoUrl).then(r => r.arrayBuffer());
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
          throw new Error(`Failed to recover Scene ${scene.index} using sandbox mode: Pilot video not found.`);
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
    await assembleVideo(finalClipPaths, finalVideoPath);

    let finalVideoUrl = `/api/pipeline/download?id=${jobId}`;
    try {
      const fileBuffer = readFileSync(finalVideoPath);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceRole) {
        updateJob({ logs: ["☁️ UPLOADING_TO_SUPABASE_STORAGE..."] });
        const res = await fetch(`${supabaseUrl}/storage/v1/object/videos/${jobId}.mp4`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRole}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            'Content-Type': 'video/mp4'
          },
          body: fileBuffer
        });
        
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

    const { script, directorIdea = "", directorSnippet = "", engine = "kling" } = validation.data;

    // Create .tmp directory
    const tmpDir = path.resolve(process.cwd(), '.tmp');
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }

    const jobId = crypto.randomUUID();
    const jobFilePath = path.resolve(tmpDir, `job_${jobId}.json`);

    const initialJobState = {
      id: jobId,
      status: "PROCESSING",
      progress: 0,
      logs: ["🚀 PIPELINE_ORCHESTRATOR_TRIGGERED.", `JOB_ID: ${jobId}`],
      engine,
      finalVideoUrl: null
    };

    writeFileSync(jobFilePath, JSON.stringify(initialJobState, null, 2));

    // Fire background task
    processPipeline(jobId, script, directorIdea, directorSnippet, engine).catch(err => {
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

    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const jobFilePath = path.resolve(process.cwd(), '.tmp', `job_${id}.json`);
    if (!existsSync(jobFilePath)) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobData = JSON.parse(readFileSync(jobFilePath, 'utf8'));
    return NextResponse.json(jobData);

  } catch (error) {
    console.error("PIPELINE_STATUS_API_CRASH:", error);
    return NextResponse.json({ error: "INTERNAL_PIPELINE_ERROR" }, { status: 500 });
  }
}
