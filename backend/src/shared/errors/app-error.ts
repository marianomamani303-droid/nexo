export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(resource = 'Recurso'): never {
  throw new AppError(404, 'NOT_FOUND', `${resource} no encontrado.`);
}

export function forbidden(): never {
  throw new AppError(403, 'FORBIDDEN', 'No tenés permiso para realizar esta operación.');
}

export function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}
