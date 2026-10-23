import { writeFile, readFile } from 'node:fs/promises';
import { openApiDocument } from '../src/contracts/openapi.js';

const target = new URL('../contracts/openapi.json', import.meta.url);
if (process.argv.includes('--check')) {
  const existing: unknown = JSON.parse(await readFile(target, 'utf8'));
  if (JSON.stringify(existing) !== JSON.stringify(openApiDocument))
    throw new Error('Contrato desactualizado. Ejecutar npm run api:generate.');
  console.log('Contrato actualizado.');
} else {
  await writeFile(target, JSON.stringify(openApiDocument, null, 2) + '\n');
  console.log('contracts/openapi.json generado.');
}
