import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import { idSchema, nonEmptyPatch, reactionSchema } from '../../shared/validation.js';

const contentSchema = z.string().trim().min(1).max(3000);
const visibilitySchema = z.enum(['public', 'followers', 'community']);
export const createPostSchema = z
  .strictObject({
    content: contentSchema,
    category: z.string().trim().min(1).max(80).nullable().optional(),
    visibility: visibilitySchema.optional(),
    communityId: idSchema.optional(),
  })
  .refine(
    (input) =>
      input.communityId
        ? input.visibility === undefined || input.visibility === 'community'
        : input.visibility !== 'community',
    'La visibilidad no corresponde a la comunidad.',
  );
export const updatePostSchema = nonEmptyPatch({
  content: contentSchema.optional(),
  category: z.string().trim().min(1).max(80).nullable().optional(),
  visibility: visibilitySchema.optional(),
});
export const postsQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  authorId: idSchema.optional(),
  communityId: idSchema.optional(),
  category: z.string().trim().min(1).max(80).optional(),
});
export const reactionBodySchema = z.strictObject({ reaction: reactionSchema });
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostsQuery = z.infer<typeof postsQuerySchema>;
