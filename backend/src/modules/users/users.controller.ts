import type { RequestHandler } from 'express';
import { authenticated } from '../../middleware/require-session.js';
import { idParamsSchema } from '../../shared/validation.js';
import { paginationSchema } from '../../shared/http/pagination.js';
import { usersQuerySchema, updateProfileSchema } from './users.validation.js';
import * as service from './users.service.js';

export const list: RequestHandler = async (request, response) => {
  response.json(
    await service.listUsers(
      usersQuerySchema.parse(request.query),
      request.session?.user.id || null,
    ),
  );
};
export const get: RequestHandler = async (request, response) => {
  const { id } = idParamsSchema.parse(request.params);
  response.json(await service.getProfile(id, request.session?.user.id || null));
};
export const me: RequestHandler = async (request, response) => {
  const user = authenticated(request).user;
  response.json({ ...(await service.getProfile(user.id, user.id)), email: user.email });
};
export const update: RequestHandler = async (request, response) => {
  response.json(
    await service.updateProfile(
      authenticated(request).user.id,
      updateProfileSchema.parse(request.body),
    ),
  );
};
export const follow: RequestHandler = async (request, response) => {
  await service.follow(authenticated(request).user.id, idParamsSchema.parse(request.params).id);
  response.sendStatus(204);
};
export const unfollow: RequestHandler = async (request, response) => {
  await service.unfollow(authenticated(request).user.id, idParamsSchema.parse(request.params).id);
  response.sendStatus(204);
};
export function listRelations(kind: 'followers' | 'following'): RequestHandler {
  return async (request, response) => {
    const { id } = idParamsSchema.parse(request.params);
    await service.getProfile(id, request.session?.user.id || null);
    response.json(
      await service.listUsers(
        paginationSchema.parse(request.query),
        request.session?.user.id || null,
        { userId: id, kind },
      ),
    );
  };
}
