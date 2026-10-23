import type { RequestHandler } from 'express';
import { authenticated } from '../../middleware/require-session.js';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idParamsSchema } from '../../shared/validation.js';
import * as service from './communities.service.js';
import {
  communitiesQuerySchema,
  createCommunitySchema,
  memberParamsSchema,
  memberRoleSchema,
  updateCommunitySchema,
} from './communities.validation.js';

export const list: RequestHandler = async (request, response) => {
  response.json(
    await service.listCommunities(
      communitiesQuerySchema.parse(request.query),
      request.session?.user.id || null,
    ),
  );
};
export const get: RequestHandler = async (request, response) => {
  response.json(
    await service.getCommunity(
      idParamsSchema.parse(request.params).id,
      request.session?.user.id || null,
    ),
  );
};
export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(
      await service.createCommunity(
        authenticated(request).user.id,
        createCommunitySchema.parse(request.body),
      ),
    );
};
export const update: RequestHandler = async (request, response) => {
  response.json(
    await service.updateCommunity(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      updateCommunitySchema.parse(request.body),
    ),
  );
};
export const remove: RequestHandler = async (request, response) => {
  await service.deleteCommunity(
    idParamsSchema.parse(request.params).id,
    authenticated(request).user.id,
  );
  response.sendStatus(204);
};
export const members: RequestHandler = async (request, response) => {
  const { id } = idParamsSchema.parse(request.params);
  await service.getCommunity(id, request.session?.user.id || null);
  response.json(
    await service.listMembers(
      id,
      request.session?.user.id || null,
      paginationSchema.parse(request.query),
    ),
  );
};
export const join: RequestHandler = async (request, response) => {
  await service.join(idParamsSchema.parse(request.params).id, authenticated(request).user.id);
  response.sendStatus(204);
};
export const leave: RequestHandler = async (request, response) => {
  const userId = authenticated(request).user.id;
  await service.removeMember(idParamsSchema.parse(request.params).id, userId, userId);
  response.sendStatus(204);
};
export const setMember: RequestHandler = async (request, response) => {
  const { id, userId } = memberParamsSchema.parse(request.params);
  await service.setMember(
    id,
    authenticated(request).user.id,
    userId,
    memberRoleSchema.parse(request.body).role,
  );
  response.sendStatus(204);
};
export const removeMember: RequestHandler = async (request, response) => {
  const { id, userId } = memberParamsSchema.parse(request.params);
  await service.removeMember(id, authenticated(request).user.id, userId);
  response.sendStatus(204);
};
