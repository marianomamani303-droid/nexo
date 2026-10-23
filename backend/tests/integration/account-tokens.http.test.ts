import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { select, execute } from '../../src/database/query.js';
import { httpFixture } from '../helpers/http.js';

void test('tokens de cuenta: uso único, verificación y revocación de sesiones', async () => {
  const fixture = await httpFixture();
  try {
    const user = await fixture.account();
    const resetToken = 'a'.repeat(64);
    const verifyToken = 'b'.repeat(64);
    const hash = (token: string) => createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await execute(
      'INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      [
        hash(resetToken),
        user.id,
        'reset',
        expiresAt,
        hash(verifyToken),
        user.id,
        'verify',
        expiresAt,
      ],
    );

    const verified = await fixture.request('/auth/verify-email', 'POST', { token: verifyToken });
    assert.equal(verified.status, 204, await verified.clone().text());
    const [account] = await select<{ verifiedAt: Date | null }>(
      'SELECT email_verified_at AS verifiedAt FROM users WHERE id = ?',
      [user.id],
    );
    assert.ok(account.verifiedAt instanceof Date);
    assert.equal(
      (await fixture.request('/auth/verify-email', 'POST', { token: verifyToken })).status,
      400,
    );

    const reset = await fixture.request('/auth/reset-password', 'POST', {
      token: resetToken,
      password: 'nueva-contraseña-123',
    });
    assert.equal(reset.status, 204, await reset.clone().text());
    assert.equal(
      (await fixture.request('/auth/session', 'GET', undefined, user.cookie)).status,
      401,
    );
    assert.equal(
      (
        await fixture.request('/auth/login', 'POST', {
          email: user.email,
          password: 'prueba-12345',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fixture.request('/auth/login', 'POST', {
          email: user.email,
          password: 'nueva-contraseña-123',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fixture.request('/auth/reset-password', 'POST', {
          token: resetToken,
          password: 'otra-contraseña-123',
        })
      ).status,
      400,
    );
  } finally {
    await fixture.close();
  }
});
