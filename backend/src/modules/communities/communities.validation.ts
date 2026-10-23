import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idSchema, nonEmptyPatch } from '../../shared/validation.js';

const name = z.string().trim().min(2).max(120);
const description = z.string().trim().min(1).max(5000);
const category = z.string().trim().min(1).max(80).nullable();
const visibility = z.enum(['public', 'private']);
export const createCommunitySchema = z.strictObject({
  name,
  description,
  category: category.optional(),
  visibility: visibility.default('public'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{1,79}$/),
});
export const updateCommunitySchema = nonEmptyPatch({
  name: name.optional(),
  description: description.optional(),
  category: category.optional(),
  visibility: visibility.optional(),
});
export const communitiesQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(80).optional(),
});
export const memberParamsSchema = z.object({ id: idSchema, userId: idSchema });
export const memberRoleSchema = z.strictObject({
  role: z.enum(['member', 'moderator']).default('member'),
});
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type CommunityQuery = z.infer<typeof communitiesQuerySchema>;
export type CommunityRole = 'owner' | 'moderator' | 'member';
