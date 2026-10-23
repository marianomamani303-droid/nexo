import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import * as controller from './communities.controller.js';

export function communitiesRoutes() {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.get('/:id/members', controller.members);
  router.use(requireSession);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  router.put('/:id/membership', controller.join);
  router.delete('/:id/membership', controller.leave);
  router.put('/:id/members/:userId', controller.setMember);
  router.delete('/:id/members/:userId', controller.removeMember);
  return router;
}
