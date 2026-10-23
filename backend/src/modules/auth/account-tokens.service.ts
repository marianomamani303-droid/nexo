import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from '../../config/env.js';
import { mailer, mailFrom } from '../../config/mail.js';
import { transaction } from '../../database/transaction.js';
import { AppError } from '../../shared/errors/app-error.js';
import { hashPassword } from '../../shared/security/password.js';
import * as auth from './auth.repository.js';
import * as repository from './account-tokens.repository.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function requestToken(email: string, purpose: 'reset' | 'verify') {
  const started = Date.now();
  const credentials = await auth.findCredentials(email);
  if (credentials?.status === 'active' && !credentials.deletedAt) {
    const token = randomBytes(32).toString('hex');
    await repository.insertToken(
      hashToken(token),
      credentials.id,
      purpose,
      new Date(Date.now() + (purpose === 'reset' ? 30 : 24 * 60) * 60000),
    );
    const link = `${config.origin}/${purpose === 'reset' ? 'recuperar' : 'verificar'}?token=${token}`;
    try {
      await mailer.sendMail({
        from: mailFrom,
        to: email,
        subject: purpose === 'reset' ? 'Recuperá tu cuenta de Nexo' : 'Verificá tu correo en Nexo',
        text: `Abrí este enlace para ${purpose === 'reset' ? 'cambiar tu contraseña' : 'verificar tu correo'}:\n\n${link}\n\nSi no lo pediste, ignorá este mensaje. El enlace es de un solo uso.`,
      });
    } catch {
      console.error(JSON.stringify({ event: 'account_email_delivery_failed' }));
    }
  }
  // The response never reveals whether an account exists. Smooth the usual local SMTP timing difference.
  await delay(Math.max(0, 400 - (Date.now() - started)));
}

export async function redeemToken(
  token: string,
  purpose: 'reset' | 'verify',
  newPassword?: string,
) {
  const hash = hashToken(token);
  const snapshot = await repository.findToken(hash, purpose);
  if (!snapshot)
    throw new AppError(400, 'INVALID_ACCOUNT_TOKEN', 'El enlace no es válido, ya se usó o venció.');
  const passwordHash = newPassword ? await hashPassword(newPassword) : null;
  await transaction(async (database) => {
    const user = await auth.lockCredentials(snapshot.userId, database);
    if (!user || user.status !== 'active' || user.deletedAt)
      throw new AppError(
        400,
        'INVALID_ACCOUNT_TOKEN',
        'El enlace no es válido, ya se usó o venció.',
      );
    const current = await repository.findToken(hash, purpose, database, true);
    if (!current)
      throw new AppError(
        400,
        'INVALID_ACCOUNT_TOKEN',
        'El enlace no es válido, ya se usó o venció.',
      );
    if (purpose === 'reset') {
      if (!passwordHash)
        throw new AppError(400, 'PASSWORD_REQUIRED', 'Indicá una nueva contraseña.');
      await auth.replacePasswordAndRevokeSessions(user.id, passwordHash, database);
    } else await repository.verifyEmail(user.id, database);
    await repository.consumeTokens(user.id, purpose, database);
  });
}
