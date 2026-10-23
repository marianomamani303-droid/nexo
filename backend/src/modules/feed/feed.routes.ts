import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import { list } from '../posts/posts.controller.js';

export function feedRoutes() {
  const router = Router();
  router.get('/', requireSession, list('following'));
  return router;
}
