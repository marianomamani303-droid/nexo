import type { CookieOptions } from 'express';
import { config } from './env.js';

export const sessionCookieName = 'nexo_session';
export const sessionCookieOptions: CookieOptions = Object.freeze({
  httpOnly: true,
  secure: config.production,
  sameSite: 'lax',
  path: '/',
});
