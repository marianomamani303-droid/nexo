import type { RequestHandler } from 'express';
import { authenticated } from '../../middleware/require-session.js';
import { idParamsSchema } from '../../shared/validation.js';
import * as service from './projects.service.js';
import {
  createProjectSchema,
  projectsQuerySchema,
  updateProjectSchema,
} from './projects.validation.js';

export const list: RequestHandler = async (request, response) => {
  response.json(
    await service.listProjects(
      projectsQuerySchema.parse(request.query),
      request.session?.user.id || null,
    ),
  );
};
export const get: RequestHandler = async (request, response) => {
  response.json(
    await service.getProject(
      idParamsSchema.parse(request.params).id,
      request.session?.user.id || null,
    ),
  );
};
export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(
      await service.createProject(
        authenticated(request).user.id,
        createProjectSchema.parse(request.body),
      ),
    );
};
export const update: RequestHandler = async (request, response) => {
  response.json(
    await service.updateProject(
      idParamsSchema.parse(request.params).id,
      authenticated(request).user.id,
      updateProjectSchema.parse(request.body),
    ),
  );
};
export const remove: RequestHandler = async (request, response) => {
  await service.deleteProject(
    idParamsSchema.parse(request.params).id,
    authenticated(request).user.id,
  );
  response.sendStatus(204);
};
