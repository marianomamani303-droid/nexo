import { z } from 'zod';
import { idSchema } from '../../shared/validation.js';

const content = z.string().trim().min(1).max(1000);
export const createCommentSchema = z.strictObject({ content, parentId: idSchema.optional() });
export const updateCommentSchema = z.strictObject({ content });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
