import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { httpFixture, objectIdSchema, pageIdsSchema } from '../helpers/http.js';

await test('comunidades privadas, roles, comentarios, respuestas y notificaciones', async (t) => {
  const fixture = await httpFixture();
  t.after(fixture.close);
  const { account, request } = fixture;
  const owner = await account();
  const member = await account();
  const stranger = await account();
  const create = await request(
    '/communities',
    'POST',
    {
      name: 'Private test',
      slug: `private-${randomUUID()}`,
      description: 'Private discussion',
      visibility: 'private',
    },
    owner.cookie,
  );
  assert.equal(create.status, 201, await create.clone().text());
  const community = objectIdSchema.parse(await create.json());
  const communityPath = `/communities/${community.id}`;
  assert.equal((await request(communityPath)).status, 404);
  assert.equal((await request(`${communityPath}/members`)).status, 404);
  assert.equal(
    (await request(`${communityPath}/membership`, 'PUT', {}, member.cookie)).status,
    403,
  );
  assert.equal(
    (
      await request(
        `${communityPath}/members/${member.id}`,
        'PUT',
        { role: 'moderator' },
        stranger.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `${communityPath}/members/${member.id}`,
        'PUT',
        { role: 'moderator' },
        owner.cookie,
      )
    ).status,
    204,
  );
  assert.equal((await request(communityPath, 'GET', undefined, member.cookie)).status, 200);
  assert.equal(
    pageIdsSchema.parse(
      await (await request(`${communityPath}/members`, 'GET', undefined, member.cookie)).json(),
    ).items.length,
    2,
  );
  assert.equal(
    (
      await request(
        `${communityPath}/members/${stranger.id}`,
        'PUT',
        { role: 'moderator' },
        member.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (await request(`${communityPath}/members/${owner.id}`, 'DELETE', undefined, member.cookie))
      .status,
    409,
  );
  assert.equal(
    (await request(`${communityPath}/membership`, 'DELETE', undefined, owner.cookie)).status,
    409,
  );
  assert.equal(
    (await request(communityPath, 'PATCH', { name: 'stolen' }, member.cookie)).status,
    403,
  );
  const postResponse = await request(
    '/posts',
    'POST',
    { content: 'Private community post', communityId: community.id },
    owner.cookie,
  );
  assert.equal(postResponse.status, 201, await postResponse.clone().text());
  const post = objectIdSchema.parse(await postResponse.json());
  assert.equal((await request(`/posts/${post.id}`)).status, 404);
  assert.equal((await request(`/posts/${post.id}/comments`)).status, 404);
  assert.equal(
    (await request(`/posts/${post.id}/reaction`, 'PUT', { reaction: 'like' }, stranger.cookie))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        '/posts',
        'POST',
        { content: 'forbidden', communityId: community.id },
        stranger.cookie,
      )
    ).status,
    403,
  );

  const parentResponse = await request(
    `/posts/${post.id}/comments`,
    'POST',
    { content: 'A comment' },
    member.cookie,
  );
  assert.equal(parentResponse.status, 201, await parentResponse.clone().text());
  const parent = objectIdSchema.parse(await parentResponse.json());
  const replyResponse = await request(
    `/posts/${post.id}/comments`,
    'POST',
    { content: 'A reply', parentId: parent.id },
    owner.cookie,
  );
  assert.equal(replyResponse.status, 201);
  const reply = objectIdSchema.parse(await replyResponse.json());
  assert.equal(
    (await request(`/comments/${parent.id}`, 'PATCH', { content: 'forbidden' }, owner.cookie))
      .status,
    403,
  );
  assert.equal(
    (await request(`/comments/${parent.id}`, 'PATCH', { content: 'updated' }, member.cookie))
      .status,
    200,
  );
  assert.equal(
    (await request(`/comments/${parent.id}/reaction`, 'PUT', { reaction: 'love' }, owner.cookie))
      .status,
    204,
  );
  assert.equal(
    (await request(`/comments/${parent.id}/reaction`, 'PUT', { reaction: 'love' }, owner.cookie))
      .status,
    204,
  );
  const comments = pageIdsSchema.parse(
    await (await request(`/posts/${post.id}/comments`, 'GET', undefined, member.cookie)).json(),
  );
  assert.equal(comments.items.length, 2);
  const secondPostResponse = await request(
    '/posts',
    'POST',
    { content: 'another', communityId: community.id },
    owner.cookie,
  );
  const secondPost = objectIdSchema.parse(await secondPostResponse.json());
  assert.equal(
    (
      await request(
        `/posts/${secondPost.id}/comments`,
        'POST',
        { content: 'invalid cross post reply', parentId: parent.id },
        member.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request(`/comments/${reply.id}`, 'DELETE', undefined, member.cookie)).status,
    403,
  );

  const notifications = pageIdsSchema.parse(
    await (await request('/notifications', 'GET', undefined, member.cookie)).json(),
  );
  assert.equal(notifications.items.length, 2);
  const notification = notifications.items[0];
  assert.equal(
    (await request(`/notifications/${notification.id}/read`, 'PUT', {}, stranger.cookie)).status,
    404,
  );
  assert.equal(
    (await request(`/notifications/${notification.id}/read`, 'PUT', {}, member.cookie)).status,
    204,
  );
  assert.equal(
    pageIdsSchema.parse(
      await (await request('/notifications?unread=true', 'GET', undefined, member.cookie)).json(),
    ).items.length,
    1,
  );
  assert.equal((await request('/notifications/read', 'PUT', {}, member.cookie)).status, 204);
  assert.equal(
    pageIdsSchema.parse(
      await (await request('/notifications?unread=true', 'GET', undefined, member.cookie)).json(),
    ).items.length,
    0,
  );
  assert.equal((await request('/notifications')).status, 401);
  assert.equal(
    (await request(`${communityPath}/members/${member.id}`, 'DELETE', undefined, owner.cookie))
      .status,
    204,
  );
  assert.equal((await request(`/posts/${post.id}`, 'GET', undefined, member.cookie)).status, 404);
  assert.equal(
    pageIdsSchema.parse(
      await (await request('/notifications', 'GET', undefined, member.cookie)).json(),
    ).items.length,
    0,
  );

  const publicResponse = await request(
    '/communities',
    'POST',
    { name: 'Public test', slug: `public-${randomUUID()}`, description: 'Open discussion' },
    owner.cookie,
  );
  const publicCommunity = objectIdSchema.parse(await publicResponse.json());
  assert.equal(
    (await request(`/communities/${publicCommunity.id}/membership`, 'PUT', {}, member.cookie))
      .status,
    204,
  );
  assert.equal(
    (await request(`/communities/${publicCommunity.id}/membership`, 'PUT', {}, member.cookie))
      .status,
    204,
  );
  const publicDetails = z
    .object({ membersCount: z.number() })
    .parse(await (await request(`/communities/${publicCommunity.id}`)).json());
  assert.equal(publicDetails.membersCount, 2);
  assert.equal(
    (
      await request(
        `${communityPath}/members/${member.id}`,
        'PUT',
        { role: 'moderator' },
        owner.cookie,
      )
    ).status,
    204,
  );
  assert.equal(
    (await request(`/posts/${post.id}`, 'DELETE', undefined, member.cookie)).status,
    204,
  );
  assert.equal(
    (await request(`/posts/${post.id}/comments`, 'GET', undefined, owner.cookie)).status,
    404,
  );
  assert.equal((await request(communityPath, 'DELETE', undefined, owner.cookie)).status, 204);
  assert.equal((await request(communityPath, 'GET', undefined, owner.cookie)).status, 404);
});
