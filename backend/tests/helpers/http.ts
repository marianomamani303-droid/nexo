import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { pool, databaseOptions } from '../../src/config/database.js';
import { execute } from '../../src/database/query.js';

const createdUserSchema = z.object({ user: z.object({ id: z.uuid() }) });
export const objectIdSchema = z.object({ id: z.uuid() });
export const pageIdsSchema = z.object({
  items: z.array(objectIdSchema),
  nextCursor: z.string().nullable(),
});

export async function httpFixture() {
  assert.equal(process.env.NODE_ENV === 'production', false, 'Tests cannot run in production.');
  assert.ok(
    ['127.0.0.1', 'localhost', '::1'].includes(String(databaseOptions.host)),
    'Integration tests require a local database.',
  );
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const userIds: string[] = [];

  async function request(path: string, method = 'GET', body?: unknown, cookie = '') {
    return fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Nexo-CSRF': '1', cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function account() {
    const email = `integration-${randomUUID()}@example.com`;
    const response = await request('/auth/register', 'POST', {
      email,
      name: 'Integration Test',
      password: 'prueba-12345',
    });
    assert.equal(response.status, 201, await response.clone().text());
    const { user } = createdUserSchema.parse(await response.json());
    userIds.push(user.id);
    return { id: user.id, email, cookie: (response.headers.get('set-cookie') || '').split(';')[0] };
  }
  async function close() {
    try {
      if (userIds.length) {
        const slots = userIds.map(() => '?').join(',');
        // Cleanup is restricted to randomly generated fixture accounts; no existing account is selected.
        await execute(
          `DELETE FROM notifications WHERE recipient_id IN (${slots}) OR actor_id IN (${slots})`,
          [...userIds, ...userIds],
        );
        await execute(
          `DELETE FROM message_media WHERE message_id IN (SELECT id FROM messages WHERE sender_id IN (${slots}))`,
          userIds,
        );
        await execute(
          `UPDATE messages SET reply_to_message_id = NULL WHERE sender_id IN (${slots})`,
          userIds,
        );
        await execute(`DELETE FROM messages WHERE sender_id IN (${slots})`, userIds);
        await execute(`DELETE FROM conversation_members WHERE user_id IN (${slots})`, userIds);
        await execute(`DELETE FROM conversations WHERE created_by IN (${slots})`, userIds);
        await execute(
          `DELETE FROM comment_reactions WHERE user_id IN (${slots}) OR comment_id IN (SELECT id FROM comments WHERE author_id IN (${slots}))`,
          [...userIds, ...userIds],
        );
        await execute(
          `UPDATE comments SET parent_comment_id = NULL WHERE author_id IN (${slots})`,
          userIds,
        );
        await execute(`DELETE FROM comments WHERE author_id IN (${slots})`, userIds);
        await execute(`DELETE FROM post_bookmarks WHERE user_id IN (${slots})`, userIds);
        await execute(`DELETE FROM post_reactions WHERE user_id IN (${slots})`, userIds);
        await execute(`DELETE FROM posts WHERE author_id IN (${slots})`, userIds);
        await execute(`DELETE FROM community_members WHERE user_id IN (${slots})`, userIds);
        await execute(`DELETE FROM communities WHERE owner_id IN (${slots})`, userIds);
        await execute(
          `DELETE FROM user_follows WHERE follower_id IN (${slots}) OR followed_id IN (${slots})`,
          [...userIds, ...userIds],
        );
        await execute(`DELETE FROM projects WHERE author_id IN (${slots})`, userIds);
        await execute(`DELETE FROM users WHERE id IN (${slots})`, userIds);
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pool.end();
    }
  }
  return { request, account, close, base };
}
