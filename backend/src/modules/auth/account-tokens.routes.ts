import { Router } from 'express';
import { authenticated, requireSession } from '../../middleware/require-session.js';
import { createRateLimit } from '../../middleware/rate-limit.js';
import { sessionCookieName, sessionCookieOptions } from '../../config/security.js';
import { redeemToken, requestToken } from './account-tokens.service.js';
import {
  resetPasswordSchema,
  resetRequestSchema,
  verifyTokenSchema,
} from './account-tokens.validation.js';
export function accountTokenRoutes() {
  const router = Router();
  const requestLimit = createRateLimit(10, 15 * 60 * 1000);
  router.post('/forgot-password', requestLimit, async (request, response) => {
    await requestToken(resetRequestSchema.parse(request.body).email, 'reset');
    response
      .status(202)
      .json({ message: 'Si existe una cuenta con ese correo, recibirás un enlace.' });
  });
  router.post('/reset-password', requestLimit, async (request, response) => {
    const input = resetPasswordSchema.parse(request.body);
    await redeemToken(input.token, 'reset', input.password);
    response.clearCookie(sessionCookieName, sessionCookieOptions).sendStatus(204);
  });
  router.post('/verification', requireSession, requestLimit, async (request, response) => {
    await requestToken(authenticated(request).user.email, 'verify');
    response.status(202).json({ message: 'Revisá tu correo para verificar tu cuenta.' });
  });
  router.post('/verify-email', requestLimit, async (request, response) => {
    await redeemToken(verifyTokenSchema.parse(request.body).token, 'verify');
    response.sendStatus(204);
  });
  return router;
}
