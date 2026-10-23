import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const requested = process.argv[2] || 'all';
if (!['all', 'unit', 'integration'].includes(requested))
  throw new Error('Usar all, unit o integration.');
const groups = requested === 'all' ? ['unit', 'integration'] : [requested];
const files: string[] = [];
for (const group of groups) {
  const directory = new URL(`../tests/${group}/`, import.meta.url);
  for (const file of (await readdir(directory)).sort()) {
    if (file.endsWith('.test.ts')) files.push(fileURLToPath(new URL(file, directory)));
  }
}
const child = spawn(
  process.execPath,
  ['--import', 'tsx', '--test', '--test-concurrency=1', ...files],
  {
    stdio: 'inherit',
    env: process.env,
  },
);
child.on('error', () => {
  console.error('No se pudo ejecutar el runner de pruebas.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
