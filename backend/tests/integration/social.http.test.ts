import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { execute } from '../../src/database/query.js';
import { httpFixture, objectIdSchema, pageIdsSchema } from '../helpers/http.js';

await test('perfiles, seguidores, publicaciones, permisos, feed, reacciones y guardados con MySQL', async (t) => {
  const fixture = await httpFixture();
  t.after(fixture.close);
  const { request, account } = fixture;
  const alice = await account();
  const bob = await account();
  const outsider = await account();

  assert.equal((await request('/users/me')).status, 401);
  assert.equal(
    (
      await request(
        '/users/me',
        'PATCH',
        { name: 'Alice Test', bio: 'hello', website: 'https://example.com' },
        alice.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request('/users/me', 'PATCH', { website: 'javascript:alert(1)' }, alice.cookie)).status,
    400,
  );
  const publicProfile = await request(`/users/${alice.id}`);
  const profile = z
    .object({ name: z.string(), email: z.unknown().optional() })
    .parse(await publicProfile.json());
  assert.equal(profile.name, 'Alice Test');
  assert.equal(profile.email, undefined);
  assert.equal((await request(`/users/${alice.id}/follow`, 'PUT', {}, alice.cookie)).status, 400);

  const created = await request(
    '/posts',
    'POST',
    { content: 'Followers only', visibility: 'followers' },
    alice.cookie,
  );
  assert.equal(created.status, 201, await created.clone().text());
  const post = objectIdSchema.parse(await created.json());
  assert.equal((await request(`/posts/${post.id}`)).status, 404);
  assert.equal((await request(`/posts/${post.id}`, 'GET', undefined, bob.cookie)).status, 404);
  assert.equal((await request(`/users/${alice.id}/follow`, 'PUT', {}, bob.cookie)).status, 204);
  assert.equal((await request(`/users/${alice.id}/follow`, 'PUT', {}, bob.cookie)).status, 204);
  assert.equal((await request(`/posts/${post.id}`, 'GET', undefined, bob.cookie)).status, 200);
  assert.equal(
    (await request(`/posts/${post.id}`, 'PATCH', { content: 'stolen' }, bob.cookie)).status,
    403,
  );
  assert.equal((await request(`/posts/${post.id}`, 'DELETE', undefined, bob.cookie)).status, 403);
  assert.equal(
    (await request(`/posts/${post.id}/reaction`, 'PUT', { reaction: 'love' }, bob.cookie)).status,
    204,
  );
  assert.equal(
    (await request(`/posts/${post.id}/reaction`, 'PUT', { reaction: 'like' }, bob.cookie)).status,
    204,
  );
  assert.equal(
    (await request(`/posts/${post.id}/reaction`, 'PUT', { reaction: 'like' }, outsider.cookie))
      .status,
    404,
  );
  assert.equal((await request(`/posts/${post.id}/bookmark`, 'PUT', {}, bob.cookie)).status, 204);
  assert.equal((await request(`/posts/${post.id}/bookmark`, 'PUT', {}, bob.cookie)).status, 204);
  const details = z
    .object({ reactionsCount: z.number(), viewerReaction: z.string(), bookmarked: z.boolean() })
    .parse(await (await request(`/posts/${post.id}`, 'GET', undefined, bob.cookie)).json());
  assert.equal(details.reactionsCount, 1);
  assert.equal(details.viewerReaction, 'like');
  assert.equal(details.bookmarked, true);
  assert.ok(
    pageIdsSchema
      .parse(await (await request('/feed', 'GET', undefined, bob.cookie)).json())
      .items.some((item) => item.id === post.id),
  );
  assert.ok(
    pageIdsSchema
      .parse(await (await request('/posts/bookmarks', 'GET', undefined, bob.cookie)).json())
      .items.some((item) => item.id === post.id),
  );
  assert.equal(
    (await request(`/users/${alice.id}/follow`, 'DELETE', undefined, bob.cookie)).status,
    204,
  );
  assert.equal((await request(`/posts/${post.id}`, 'GET', undefined, bob.cookie)).status, 404);
  assert.equal(
    pageIdsSchema
      .parse(await (await request('/posts/bookmarks', 'GET', undefined, bob.cookie)).json())
      .items.some((item) => item.id === post.id),
    false,
  );

  assert.equal(
    (await request('/posts', 'POST', { content: 'spoof', authorId: bob.id }, alice.cookie)).status,
    400,
  );
  assert.equal((await request('/posts', 'POST', { content: ' ' }, alice.cookie)).status, 400);
  assert.equal((await request('/posts', 'POST', { content: 'unauthenticated' })).status, 401);
  for (let index = 0; index < 4; index++)
    assert.equal(
      (await request('/posts', 'POST', { content: `paging-${alice.id}-${index}` }, alice.cookie))
        .status,
      201,
    );
  const query = `/posts?authorId=${alice.id}&limit=2`;
  await execute('UPDATE posts SET created_at = ? WHERE author_id = ? AND content LIKE ?', [
    new Date('2026-01-01T00:00:00.000Z'),
    alice.id,
    `paging-${alice.id}-%`,
  ]);
  const first = pageIdsSchema.parse(await (await request(query)).json());
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  const second = pageIdsSchema.parse(
    await (await request(`${query}&cursor=${first.nextCursor}`)).json(),
  );
  assert.equal(second.items.length, 2);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 4);
  assert.equal((await request(`/posts?limit=2&cursor=${first.nextCursor}`)).status, 400);
  assert.equal((await request('/posts?cursor=invalid')).status, 400);
  assert.equal((await request('/posts?limit=10000')).status, 400);
  assert.equal((await request(`/posts/${post.id}`, 'DELETE', undefined, alice.cookie)).status, 204);
  assert.equal((await request(`/posts/${post.id}`, 'GET', undefined, alice.cookie)).status, 404);
});
