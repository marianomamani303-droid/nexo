import { randomUUID } from 'node:crypto';
import { transaction } from '../../database/transaction.js';
import { forbidden, notFound } from '../../shared/errors/app-error.js';
import * as repository from './projects.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.validation.js';

export async function getProject(id: string, viewerId: string | null) {
  const project = await repository.findProject(id, viewerId);
  if (!project) notFound('Proyecto');
  return project;
}
export async function createProject(userId: string, input: CreateProjectInput) {
  const id = randomUUID();
  await transaction((database) => repository.insertProject(id, userId, input, database));
  return getProject(id, userId);
}
export async function updateProject(id: string, userId: string, input: UpdateProjectInput) {
  await transaction(async (database) => {
    const project = await repository.findProject(id, userId, database, true);
    if (!project) notFound('Proyecto');
    if (project.authorId !== userId) forbidden();
    await repository.updateProject(id, input, database);
  });
  return getProject(id, userId);
}
export async function deleteProject(id: string, userId: string) {
  await transaction(async (database) => {
    const project = await repository.findProject(id, userId, database, true);
    if (!project) notFound('Proyecto');
    if (project.authorId !== userId) forbidden();
    await repository.deleteProject(id, database);
  });
}
export const listProjects = repository.listProjects;
