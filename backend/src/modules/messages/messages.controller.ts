import type { RequestHandler } from 'express';
import { authenticated } from '../../middleware/require-session.js';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idParamsSchema } from '../../shared/validation.js';
import * as service from './messages.service.js';
import {
  directConversationSchema,
  sendMessageSchema,
  updateMessageSchema,
} from './messages.validation.js';

export const listConversations: RequestHandler = async (request, response) => {
  response.json(
    await service.listConversations(
      authenticated(request).user.id,
      paginationSchema.parse(request.query),
    ),
  );
};
export const createDirect: RequestHandler = async (request, response) => {
  response.json(
    await service.createDirect(
      authenticated(request).user.id,
      directConversationSchema.parse(request.body).userId,
    ),
  );
};
export const listMessages: RequestHandler = async (request, response) => {
  response.json(
    await service.listMessages(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      paginationSchema.parse(request.query),
    ),
  );
};
export const sendMessage: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(
      await service.sendMessage(
        idParamsSchema.parse(request.params).id,
        authenticated(request).user.id,
        sendMessageSchema.parse(request.body),
      ),
    );
};
export const updateMessage: RequestHandler = async (request, response) => {
  response.json(
    await service.updateMessage(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      updateMessageSchema.parse(request.body).content,
    ),
  );
};
export const deleteMessage: RequestHandler = async (request, response) => {
  await service.deleteMessage(
    idParamsSchema.parse(request.params).id,
    authenticated(request).user.id,
  );
  response.sendStatus(204);
};
export const markRead: RequestHandler = async (request, response) => {
  await service.markRead(idParamsSchema.parse(request.params).id, authenticated(request).user.id);
  response.sendStatus(204);
};
