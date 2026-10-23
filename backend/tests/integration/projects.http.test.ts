import { test } from 'node:test';
import assert from 'node:assert/strict';
import { httpFixture, objectIdSchema, pageIdsSchema } from '../helpers/http.js';

await test('proyectos con borradores privados, publicación, seguidores y borrado lógico', async (t) => {
  const fixture = await httpFixture();
  t.after(fixture.close);
  const { account, request } = fixture;
  const author = await account();
  const follower = await account();
  const stranger = await account();
  const created = await request(
    '/projects',
    'POST',
    { title: 'Test project', description: 'Project description' },
    author.cookie,
  );
  assert.equal(created.status, 201, await created.clone().text());
  const project = objectIdSchema.parse(await created.json());
  const path = `/projects/${project.id}`;
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(path, 'GET', undefined, follower.cookie)).status, 404);
  assert.equal((await request(path, 'GET', undefined, author.cookie)).status, 200);
  assert.equal(
    (await request(path, 'PATCH', { status: 'published', visibility: 'followers' }, author.cookie))
      .status,
    200,
  );
  assert.equal(
    (await request(`/users/${author.id}/follow`, 'PUT', {}, follower.cookie)).status,
    204,
  );
  assert.equal((await request(path, 'GET', undefined, follower.cookie)).status, 200);
  assert.equal((await request(path, 'GET', undefined, stranger.cookie)).status, 404);
  assert.equal((await request(path, 'PATCH', { title: 'stolen' }, follower.cookie)).status, 403);
  assert.equal((await request(path, 'DELETE', undefined, follower.cookie)).status, 403);
  assert.ok(
    pageIdsSchema
      .parse(
        await (
          await request(
            `/projects?authorId=${author.id}&q=description`,
            'GET',
            undefined,
            follower.cookie,
          )
        ).json(),
      )
      .items.some((item) => item.id === project.id),
  );
  assert.equal((await request(path, 'PATCH', { visibility: 'public' }, author.cookie)).status, 200);
  assert.equal((await request(path)).status, 200);
  assert.equal((await request(path, 'PATCH', { status: 'archived' }, author.cookie)).status, 200);
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(path, 'PATCH', {}, author.cookie)).status, 400);
  assert.equal(
    (
      await request(
        '/projects',
        'POST',
        { title: 'spoof', description: 'bad', authorId: stranger.id },
        author.cookie,
      )
    ).status,
    400,
  );
  assert.equal((await request(path, 'DELETE', undefined, author.cookie)).status, 204);
  assert.equal((await request(path, 'GET', undefined, author.cookie)).status, 404);
});
