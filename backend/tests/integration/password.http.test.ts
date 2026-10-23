import { test } from 'node:test';
import assert from 'node:assert/strict';
import { httpFixture } from '../helpers/http.js';

await test('cambio de contraseña revoca todas las sesiones y exige credencial actual', async (t) => {
  const fixture = await httpFixture();
  t.after(fixture.close);
  const { request, account } = fixture;
  const user = await account();
  const extraLogin = await request('/auth/login', 'POST', {
    email: user.email,
    password: 'prueba-12345',
  });
  assert.equal(extraLogin.status, 200);
  const extraCookie = (extraLogin.headers.get('set-cookie') || '').split(';')[0];
  assert.equal(
    (
      await request(
        '/auth/password',
        'POST',
        { currentPassword: 'incorrecta', newPassword: 'nueva-12345' },
        user.cookie,
      )
    ).status,
    401,
  );
  assert.equal((await request('/auth/session', 'GET', undefined, user.cookie)).status, 200);
  assert.equal(
    (
      await request(
        '/auth/password',
        'POST',
        { currentPassword: 'prueba-12345', newPassword: 'prueba-12345' },
        user.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        '/auth/password',
        'POST',
        { currentPassword: 'prueba-12345', newPassword: 'nueva-12345' },
        user.cookie,
      )
    ).status,
    204,
  );
  for (const cookie of [user.cookie, extraCookie])
    assert.equal((await request('/auth/session', 'GET', undefined, cookie)).status, 401);
  assert.equal(
    (await request('/auth/login', 'POST', { email: user.email, password: 'prueba-12345' })).status,
    401,
  );
  assert.equal(
    (await request('/auth/login', 'POST', { email: user.email, password: 'nueva-12345' })).status,
    200,
  );
});
