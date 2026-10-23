import { Router } from 'express';
import { requireSession } from '../../middleware/require-session.js';
import * as controller from './messages.controller.js';

export function conversationsRoutes() {
  const router = Router();
  router.use(requireSession);
  router.get('/', controller.listConversations);
  router.post('/direct', controller.createDirect);
  router.get('/:id/messages', controller.listMessages);
  router.post('/:id/messages', controller.sendMessage);
  router.put('/:id/read', controller.markRead);
  return router;
}
export function messagesRoutes() {
  const router = Router();
  router.use(requireSession);
  router.patch('/:id', controller.updateMessage);
  router.delete('/:id', controller.deleteMessage);
  return router;
}
