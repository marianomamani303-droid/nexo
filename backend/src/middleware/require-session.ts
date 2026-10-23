import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { sessionCookieName, sessionCookieOptions } from '../config/security.js';
import { resolveSession } from '../modules/auth/auth.service.js';
import { AppError } from '../shared/errors/app-error.js';

export const optionalSession: RequestHandler = async (request, response, next) => {
  const cookies: unknown = request.cookies;
  const parsed = z
    .object({ [sessionCookieName]: z.string().max(2048).optional() })
    .safeParse(cookies);
  const token = parsed.success ? parsed.data[sessionCookieName] : undefined;
  if (token) {
    const session = await resolveSession(token);
    if (session) request.session = session;
    else response.clearCookie(sessionCookieName, sessionCookieOptions);
  }
  next();
};

export function authenticated(request: Request) {
  if (!request.session)
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Iniciá sesión para continuar.');
  return request.session;
}

export const requireSession: RequestHandler = (request, _response, next) => {
  authenticated(request);
  next();
};
