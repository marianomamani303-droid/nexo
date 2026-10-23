import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import { nameSchema, nonEmptyPatch } from '../../shared/validation.js';

export const usersQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
});
const websiteSchema = z
  .url()
  .max(2048)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Usá una URL HTTP(S).');
export const updateProfileSchema = nonEmptyPatch({
  name: nameSchema.optional(),
  handle: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,30}$/)
    .transform((value) => value.toLowerCase())
    .optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  location: z.string().trim().max(160).nullable().optional(),
  website: websiteSchema.nullable().optional(),
});
export type ProfileInput = z.infer<typeof updateProfileSchema>;
