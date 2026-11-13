import nodemailer from 'nodemailer';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { WorkspaceSettings } from '../workspace/workspace.settings';
import { sendNetgsmSms } from '../workspace/netgsm';
import { mailTlsOptions, resolvePublicMailHost } from '../workspace/workspace.connections';
import { MessageRejected, type DeliverMessage } from './message-worker';

/** Her mesaj yalnızca sahibi olan işletmenin açık bağlantısıyla gönderilir. */
export function createMessageDelivery(db: PrismaClient, env: Env): DeliverMessage {
  const settings = new WorkspaceSettings(db, env.COOKIE_SECRET);
  return async (message) => {
    if (message.kanal === 'sms') {
      const v = await settings.values(message.isletmeId, 'sms', true);
      if (v.enabled !== 'true') return 'skipped';
      const sender = v.sender?.trim() || v.sanalNumara?.trim() || '';
      if (!v.username?.trim() || !v.password || !sender)
        throw new MessageRejected('SMS_YAPILANDIRMA');
      try {
        await sendNetgsmSms(
          { apiUrl: v.apiUrl ?? '', username: v.username, password: v.password, sender },
          message.alici,
          message.icerik,
        );
      } catch (error) {
        if (error instanceof HttpError && error.status === 400)
          throw new MessageRejected('SMS_RED');
        throw error;
      }
      return 'sent';
    }
    if (message.kanal !== 'email') throw new MessageRejected('KANAL');
    const v = await settings.values(message.isletmeId, 'smtp', true);
    if (v.enabled !== 'true') return 'skipped';
    const port = Number(v.port || 587),
      from = v.from || v.username;
    if (
      !v.host ||
      !from ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !!v.username !== !!v.password
    )
      throw new MessageRejected('SMTP_YAPILANDIRMA');
    const transport = nodemailer.createTransport({
      host: await resolvePublicMailHost(v.host),
      port,
      secure: v.secure === 'true',
      requireTLS: v.secure !== 'true',
      tls: mailTlsOptions(v.host, v),
      ...(v.username && v.password ? { auth: { user: v.username, pass: v.password } } : {}),
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
    try {
      const result = await transport.sendMail({
        from,
        to: message.alici,
        subject: message.konu,
        text: message.icerik,
        messageId: `<pos-${message.isletmeId}-${message.id}@${new URL(env.APP_URL).hostname}>`,
      });
      if (!result.accepted?.length) throw new MessageRejected('SMTP_RED');
      return 'sent';
    } finally {
      transport.close();
    }
  };
}
