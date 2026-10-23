import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { execute } from '../../src/database/query.js';
import { httpFixture, objectIdSchema, pageIdsSchema } from '../helpers/http.js';

await test('mensajes privados: pertenencia, idempotencia concurrente, respuestas y lectura', async (t) => {
  const fixture = await httpFixture();
  t.after(fixture.close);
  const { account, request } = fixture;
  const alice = await account();
  const bob = await account();
  const stranger = await account();
  assert.equal((await request('/conversations')).status, 401);
  assert.equal(
    (await request('/conversations/direct', 'POST', { userId: alice.id }, alice.cookie)).status,
    400,
  );
  const concurrent = await Promise.all([
    request('/conversations/direct', 'POST', { userId: bob.id }, alice.cookie),
    request('/conversations/direct', 'POST', { userId: alice.id }, bob.cookie),
  ]);
  for (const response of concurrent)
    assert.equal(response.status, 200, await response.clone().text());
  const first = objectIdSchema.parse(await concurrent[0].json());
  const second = objectIdSchema.parse(await concurrent[1].json());
  assert.equal(first.id, second.id);
  const path = `/conversations/${first.id}/messages`;
  assert.equal((await request(path, 'GET', undefined, stranger.cookie)).status, 404);
  assert.equal(
    (await request(path, 'POST', { content: 'intrusion' }, stranger.cookie)).status,
    404,
  );
  const sent = await request(path, 'POST', { content: 'Hello Bob' }, alice.cookie);
  assert.equal(sent.status, 201, await sent.clone().text());
  const message = objectIdSchema.parse(await sent.json());
  const reply = await request(
    path,
    'POST',
    { content: 'Hello Alice', replyToId: message.id },
    bob.cookie,
  );
  assert.equal(reply.status, 201);
  assert.equal(
    (await request(`/messages/${message.id}`, 'PATCH', { content: 'forged' }, bob.cookie)).status,
    403,
  );
  assert.equal(
    (await request(`/messages/${message.id}`, 'DELETE', undefined, stranger.cookie)).status,
    404,
  );
  assert.equal(
    (await request(`/messages/${message.id}`, 'PATCH', { content: 'Hello Bob!' }, alice.cookie))
      .status,
    200,
  );
  const listed = pageIdsSchema.parse(
    await (await request(path, 'GET', undefined, bob.cookie)).json(),
  );
  assert.equal(listed.items.length, 2);
  const conversations = z.object({
    items: z.array(z.object({ id: z.uuid(), unreadCount: z.number() })),
  });
  assert.equal(
    conversations.parse(
      await (await request('/conversations', 'GET', undefined, bob.cookie)).json(),
    ).items[0].unreadCount,
    1,
  );
  assert.equal(
    (await request(`/conversations/${first.id}/read`, 'PUT', {}, bob.cookie)).status,
    204,
  );
  assert.equal(
    conversations.parse(
      await (await request('/conversations', 'GET', undefined, bob.cookie)).json(),
    ).items[0].unreadCount,
    0,
  );
  const other = objectIdSchema.parse(
    // A second conversation is used to reject cross-conversation replies.
    await (
      await request('/conversations/direct', 'POST', { userId: stranger.id }, alice.cookie)
    ).json(),
  );
  assert.equal(
    (
      await request(
        `/conversations/${other.id}/messages`,
        'POST',
        { content: 'wrong conversation', replyToId: message.id },
        alice.cookie,
      )
    ).status,
    400,
  );
  assert.equal((await request(path, 'POST', { content: ' ' }, bob.cookie)).status, 400);
  await execute(
    'UPDATE conversation_members SET last_read_at = UTC_TIMESTAMP(3) + INTERVAL 1 SECOND WHERE conversation_id = ? AND user_id = ?',
    [first.id, bob.id],
  );
  assert.equal(
    (await request(path, 'POST', { content: 'After read watermark' }, alice.cookie)).status,
    201,
  );
  assert.equal(
    conversations
      .parse(await (await request('/conversations', 'GET', undefined, bob.cookie)).json())
      .items.find((item) => item.id === first.id)?.unreadCount,
    1,
  );
  assert.equal(
    (await request(path, 'POST', { content: 'spoof sender', senderId: alice.id }, bob.cookie))
      .status,
    400,
  );
  assert.equal(
    (await request(`/messages/${message.id}`, 'DELETE', undefined, alice.cookie)).status,
    204,
  );
  assert.equal(
    pageIdsSchema.parse(await (await request(path, 'GET', undefined, bob.cookie)).json()).items
      .length,
    2,
  );
});
