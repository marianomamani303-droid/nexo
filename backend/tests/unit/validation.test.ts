import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { decodeCursor, pageOf, paginationSchema } from '../../src/shared/http/pagination.js';
import { createPostSchema, updatePostSchema } from '../../src/modules/posts/posts.validation.js';
import { verifyPassword } from '../../src/shared/security/password.js';

await test('cursor estable con desempate, vinculado a filtros y con límite acotado', () => {
  const rows = [1, 2, 3].map(() => ({
    id: randomUUID(),
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
  }));
  const page = pageOf(rows, 2, 'scope-a');
  assert.equal(page.items.length, 2);
  assert.ok(page.nextCursor);
  assert.equal(decodeCursor(page.nextCursor, 'scope-a')?.id, rows[1].id);
  assert.throws(() => decodeCursor(page.nextCursor || undefined, 'scope-b'));
  assert.throws(() => decodeCursor('garbage', 'scope-a'));
  assert.equal(pageOf(rows, 3, 'scope-a').nextCursor, null);
  for (const limit of ['0', '-1', '101', '1.5', 'NaN', ['2', '3']])
    assert.equal(paginationSchema.safeParse({ limit }).success, false);
});
await test('validación estricta impide suplantación y combinaciones inválidas de visibilidad', () => {
  assert.equal(
    createPostSchema.safeParse({ content: 'text', authorId: randomUUID() }).success,
    false,
  );
  assert.equal(
    createPostSchema.safeParse({ content: 'text', visibility: 'community' }).success,
    false,
  );
  assert.equal(
    createPostSchema.safeParse({ content: 'text', communityId: randomUUID(), visibility: 'public' })
      .success,
    false,
  );
  assert.equal(updatePostSchema.safeParse({}).success, false);
});
await test('hashes inválidos fallan sin ejecutar parámetros controlados por el atacante', async () => {
  for (const encoded of ['scrypt:x:00', 'scrypt:' + 'a'.repeat(32) + ':bad', 'unknown:hash', '']) {
    assert.equal(await verifyPassword('password', encoded), false);
  }
});
