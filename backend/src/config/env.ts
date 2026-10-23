import './load-env.js';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  FRONTEND_ORIGIN: z.url().default('http://127.0.0.1:5173'),
  JWT_SECRET: z.string().refine((value) => Buffer.byteLength(value) >= 32),
  SESSION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
});

const result = environmentSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(
    `Configuración inválida: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}.`,
  );
}
const environment = result.data;
const origin = new URL(environment.FRONTEND_ORIGIN);
if (
  origin.origin !== environment.FRONTEND_ORIGIN ||
  !['http:', 'https:'].includes(origin.protocol)
) {
  throw new Error('FRONTEND_ORIGIN debe ser un origen HTTP(S) sin ruta ni barra final.');
}
if (environment.NODE_ENV === 'production' && origin.protocol !== 'https:') {
  throw new Error('FRONTEND_ORIGIN requiere HTTPS en producción.');
}

export const config = Object.freeze({
  secret: environment.JWT_SECRET,
  port: environment.PORT,
  host: environment.HOST,
  production: environment.NODE_ENV === 'production',
  origin: origin.origin,
  sessionSeconds: environment.SESSION_HOURS * 60 * 60,
});
