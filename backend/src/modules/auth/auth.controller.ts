import type { RequestHandler, Response } from 'express';
import { config } from '../../config/env.js';
import { sessionCookieName, sessionCookieOptions } from '../../config/security.js';
import { authenticated } from '../../middleware/require-session.js';
import { emptyBodySchema } from '../../shared/validation.js';
import * as service from './auth.service.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.validation.js';
import type { SessionUser } from '../../shared/types.js';

function sendSession(
  response: Response,
  result: { user: SessionUser; token: string },
  status: number,
) {
  response.cookie(sessionCookieName, result.token, {
    ...sessionCookieOptions,
    maxAge: config.sessionSeconds * 1000,
  });
  response.status(status).json({ user: result.user });
}

export const register: RequestHandler = async (request, response) => {
  const input = registerSchema.parse(request.body);
  sendSession(response, await service.register(input, request.session?.id), 201);
};
export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  sendSession(response, await service.login(input, request.session?.id), 200);
};
export const session: RequestHandler = (request, response) => {
  if (!request.session) response.clearCookie(sessionCookieName, sessionCookieOptions);
  response.json({ user: authenticated(request).user });
};
export const logout: RequestHandler = async (request, response) => {
  emptyBodySchema.parse(request.body ?? {});
  if (request.session) await service.logout(request.session.id);
  response.clearCookie(sessionCookieName, sessionCookieOptions).sendStatus(204);
};
export const changePassword: RequestHandler = async (request, response) => {
  const input = changePasswordSchema.parse(request.body);
  await service.changePassword(
    authenticated(request).user.id,
    input.currentPassword,
    input.newPassword,
  );
  response.clearCookie(sessionCookieName, sessionCookieOptions).sendStatus(204);
};
