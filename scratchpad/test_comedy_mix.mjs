#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const clips = [1, 2, 3, 4].map((n) => path.resolve(root, `../00_Legacy_Archives/Piloto/cena${n}.mp4`));
const audioDir = path.resolve(root, 'public/assets/audio');
const outDir = path.resolve(root, '04_Delivery/audio_ab');
mkdirSync(outDir, { recursive: true });

const run = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] });
  let stdout = '';
  child.stdout.on('data', (chunk) => (stdout += chunk));
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${cmd} saiu com código ${code}`)));
});

const duration = async (file) => Number((await run('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
])).trim());

const durations = await Promise.all(clips.map(duration));
const total = durations.reduce((sum, value) => sum + value, 0);
const norm = clips.map((_, i) =>
  `[${i}:v]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,setsar=1,fps=24[v${i}]`
);
const concatIn = clips.map((_, i) => `[v${i}][${i}:a]`).join('');
const base = `${norm.join(';')};${concatIn}concat=n=${clips.length}:v=1:a=1[outv][outa]`;
const commonInputs = clips.flatMap((clip) => ['-i', clip]);
const commonOutput = ['-map', '[outv]', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest'];

const before = path.resolve(outDir, 'A_voice_only.mp4');
await run('ffmpeg', ['-y', ...commonInputs, '-filter_complex', base, '-map', '[outv]', '-map', '[outa]', ...commonOutput.slice(2), before]);

const drumsDelay = Math.round(total * 0.42 * 1000);
const laughDelay = Math.round(total * 0.72 * 1000);
const comedy =
  `${base};[outa]asplit=2[voice][key]` +
  `;[4:a]aloop=loop=-1:size=2147483647,atrim=duration=${total.toFixed(3)},volume=0.22[bed]` +
  `;[bed][key]sidechaincompress=threshold=0.025:ratio=10:attack=15:release=350[ducked]` +
  `;[5:a]atrim=duration=2.8,volume=0.72,adelay=${drumsDelay}:all=1[drums]` +
  `;[6:a]atrim=duration=2.4,volume=0.55,adelay=${laughDelay}:all=1[laugh]` +
  `;[voice][ducked][drums][laugh]amix=inputs=4:duration=longest:normalize=0,loudnorm=I=-14:LRA=7:TP=-2[finala]`;
const after = path.resolve(outDir, 'B_comedy_mix.mp4');
await run('ffmpeg', [
  '-y', ...commonInputs,
  '-i', path.resolve(audioDir, 'Funny_Song.mp3'),
  '-i', path.resolve(audioDir, 'Joke_Comedy_Drums.mp3'),
  '-i', path.resolve(audioDir, 'Hilarious_Laugh.mp3'),
  '-filter_complex', comedy, '-map', '[outv]', '-map', '[finala]', ...commonOutput.slice(2), after,
]);

console.log(JSON.stringify({ before, after, duration: total }, null, 2));
