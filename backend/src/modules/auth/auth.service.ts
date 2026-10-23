import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { transaction } from '../../database/transaction.js';
import type { Database } from '../../database/query.js';
import { AppError, errorCode } from '../../shared/errors/app-error.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import type { Session, SessionUser } from '../../shared/types.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';
import * as repository from './auth.repository.js';

const claimsSchema = z.object({ sub: z.uuid(), jti: z.uuid() });
const dummyHash = await hashPassword(randomUUID());

async function createSession(
  user: SessionUser,
  previousId: string | undefined,
  database: Database,
) {
  const id = randomUUID();
  const token = jwt.sign({}, config.secret, {
    algorithm: 'HS256',
    subject: user.id,
    jwtid: id,
    issuer: 'nexo',
    audience: 'nexo-web',
    expiresIn: config.sessionSeconds,
  });
  await repository.insertSession(
    id,
    user.id,
    new Date(Date.now() + config.sessionSeconds * 1000),
    database,
  );
  if (previousId) await repository.deleteSession(previousId, database);
  return { user, token };
}

export async function register(input: RegisterInput, previousId?: string) {
  const id = randomUUID();
  const user: SessionUser = {
    id,
    email: input.email,
    name: input.name,
    handle: `u_${id.replaceAll('-', '').slice(0, 28)}`,
  };
  const passwordHash = await hashPassword(input.password);
  try {
    return await transaction(async (database) => {
      await repository.insertUser(user, passwordHash, database);
      return createSession(user, previousId, database);
    });
  } catch (error) {
    if (errorCode(error) === 'ER_DUP_ENTRY')
      throw new AppError(409, 'ACCOUNT_CONFLICT', 'No se pudo crear la cuenta con ese correo.');
    throw error;
  }
}

export async function login(input: LoginInput, previousId?: string) {
  const credentials = await repository.findCredentials(input.email);
  const valid = await verifyPassword(input.password, credentials?.passwordHash || dummyHash);
  if (!valid || !credentials || credentials.status !== 'active' || credentials.deletedAt) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }
  const upgradedHash = credentials.passwordHash.startsWith('scrypt:')
    ? await hashPassword(input.password)
    : null;
  return transaction(async (database) => {
    // Serialize login with password changes so stale credentials cannot create a new session.
    const current = await repository.lockCredentials(credentials.id, database);
    if (!current || current.passwordHash !== credentials.passwordHash)
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Las credenciales cambiaron. Volvé a iniciar sesión.',
      );
    const user = await repository.findSessionUser(credentials.id, database);
    if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    if (upgradedHash) await repository.updatePasswordHash(user.id, upgradedHash, database);
    return createSession(user, previousId, database);
  });
}

export async function resolveSession(token: string): Promise<Session | null> {
  let claims: z.infer<typeof claimsSchema>;
  try {
    claims = claimsSchema.parse(
      jwt.verify(token, config.secret, {
        algorithms: ['HS256'],
        issuer: 'nexo',
        audience: 'nexo-web',
      }),
    );
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof z.ZodError) return null;
    throw error;
  }
  const user = await repository.findSession(claims.jti, claims.sub);
  return user ? { id: claims.jti, user } : null;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await repository.findSessionUser(userId);
  const credentials = user ? await repository.findCredentials(user.email) : null;
  if (!credentials || !(await verifyPassword(currentPassword, credentials.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'La contraseña actual no es correcta.');
  }
  if (currentPassword === newPassword)
    throw new AppError(400, 'PASSWORD_UNCHANGED', 'Elegí una contraseña diferente.');
  const passwordHash = await hashPassword(newPassword);
  await transaction(async (database) => {
    const current = await repository.lockCredentials(userId, database);
    if (
      !current ||
      current.passwordHash !== credentials.passwordHash ||
      current.status !== 'active' ||
      current.deletedAt
    )
      throw new AppError(
        409,
        'CREDENTIALS_CHANGED',
        'Las credenciales cambiaron. Intentá nuevamente.',
      );
    await repository.replacePasswordAndRevokeSessions(userId, passwordHash, database);
  });
}

export const logout = repository.deleteSession;
