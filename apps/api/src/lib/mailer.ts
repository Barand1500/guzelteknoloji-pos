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
    const { from } = env.smtp;
    const transport = createSmtpTransport(env.smtp);
    return {
      async sendLoginCode(to, code, expiresInMinutes) {
        try {
          await transport.sendMail({
            from,
            to,
            ...loginCodeEmail({
              code,
              expiresInMinutes,
              brandName: BRAND_NAME,
              appUrl: env.APP_URL,
            }),
          });
        } catch (error) {
          logger.error(smtpFailure(error), 'SMTP e-posta gönderimi başarısız');
          throw error;
        }
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

function createSmtpTransport(smtp: NonNullable<Env['smtp']>) {
  const { host, port, secure, user, pass, caFile } = smtp;
  // Kendinden imzalı sertifika: doğrulama kapatılmaz, yalnızca bu sertifika güvenilir eklenir.
  const ca = caFile ? readFileSync(caFile, 'utf8') : undefined;
  return nodemailer.createTransport({
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
}

/** Ham SMTP cevabında adres, kod veya kimlik bilgisi bulunabilir; yalnızca izinli tanı alanları kaydedilir. */
export function smtpFailure(error: unknown) {
  const row = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const codes = [
    'EAUTH',
    'ECONNECTION',
    'ETIMEDOUT',
    'EDNS',
    'ESOCKET',
    'ETLS',
    'EENVELOPE',
    'EMESSAGE',
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ENOENT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  ];
  const smtpCode = typeof row.code === 'string' && codes.includes(row.code) ? row.code : 'UNKNOWN';
  const responseCode =
    typeof row.responseCode === 'number' &&
    Number.isInteger(row.responseCode) &&
    row.responseCode >= 100 &&
    row.responseCode <= 599
      ? row.responseCode
      : undefined;
  const category =
    smtpCode === 'EAUTH'
      ? 'authentication'
      : smtpCode === 'ETIMEDOUT'
        ? 'timeout'
        : [
              'ETLS',
              'ESOCKET',
              'SELF_SIGNED_CERT_IN_CHAIN',
              'DEPTH_ZERO_SELF_SIGNED_CERT',
              'CERT_HAS_EXPIRED',
              'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
            ].includes(smtpCode)
          ? 'tls'
          : 'connection_or_delivery';
  return { smtpCode, responseCode, category };
}

/** Mesaj göndermeden DNS, bağlantı, TLS ve SMTP kimlik doğrulamasını sınar. */
export async function verifySmtp(env: Env) {
  if (!env.smtp) throw new Error('SMTP_NOT_CONFIGURED');
  const transport = createSmtpTransport(env.smtp);
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
}
