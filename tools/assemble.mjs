#!/usr/bin/env node
// Camada 3 (VLAEG) — Montagem final: concatena N clipes de cena num único MP4 9:16.
// Buraco #1 do handoff: o pipeline gerava clipes soltos e NADA os juntava.
//
// Uso:   node tools/assemble.mjs <saida.mp4> <clip1> <clip2> ...
// Teste: node tools/assemble.mjs            (roda autoteste nos clipes do piloto)
//
// Normaliza cada input (escala+pad p/ 9:16, fps fixo, re-encode h264/aac) porque
// as fontes do pipeline divergem: Kling render (9:16, sem áudio) -> wav2lip lipsync
// (30fps, com áudio da voz ElevenLabs). -c copy quebraria; re-encode é o seguro.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const TARGET = { width: 1080, height: 1920, fps: 30 };

export function assembleVideo(clips, outPath, opts = {}) {
  const { width, height, fps } = { ...TARGET, ...opts };
  if (!clips.length) throw new Error('assembleVideo: nenhum clipe fornecido');
  for (const c of clips) if (!existsSync(c)) throw new Error(`clipe não encontrado: ${c}`);

  // Normaliza cada stream de vídeo/áudio, depois concatena.
  // ponytail: assume que cada clipe TEM áudio (clipes pós-lipsync têm; piloto tem).
  const parts = clips.map((_, i) =>
    `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v${i}]`
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

// ffprobe: duração em segundos (para o autoteste)
function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file,
    ]);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (c) => (c === 0 ? resolve(parseFloat(out)) : reject(new Error('ffprobe falhou'))));
  });
}

async function selfTest() {
  const assert = (cond, msg) => { if (!cond) { console.error('❌', msg); process.exit(1); } };
  const pilot = ['cena1', 'cena2', 'cena3'].map((n) =>
    path.resolve('../Piloto', `${n}.mp4`)
  );
  assert(pilot.every(existsSync), 'clipes do piloto não encontrados em ../Piloto');

  const out = path.resolve('.tmp', 'assemble-selftest.mp4');
  console.log('🎬 montando 3 clipes do piloto ->', out);
  await assembleVideo(pilot, out);

  assert(existsSync(out), 'saída não foi criada');
  const durs = await Promise.all(pilot.map(probeDuration));
  const expected = durs.reduce((a, b) => a + b, 0);
  const got = await probeDuration(out);
  console.log(`   duração esperada ~${expected.toFixed(1)}s | obtida ${got.toFixed(1)}s`);
  assert(Math.abs(got - expected) < 2.0, `duração fora do esperado (${got} vs ${expected})`);
  console.log('✅ montagem OK — 1 MP4 9:16 válido a partir de N clipes');
}

// CLI
const [, , outArg, ...clipArgs] = process.argv;
if (outArg && clipArgs.length) {
  assembleVideo(clipArgs, outArg)
    .then((o) => console.log('✅ montado:', o))
    .catch((e) => { console.error('❌', e.message); process.exit(1); });
} else {
  selfTest();
}
