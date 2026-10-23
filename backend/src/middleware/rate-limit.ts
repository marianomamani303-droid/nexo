import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Request } from 'express';

export function createRateLimit(
  limit: number,
  windowMs: number,
  keyGenerator?: (request: Request) => string,
) {
  return rateLimit({
    limit,
    windowMs,
    keyGenerator,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Demasiados intentos. Probá más tarde.',
        requestId: response.getHeader('X-Request-Id'),
      });
    },
  });
}

export function mutationKey(request: Request) {
  return request.session?.user.id || ipKeyGenerator(request.ip || '127.0.0.1');
}
