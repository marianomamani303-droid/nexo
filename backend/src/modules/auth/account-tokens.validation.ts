import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../shared/validation.js';

export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const resetRequestSchema = z.strictObject({ email: emailSchema });
export const resetPasswordSchema = z.strictObject({ token: tokenSchema, password: passwordSchema });
export const verifyTokenSchema = z.strictObject({ token: tokenSchema });
