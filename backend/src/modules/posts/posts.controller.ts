import type { RequestHandler } from 'express';
import { authenticated } from '../../middleware/require-session.js';
import { idParamsSchema } from '../../shared/validation.js';
import * as service from './posts.service.js';
import {
  createPostSchema,
  postsQuerySchema,
  reactionBodySchema,
  updatePostSchema,
} from './posts.validation.js';

export function list(mode: 'all' | 'following' | 'bookmarks' = 'all'): RequestHandler {
  return async (request, response) => {
    response.json(
      await service.listPosts(
        postsQuerySchema.parse(request.query),
        request.session?.user.id || null,
        mode,
      ),
    );
  };
}
export const get: RequestHandler = async (request, response) => {
  response.json(
    await service.getPost(
      idParamsSchema.parse(request.params).id,
      request.session?.user.id || null,
    ),
  );
};
export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(
      await service.createPost(
        authenticated(request).user.id,
        createPostSchema.parse(request.body),
      ),
    );
};
export const update: RequestHandler = async (request, response) => {
  response.json(
    await service.updatePost(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      updatePostSchema.parse(request.body),
    ),
  );
};
export const remove: RequestHandler = async (request, response) => {
  await service.deletePost(idParamsSchema.parse(request.params).id, authenticated(request).user.id);
  response.sendStatus(204);
};
export function react(remove = false): RequestHandler {
  return async (request, response) => {
    await service.react(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      remove ? null : reactionBodySchema.parse(request.body).reaction,
    );
    response.sendStatus(204);
  };
}
export function bookmark(saved: boolean): RequestHandler {
  return async (request, response) => {
    await service.bookmark(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      saved,
    );
    response.sendStatus(204);
  };
}
