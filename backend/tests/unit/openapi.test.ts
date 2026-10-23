import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
import { openApiDocument } from '../../src/contracts/openapi.js';

await test('OpenAPI válido con referencias resueltas e identificadores únicos', async () => {
  await SwaggerParser.validate(
    fileURLToPath(new URL('../../contracts/openapi.json', import.meta.url)),
  );
  const identifiers = new Set<string>();
  for (const operations of Object.values(openApiDocument.paths)) {
    for (const value of Object.values(operations)) {
      assert.ok(
        typeof value === 'object' &&
          value !== null &&
          'operationId' in value &&
          typeof value.operationId === 'string',
      );
      assert.equal(identifiers.has(value.operationId), false);
      identifiers.add(value.operationId);
    }
  }
  assert.ok(identifiers.size >= 50);
});
