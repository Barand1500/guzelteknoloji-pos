import nodemailer from 'nodemailer';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import type { Logger } from '../../lib/logger';
import type { Mailer } from '../../lib/mailer';
import { smtpFailure } from '../../lib/mailer';
import { loginCodeEmail } from '../../lib/mail-templates';
import { WorkspaceSettings } from './workspace.settings';
import { mailTlsOptions, resolvePublicMailHost } from './workspace.connections';

export function createWorkspaceMailer(
  env: Env,
  db: PrismaClient,
  fallback: Mailer,
  logger: Logger,
): Mailer {
  const settings = new WorkspaceSettings(db, env.COOKIE_SECRET);
  return {
    async sendLoginCode(to, code, expiresInMinutes) {
      // İşletme istemci gövdesinden seçilmez: doğrulanacak adresin sunucudaki üyeliği esas alınır.
      const member = await db.isletmeUyesi.findUnique({
        where: { email: to.trim().toLowerCase() },
        select: { businessId: true, active: true },
      });
      if (!member?.active) return fallback.sendLoginCode(to, code, expiresInMinutes);
      const connection = await settings.effective(member.businessId, 'smtp', env);
      if (connection.source !== 'database')
        return fallback.sendLoginCode(to, code, expiresInMinutes);
      const v = connection.values;
      if (v.enabled === 'false') return fallback.sendLoginCode(to, code, expiresInMinutes);
      const port = Number(v.port || 587);
      const from = v.from || v.username;
      if (
        !v.host ||
        !from ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !!v.username !== !!v.password
      )
        throw new Error('İşletmenin SMTP bilgileri eksik.');
      // Hatalı işletme ayarı, başka bir hesabın bilgileriyle sessizce tamamlanmaz.
      const transport = nodemailer.createTransport({
        host: await resolvePublicMailHost(v.host),
        port,
        secure: v.secure === 'true',
        requireTLS: v.secure !== 'true',
        tls: mailTlsOptions(v.host, v),
        ...(v.username && v.password ? { auth: { user: v.username, pass: v.password } } : {}),
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
      try {
        await transport.sendMail({
          from,
          to,
          ...loginCodeEmail({
            code,
            expiresInMinutes,
            brandName: 'Güzel Teknoloji',
            appUrl: env.APP_URL,
          }),
        });
      } catch (error) {
        logger.error(smtpFailure(error), 'İşletme SMTP gönderimi başarısız');
        throw error;
      } finally {
        transport.close();
      }
    },
  };
}
