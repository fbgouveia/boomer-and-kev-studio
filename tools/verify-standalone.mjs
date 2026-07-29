import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const standaloneDir = path.resolve('.next/standalone');
const forbiddenNames = new Set(['.tmp']);
const maxBytes = 200 * 1024 * 1024;

async function inspectTree(directory) {
  let bytes = 0;
  const forbidden = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (forbiddenNames.has(entry.name)) forbidden.push(entryPath);

    if (entry.isDirectory()) {
      const child = await inspectTree(entryPath);
      bytes += child.bytes;
      forbidden.push(...child.forbidden);
    } else if (entry.isFile()) {
      bytes += (await stat(entryPath)).size;
    }
  }

  return { bytes, forbidden };
}

try {
  await stat(path.join(standaloneDir, 'server.js'));
  const result = await inspectTree(standaloneDir);
  const megabytes = (result.bytes / 1024 / 1024).toFixed(1);

  if (result.forbidden.length > 0) {
    throw new Error(`artefato contém diretório proibido: ${result.forbidden.join(', ')}`);
  }
  if (result.bytes > maxBytes) {
    throw new Error(`artefato tem ${megabytes} MB; limite operacional: 200 MB`);
  }

  console.log(`Standalone válido: server.js presente, ${megabytes} MB, sem .tmp.`);
} catch (error) {
  console.error(`Standalone inválido: ${error.message}`);
  process.exitCode = 1;
}
