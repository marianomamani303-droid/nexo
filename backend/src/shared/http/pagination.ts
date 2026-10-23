import { z } from 'zod';
import { createHash } from 'node:crypto';
import { AppError } from '../errors/app-error.js';

const cursorDataSchema = z.strictObject({
  date: z.iso.datetime(),
  id: z.uuid(),
  scope: z.string().max(200),
});
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(600).optional(),
});
export interface PageQuery {
  limit: number;
  cursor?: string;
}
export interface Cursor {
  date: Date;
  id: string;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

function scopeHash(scope: string) {
  return createHash('sha256').update(scope).digest('hex');
}

export function decodeCursor(value: string | undefined, scope: string): Cursor | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const cursor = cursorDataSchema.parse(parsed);
    if (cursor.scope !== scopeHash(scope)) throw new Error('Wrong scope');
    return { date: new Date(cursor.date), id: cursor.id };
  } catch {
    throw new AppError(
      400,
      'INVALID_CURSOR',
      'El cursor de paginación no es válido para esta consulta.',
    );
  }
}

export function pageOf<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
  scope: string,
): Page<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const nextCursor =
    rows.length > limit && last
      ? Buffer.from(
          JSON.stringify({
            date: last.createdAt.toISOString(),
            id: last.id,
            scope: scopeHash(scope),
          }),
        ).toString('base64url')
      : null;
  return { items, nextCursor };
}
