import type { RequestHandler } from 'express';
import { authenticated } from '../../middleware/require-session.js';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idParamsSchema } from '../../shared/validation.js';
import { reactionBodySchema } from '../posts/posts.validation.js';
import * as service from './comments.service.js';
import { createCommentSchema, updateCommentSchema } from './comments.validation.js';

export const list: RequestHandler = async (request, response) => {
  response.json(
    await service.listComments(
      idParamsSchema.parse(request.params).id,
      request.session?.user.id || null,
      paginationSchema.parse(request.query),
    ),
  );
};
export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(
      await service.createComment(
        idParamsSchema.parse(request.params).id,
        authenticated(request).user.id,
        createCommentSchema.parse(request.body),
      ),
    );
};
export const update: RequestHandler = async (request, response) => {
  response.json(
    await service.updateComment(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      updateCommentSchema.parse(request.body).content,
    ),
  );
};
export const remove: RequestHandler = async (request, response) => {
  await service.deleteComment(
    idParamsSchema.parse(request.params).id,
    authenticated(request).user.id,
  );
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
