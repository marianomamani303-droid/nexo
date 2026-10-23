import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { randomUUID, scryptSync } from 'node:crypto';
import { z } from 'zod';
import { config } from '../../src/config/env.js';
import { execute, select } from '../../src/database/query.js';
import { transaction } from '../../src/database/transaction.js';
import { errorCode } from '../../src/shared/errors/app-error.js';
import { httpFixture } from '../helpers/http.js';

await test('cabeceras, CORS, CSRF, errores, límites y rechazo de JWT inválidos', async (t) => {
  const fixture = await httpFixture();
  t.after(fixture.close);
  const { base, request, account } = fixture;
  const user = await account();
  const response = await request('/health');
  assert.equal((await request('/health/ready')).status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy') || '', /default-src/);
  assert.ok(response.headers.get('x-request-id'));
  const preflight = await fetch(base + '/posts', {
    method: 'OPTIONS',
    headers: {
      Origin: config.origin,
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'Content-Type,X-Nexo-CSRF',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), config.origin);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  assert.match(preflight.headers.get('access-control-allow-methods') || '', /PATCH/);
  assert.equal(
    (
      await fetch(base + '/posts', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      })
    ).status,
    403,
  );
  const missingCsrf = await fetch(base + '/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: user.cookie },
    body: JSON.stringify({ content: 'CSRF' }),
  });
  assert.equal(missingCsrf.status, 403);
  const malformed = await fetch(base + '/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nexo-CSRF': '1' },
    body: '{bad',
  });
  assert.equal(malformed.status, 400);
  const error = z
    .object({ code: z.string(), requestId: z.uuid(), message: z.string() })
    .parse(await malformed.json());
  assert.equal(error.code, 'INVALID_JSON');
  assert.equal(error.requestId, malformed.headers.get('x-request-id'));
  assert.equal(
    (await request('/posts', 'POST', { content: 'x'.repeat(140000) }, user.cookie)).status,
    413,
  );
  for (const options of [
    { audience: 'nexo-web', issuer: 'nexo', algorithm: 'HS384' as const },
    { audience: 'wrong', issuer: 'nexo', algorithm: 'HS256' as const },
    { audience: 'nexo-web', issuer: 'wrong', algorithm: 'HS256' as const },
    { audience: 'nexo-web', issuer: 'nexo', algorithm: 'HS256' as const, expiresIn: -10 },
  ]) {
    const token = jwt.sign({}, config.secret, {
      subject: user.id,
      jwtid: randomUUID(),
      ...options,
    });
    assert.equal(
      (await request('/auth/session', 'GET', undefined, `nexo_session=${token}`)).status,
      401,
    );
  }
  assert.equal((await request('/users?limit=2&q=%27%20OR%201%3D1%20--')).status, 200);
  const unknown = await request('/missing-endpoint');
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.text()).includes('Error:'), false);
  const [clock] = await select<{ zone: string; now: Date }>(
    'SELECT @@session.time_zone AS zone, UTC_TIMESTAMP(3) AS now',
  );
  assert.equal(clock.zone, '+00:00');
  assert.ok(Math.abs(Date.now() - clock.now.getTime()) < 5000);
  const salt = randomUUID().replaceAll('-', '');
  const legacyHash = `scrypt:${salt}:${scryptSync('prueba-12345', salt, 64).toString('hex')}`;
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [legacyHash, user.id]);
  assert.equal(
    (await request('/auth/login', 'POST', { email: user.email, password: 'prueba-12345' })).status,
    200,
  );
  const [updated] = await select<{ passwordHash: string }>(
    'SELECT password_hash AS passwordHash FROM users WHERE id = ?',
    [user.id],
  );
  assert.match(updated.passwordHash, /^scrypt-v2:/);
  const other = await account();
  const publicSchema = z.object({ handle: z.string(), name: z.string() });
  const otherProfile = publicSchema.parse(await (await request(`/users/${other.id}`)).json());
  assert.equal(
    (
      await request(
        '/users/me',
        'PATCH',
        { handle: otherProfile.handle, name: 'must roll back' },
        user.cookie,
      )
    ).status,
    409,
  );
  const preserved = publicSchema.parse(await (await request(`/users/${user.id}`)).json());
  assert.equal(preserved.name, 'Integration Test');
  await assert.rejects(
    transaction(async (database) => {
      await execute(
        'UPDATE user_profiles SET display_name = ? WHERE user_id = ?',
        ['must roll back', user.id],
        database,
      );
      // The second statement fails after the first write, exercising a real multi-statement rollback.
      await execute(
        'INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)',
        [user.id, 'duplicate'],
        database,
      );
    }),
    (error: unknown) => errorCode(error) === 'ER_DUP_ENTRY',
  );
  const rolledBack = publicSchema.parse(await (await request(`/users/${user.id}`)).json());
  assert.equal(rolledBack.name, 'Integration Test');
  // Invalid bodies use the same credential limiter without expensive hash work.
  let limited: Response | undefined;
  for (let index = 0; index < 32; index++) limited = await request('/auth/login', 'POST', {});
  assert.equal(limited?.status, 429);
  assert.ok(limited?.headers.get('retry-after'));
});
