import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, errorCode } from '../shared/errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const requestId: unknown = response.getHeader('X-Request-Id');
  if (error instanceof ZodError) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Revisá los campos enviados.',
      requestId,
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  if (error instanceof AppError) {
    response.status(error.status).json({ code: error.code, message: error.message, requestId });
    return;
  }
  const type =
    typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
  if (type === 'entity.too.large') {
    response.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'La solicitud supera el tamaño permitido.',
      requestId,
    });
    return;
  }
  if (type === 'entity.parse.failed') {
    response.status(400).json({ code: 'INVALID_JSON', message: 'JSON inválido.', requestId });
    return;
  }
  if (errorCode(error) === 'ER_DUP_ENTRY') {
    response.status(409).json({ code: 'CONFLICT', message: 'El recurso ya existe.', requestId });
    return;
  }
  if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(errorCode(error) || '')) {
    response.setHeader('Retry-After', '1');
    response.status(409).json({
      code: 'TRANSACTION_CONFLICT',
      message: 'Otra operación modificó el recurso. Intentá nuevamente.',
      requestId,
    });
    return;
  }
  console.error(
    JSON.stringify({
      event: 'request_failed',
      requestId,
      code: errorCode(error) || 'INTERNAL_ERROR',
    }),
  );
  response
    .status(500)
    .json({ code: 'INTERNAL_ERROR', message: 'No pudimos procesar la solicitud.', requestId });
};
