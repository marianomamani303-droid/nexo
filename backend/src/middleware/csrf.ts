import type { RequestHandler } from 'express';
import { config } from '../config/env.js';
import { AppError } from '../shared/errors/app-error.js';

export const corsAndCsrf: RequestHandler = (request, response, next) => {
  const origin = request.get('Origin');
  response.vary('Origin');
  if (origin && origin !== config.origin)
    throw new AppError(403, 'ORIGIN_REJECTED', 'Origen no permitido.');
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Nexo-CSRF');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  // A custom header forces a browser preflight; cross-origin preflights are denied above.
  if (!['GET', 'HEAD'].includes(request.method) && request.get('X-Nexo-CSRF') !== '1') {
    throw new AppError(403, 'CSRF_REJECTED', 'Solicitud no permitida.');
  }
  next();
};
