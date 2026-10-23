import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { httpFixture } from '../helpers/http.js';
import { pool } from '../../src/config/database.js';
import { hashPassword, verifyPassword } from '../../src/shared/security/password.js';
const fixture = await httpFixture();
const base = fixture.base + '/auth';
after(fixture.close);
void test('contraseñas con sal y verificación', async () => {
  const hash = await hashPassword('prueba-12345');
  assert.notEqual(hash, await hashPassword('prueba-12345'));
  assert.equal(await verifyPassword('prueba-12345', hash), true);
  assert.equal(await verifyPassword('incorrecta', hash), false);
});
void test('rechaza JWT ausentes y manipulados', async () => {
  for (const cookie of ['', 'nexo_session=invalid.jwt.signature']) {
    const response = await fetch(base + '/session', { headers: { cookie } });
    assert.equal(response.status, 401);
    assert.match(response.headers.get('set-cookie') || '', /HttpOnly/);
    assert.match(response.headers.get('set-cookie') || '', /SameSite=Lax/);
  }
});
void test('rechaza origen externo y mutaciones sin CSRF', async () => {
  assert.equal(
    (
      await fetch(base + '/login', {
        method: 'POST',
        headers: { Origin: 'https://attacker.example', 'X-Nexo-CSRF': '1' },
      })
    ).status,
    403,
  );
  assert.equal((await fetch(base + '/logout', { method: 'POST' })).status, 403);
});
void test('valida registro antes de acceder a MySQL', async () => {
  const response = await fetch(base + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nexo-CSRF': '1' },
    body: JSON.stringify({ email: 'invalid', name: 'A', password: 'short' }),
  });
  assert.equal(response.status, 400);
});
void test('logout sin sesión elimina la cookie', async () => {
  const response = await fetch(base + '/logout', {
    method: 'POST',
    headers: { 'X-Nexo-CSRF': '1' },
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('set-cookie') || '', /Expires=Thu, 01 Jan 1970/);
});
void test('MySQL: registro, duplicado, login, restauración y revocación real', async () => {
  const email = `auth-test-${randomUUID()}@example.com`;
  const post = (path: string, body: unknown, cookie = '') =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Nexo-CSRF': '1', cookie },
      body: JSON.stringify(body),
    });
  try {
    const response = await post('/register', {
      name: 'Prueba temporal',
      email,
      password: 'prueba-12345',
    });
    assert.equal(response.status, 201);
    const data = z
      .object({
        user: z.object({ email: z.string() }),
        password: z.unknown().optional(),
        token: z.unknown().optional(),
      })
      .parse(await response.json());
    assert.equal(data.user.email, email);
    assert.equal(data.password, undefined);
    assert.equal(data.token, undefined);
    const setCookie = response.headers.get('set-cookie') || '';
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    const firstCookie = setCookie.split(';')[0];
    assert.equal(
      (await fetch(base + '/session', { headers: { cookie: firstCookie } })).status,
      200,
    );
    assert.equal(
      (await post('/register', { name: 'Prueba temporal', email, password: 'prueba-12345' }))
        .status,
      409,
    );
    assert.equal((await post('/login', { email, password: 'incorrecta' })).status, 401);
    const login = await post(
      '/login',
      { email: email.toUpperCase(), password: 'prueba-12345' },
      firstCookie,
    );
    assert.equal(login.status, 200);
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    assert.equal(
      (await fetch(base + '/session', { headers: { cookie: firstCookie } })).status,
      401,
    );
    assert.equal((await fetch(base + '/session', { headers: { cookie } })).status, 200);
    assert.equal((await post('/logout', {}, cookie)).status, 204);
    assert.equal((await fetch(base + '/session', { headers: { cookie } })).status, 401);
  } finally {
    // Only the unique account created by this test is removed; profile/session FKs cascade.
    await pool.execute('DELETE FROM users WHERE email = ?', [email]);
  }
});
