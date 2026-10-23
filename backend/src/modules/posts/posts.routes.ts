import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import * as controller from './posts.controller.js';
import * as comments from '../comments/comments.controller.js';

export function postsRoutes() {
  const router = Router();
  router.get('/', controller.list());
  router.get('/bookmarks', requireSession, controller.list('bookmarks'));
  router.post('/', requireSession, controller.create);
  router.get('/:id', controller.get);
  router.get('/:id/comments', comments.list);
  router.post('/:id/comments', requireSession, comments.create);
  router.patch('/:id', requireSession, controller.update);
  router.delete('/:id', requireSession, controller.remove);
  router.put('/:id/reaction', requireSession, controller.react());
  router.delete('/:id/reaction', requireSession, controller.react(true));
  router.put('/:id/bookmark', requireSession, controller.bookmark(true));
  router.delete('/:id/bookmark', requireSession, controller.bookmark(false));
  return router;
}
