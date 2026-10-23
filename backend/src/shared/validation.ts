import { z } from 'zod';

export const idSchema = z.uuid();
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const passwordSchema = z.string().min(8).max(128);
export const nameSchema = z.string().trim().min(2).max(80);
export const reactionSchema = z.enum(['like', 'love', 'insightful', 'celebrate', 'curious']);
export const emptyBodySchema = z.strictObject({});
export const idParamsSchema = z.object({ id: idSchema });

export function nonEmptyPatch<T extends z.ZodRawShape>(shape: T) {
  return z.strictObject(shape).refine((value) => Object.keys(value).length > 0, {
    message: 'Enviá al menos un campo para actualizar.',
  });
}
