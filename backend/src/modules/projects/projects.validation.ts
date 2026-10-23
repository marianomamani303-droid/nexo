import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idSchema, nonEmptyPatch } from '../../shared/validation.js';

const title = z.string().trim().min(1).max(160);
const description = z.string().trim().min(1).max(20000);
const status = z.enum(['draft', 'published', 'archived']);
const visibility = z.enum(['public', 'followers']);
export const createProjectSchema = z.strictObject({
  title,
  description,
  status: status.default('draft'),
  visibility: visibility.default('public'),
});
export const updateProjectSchema = nonEmptyPatch({
  title: title.optional(),
  description: description.optional(),
  status: status.optional(),
  visibility: visibility.optional(),
});
export const projectsQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  authorId: idSchema.optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectsQuery = z.infer<typeof projectsQuerySchema>;
