#!/usr/bin/env node
// FREE episode generator — US$0 total.
// Edge TTS (en-AU, grátis) + clipes piloto locais + ffmpeg. Nenhuma API paga.
// Uso: node tools/free-episode.mjs <script.json> [saida]
// Ex.: node tools/free-episode.mjs 04_Delivery/script_ab/raw-claude-opus-5.json

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PILOT_DIR = process.env.PILOT_DIR || '../00_Legacy_Archives/Piloto';
const VOICES = {
  boomer: { voice: 'en-AU-WilliamNeural', rate: '+18%', pitch: '+12Hz' },  // explosivo
  kev:    { voice: 'en-AU-WilliamNeural', rate: '-14%', pitch: '-28Hz' },  // deadpan
};

const [, , scriptPath, outArg] = process.argv;
if (!scriptPath) { console.error('uso: free-episode.mjs <script.json> [saida]'); process.exit(1); }

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
if (!Array.isArray(script) || script.length === 0) { console.error('script vazio/inválido'); process.exit(1); }

const outDir = path.resolve(outArg || '.tmp/free_episode');
mkdirSync(outDir, { recursive: true });
const sh = (cmd, args, opts = {}) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: opts.quiet ? 'ignore' : ['ignore', 'ignore', 'inherit'] });
  p.on('error', rej);
  p.on('close', c => c === 0 ? res() : rej(new Error(`${cmd} saiu com código ${c}`)));
});
const ffprobeDur = f => {
  const r = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', f]);
  const v = parseFloat(r.stdout.toString().trim());
  if (!isFinite(v)) throw new Error(`ffprobe falhou em ${f}`);
  return v;
};

// 1. TTS por cena (grátis, en-AU)
const audioFiles = [];
for (const scene of script) {
  const cfg = VOICES[scene.characterId] || VOICES.boomer;
  const f = path.join(outDir, `tts_${scene.id}.mp3`);
  await sh('python3', ['-m','edge_tts',`--voice=${cfg.voice}`,`--rate=${cfg.rate}`,`--pitch=${cfg.pitch}`,
    `--text=${scene.text}`,`--write-media=${f}`], { quiet: true });
  const dur = ffprobeDur(f);
  audioFiles.push({ file: f, dur, scene });
  console.log(`🎙️  ${scene.characterId.toUpperCase()} [${scene.id}] TTS ${dur.toFixed(1)}s`);
}

// 2. Vídeo por cena: clipe piloto recortado 9:16, duração = duração do áudio (mín 2s)
const CLIPS = ['cena1.mp4','cena2.mp4','cena3.mp4','cena4.mp4'].map(c => path.resolve(PILOT_DIR, c));
const missing = CLIPS.filter(c => !existsSync(c));
if (missing.length) { console.error('clipes piloto ausentes:', missing.join(', ')); process.exit(1); }

const sceneVideos = [];
for (let i = 0; i < script.length; i++) {
  const { file: audio, dur } = audioFiles[i];
  const target = Math.max(dur + 0.4, 2);
  const out = path.join(outDir, `scene_${String(i+1).padStart(2,'0')}.mp4`);
  // crop central 9:16 do 16:9 4K → 1080x1920, trim silencioso (áudio vem por cima no mix final)
  await sh('ffmpeg', ['-y','-i', CLIPS[i % CLIPS.length],
    '-vf', 'crop=ih*9/16:ih,scale=1080:1920',
    '-t', target.toFixed(2), '-an', '-c:v','libx264','-preset','veryfast','-crf','23', out], { quiet: true });
  // pad/truncate o vídeo exatamente na duração alvo + concat demuxer exige streams homogêneos
  sceneVideos.push(out);
  console.log(`🎬 cena ${i+1}: clipe ${path.basename(CLIPS[i % CLIPS.length])} → ${target.toFixed(1)}s`);
}

// 3. Vídeo total (concat demuxer)
const listV = path.join(outDir, 'clips.txt');
writeFileSync(listV, sceneVideos.map(v => `file '${v}'`).join('\n'));
const rawVideo = path.join(outDir, 'video_noaudio.mp4');
await sh('ffmpeg', ['-y','-f','concat','-safe','0','-i',listV,'-c','copy', rawVideo], { quiet: true });

// 4. Áudio total: TTS em sequência com 0.3s de respiro
const audioSegs = [];
let t = 0;
for (const { file, dur } of audioFiles) {
  audioSegs.push({ file, start: t });
  t += dur + 0.3;
}
const totalAudio = t.toFixed(2);
const filterParts = [];
audioSegs.forEach((s, i) => filterParts.push(`[${i}:a]adelay=${Math.round(s.start*1000)}|${Math.round(s.start*1000)}[a${i}]`));
filterParts.push(`${audioSegs.map((_,i)=>`[a${i}]`).join('')}amix=inputs=${audioSegs.length}:normalize=0,apad=whole_dur=${totalAudio}[mix]`);
const mixArgs = ['-y'];
for (const { file } of audioSegs) mixArgs.push('-i', file);
mixArgs.push('-filter_complex', filterParts.join(';'), '-map','[mix]','-t', totalAudio,
  '-c:a','aac','-b:a','192k', path.join(outDir,'voice_track.m4a'));
await sh('ffmpeg', mixArgs, { quiet: true });

// 5. Mix final vídeo+áudio (9:16)
const final = path.join(outDir, 'BK_FREE_EPISODE.mp4');
await sh('ffmpeg', ['-y','-i',rawVideo,'-i',path.join(outDir,'voice_track.m4a'),
  '-map','0:v:0','-map','1:a:0','-shortest','-c:v','copy','-c:a','aac','-b:a','192k', final], { quiet: true });

const totalDur = ffprobeDur(final);
console.log(`\n✅ EPISÓDIO FREE GERADO: ${final}`);
console.log(`   duração ${totalDur.toFixed(1)}s · ${script.length} cenas · custo US$0,00`);
writeFileSync(path.join(outDir,'report.json'), JSON.stringify({
  script: scriptPath, mode: 'FREE (edge-tts + pilot clips)', scenes: script.length,
  durationSec: +totalDur.toFixed(1), costUSD: 0, output: final, generatedAt: new Date().toISOString()
}, null, 2));
