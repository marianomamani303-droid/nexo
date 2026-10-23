import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config/env.js';
import { corsAndCsrf } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { optionalSession } from './middleware/require-session.js';
import { createRateLimit, mutationKey } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { accountTokenRoutes } from './modules/auth/account-tokens.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { postsRoutes } from './modules/posts/posts.routes.js';
import { feedRoutes } from './modules/feed/feed.routes.js';
import { communitiesRoutes } from './modules/communities/communities.routes.js';
import { commentsRoutes } from './modules/comments/comments.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { conversationsRoutes, messagesRoutes } from './modules/messages/messages.routes.js';
import { projectsRoutes } from './modules/projects/projects.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { AppError } from './shared/errors/app-error.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use(requestId, helmet({ strictTransportSecurity: config.production ? undefined : false }));
  app.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(corsAndCsrf, createRateLimit(600, 60 * 1000));
  app.use(express.json({ limit: '128kb' }), cookieParser());
  app.use('/api/v1/health', healthRoutes());
  app.use('/api/v1', optionalSession);
  const mutationLimit = createRateLimit(120, 60 * 1000, mutationKey);
  app.use('/api/v1', (request, response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) next();
    else mutationLimit(request, response, next);
  });
  app.use('/api/v1/auth', authRoutes());
  app.use('/api/v1/auth', accountTokenRoutes());
  app.use('/api/v1/users', usersRoutes());
  app.use('/api/v1/posts', postsRoutes());
  app.use('/api/v1/feed', feedRoutes());
  app.use('/api/v1/communities', communitiesRoutes());
  app.use('/api/v1/comments', commentsRoutes());
  app.use('/api/v1/notifications', notificationsRoutes());
  app.use('/api/v1/conversations', conversationsRoutes());
  app.use('/api/v1/messages', messagesRoutes());
  app.use('/api/v1/projects', projectsRoutes());
  app.use((_request, _response) => {
    throw new AppError(404, 'NOT_FOUND', 'Ruta no encontrada.');
  });
  app.use(errorHandler);
  return app;
}
