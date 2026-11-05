import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';
import type { Env } from '../config/env';
import type { Logger } from './logger';
import { loginCodeEmail } from './mail-templates';

const BRAND_NAME = 'Güzel Teknoloji';

/** Giriş kodu e-postası gönderimi. İleride başka e-posta türleri aynı arayüze eklenebilir. */
export interface Mailer {
  sendLoginCode(to: string, code: string, expiresInMinutes: number): Promise<void>;
}

/**
 * - SMTP tanımlıysa gerçek e-posta gönderilir.
 * - SMTP yoksa ve geliştirme ortamındaysak kod API konsoluna yazılır (YALNIZCA geliştirme).
 * - SMTP yoksa ve production ise gönderim reddedilir; sahte "gönderildi" davranışı yoktur.
 */
export function createMailer(env: Env, logger: Logger): Mailer {
  if (env.smtp) {
    const { host, port, secure, user, pass, from, caFile } = env.smtp;
    // Kendinden imzalı sertifika: doğrulama kapatılmaz, yalnızca bu sertifika güvenilir eklenir.
    const ca = caFile ? readFileSync(caFile, 'utf8') : undefined;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      // 587'de (STARTTLS) bağlantı mutlaka şifrelenir; şifrelenemezse gönderilmez.
      requireTLS: !secure,
      ...(ca ? { tls: { ca } } : {}),
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 10_000,
    });
    return {
      async sendLoginCode(to, code, expiresInMinutes) {
        await transport.sendMail({
          from,
          to,
          ...loginCodeEmail({ code, expiresInMinutes, brandName: BRAND_NAME, appUrl: env.APP_URL }),
        });
      },
    };
  }

  if (!env.isProduction) {
    return {
      async sendLoginCode(to, code) {
        logger.warn(`[GELİŞTİRME] SMTP yok; ${to} için giriş kodu: ${code}`);
      },
    };
  }

  return {
    async sendLoginCode() {
      throw new Error('SMTP yapılandırılmadığı için e-posta gönderilemiyor.');
    },
  };
}
