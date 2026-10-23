import { z } from 'zod';
import nodemailer from 'nodemailer';
import './load-env.js';
import { config } from './env.js';

const settings = z
  .object({
    SMTP_HOST: z.string().min(1).default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_SECURE: z.enum(['true', 'false']).default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.email().default('nexo@example.test'),
  })
  .superRefine((value, context) => {
    if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASSWORD)) {
      context.addIssue({
        code: 'custom',
        message: 'SMTP_USER y SMTP_PASSWORD deben configurarse juntos.',
        path: ['SMTP_USER'],
      });
    }
  })
  .parse(process.env);
if (config.production && (!settings.SMTP_USER || !settings.SMTP_PASSWORD))
  throw new Error('Configurar SMTP autenticado en producción.');
export const mailer = nodemailer.createTransport({
  host: settings.SMTP_HOST,
  port: settings.SMTP_PORT,
  secure: settings.SMTP_SECURE === 'true',
  requireTLS: config.production,
  auth: settings.SMTP_USER ? { user: settings.SMTP_USER, pass: settings.SMTP_PASSWORD } : undefined,
  connectionTimeout: 5000,
  socketTimeout: 10000,
});
export const mailFrom = settings.MAIL_FROM;
