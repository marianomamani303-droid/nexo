import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import { createRateLimit } from '../../middleware/rate-limit.js';
import * as controller from './auth.controller.js';

export function authRoutes() {
  const router = Router();
  const credentialLimit = createRateLimit(30, 15 * 60 * 1000);
  router.post('/register', credentialLimit, controller.register);
  router.post('/login', credentialLimit, controller.login);
  router.get('/session', controller.session);
  router.post('/logout', controller.logout);
  router.post('/password', requireSession, credentialLimit, controller.changePassword);
  return router;
}
