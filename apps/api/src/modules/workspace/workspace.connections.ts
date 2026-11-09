import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import tls from 'node:tls';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import nodemailer from 'nodemailer';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import type { AccessContext } from './workspace.access';
import type { WorkspaceSettings } from './workspace.settings';

export async function testMailConnection(section: 'smtp' | 'imap', values: Record<string, string>) {
  const host = values.host?.trim();
  const port = Number(values.port || (section === 'imap' ? 993 : 587));
  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !values.username ||
    !values.password
  )
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Sunucu, port, kullanıcı adı ve şifreyi kaydedin.',
    );
  try {
    // İşletme ayarları herkese açık kayıtlarla kullanılabilir; test ucu iç ağa erişim sağlamaz.
    const addresses = await lookup(host, { all: true });
    const publicAddress = (address: string) => {
      if (isIP(address) === 4) {
        const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
        return (
          a !== 0 &&
          a !== 10 &&
          a !== 127 &&
          a < 224 &&
          !(a === 100 && b >= 64 && b <= 127) &&
          !(a === 169 && b === 254) &&
          !(a === 172 && b >= 16 && b <= 31) &&
          !(a === 192 && (b === 168 || b === 0)) &&
          !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) &&
          !(a === 203 && b === 0 && c === 113)
        );
      }
      const first = parseInt(address.split(':')[0]!, 16);
      return first >= 0x2000 && first <= 0x3fff && !address.toLowerCase().startsWith('2001:db8:');
    };
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new Error('Private address');
    const address = addresses[0]!.address;
    if (section === 'smtp') {
      const transport = nodemailer.createTransport({
        host: address,
        port,
        secure: values.secure === 'true',
        requireTLS: values.secure !== 'true',
        tls: { servername: host },
        auth: { user: values.username, pass: values.password },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
      try {
        await transport.verify();
      } finally {
        transport.close();
      }
    } else {
      await new Promise<void>((resolve, reject) => {
        const socket = tls.connect({
          host: address,
          port,
          servername: host,
          rejectUnauthorized: true,
        });
        let buffer = '';
        let sent = false;
        let done = false;
        const finish = (error?: Error) => {
          if (done) return;
          done = true;
          socket.destroy();
          if (error) reject(error);
          else resolve();
        };
        const quote = (v: string) => {
          if (/[\r\n]/.test(v) || v.includes(String.fromCharCode(0)))
            throw new Error('Invalid credentials');
          return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        };
        socket.setTimeout(10000, () => finish(new Error('Timeout')));
        socket.on('error', () => finish(new Error('Connection failed')));
        socket.on('close', () => {
          if (!done) finish(new Error('Connection closed'));
        });
        socket.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
          if (buffer.length > 65536) return finish(new Error('Invalid response'));
          let at: number;
          while ((at = buffer.indexOf('\r\n')) >= 0) {
            const line = buffer.slice(0, at);
            buffer = buffer.slice(at + 2);
            if (!sent && /^\* OK/i.test(line)) {
              sent = true;
              try {
                socket.write(`A1 LOGIN ${quote(values.username!)} ${quote(values.password!)}\r\n`);
              } catch {
                finish(new Error('Invalid credentials'));
              }
            } else if (/^A1 OK/i.test(line)) finish();
            else if (/^(A1 (NO|BAD)|\* BYE)/i.test(line))
              finish(new Error('Authentication failed'));
          }
        });
      });
    }
  } catch {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Bağlantı doğrulanamadı. Sunucu, port, TLS ve giriş bilgilerini kontrol edin.',
    );
  }
}

const cookie = 'gt_business_google';
const cookieOptions = (env: Env) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/api/hesap/google',
});
export async function googleConnect(
  settings: WorkspaceSettings,
  ctx: AccessContext,
  env: Env,
  res: Response,
) {
  const values = await settings.values(ctx.business.id, 'google', true);
  if (!values.clientId || !values.clientSecret)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Google istemci kimliği ve anahtarını önce kaydedin.',
    );
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  res.cookie(
    cookie,
    JSON.stringify({
      state,
      verifier,
      businessId: ctx.business.id,
      userId: ctx.user.id,
      expires: Date.now() + 600000,
    }),
    { ...cookieOptions(env), signed: true, maxAge: 600000 },
  );
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: values.clientId,
    redirect_uri: `${env.APP_URL}/api/hesap/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}
export async function googleCallback(
  settings: WorkspaceSettings,
  db: PrismaClient,
  ctx: AccessContext,
  env: Env,
  req: Request,
  res: Response,
) {
  const destination = `${env.APP_URL}/uygulama/ayarlar/google`;
  const flowSchema = z.strictObject({
    state: z.string(),
    verifier: z.string(),
    businessId: z.number(),
    userId: z.number(),
    expires: z.number(),
  });
  const raw: unknown = req.signedCookies?.[cookie];
  res.clearCookie(cookie, cookieOptions(env));
  let flow: z.infer<typeof flowSchema>;
  try {
    flow = flowSchema.parse(JSON.parse(typeof raw === 'string' ? raw : '{}'));
  } catch {
    return res.redirect(destination + '?google=gecersiz');
  }
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (
    flow.expires < Date.now() ||
    flow.businessId !== ctx.business.id ||
    flow.userId !== ctx.user.id ||
    !timingSafeEqual(
      createHash('sha256').update(state).digest(),
      createHash('sha256').update(flow.state).digest(),
    )
  )
    return res.redirect(destination + '?google=gecersiz');
  if (req.query.error || typeof req.query.code !== 'string')
    return res.redirect(destination + '?google=iptal');
  const entry = await db.islemKaydi.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      userName: ctx.user.name ?? ctx.user.email ?? 'Kullanıcı',
      section: 'settings',
      action: 'Google Bağlantısı',
      status: 'İşleniyor',
    },
  });
  try {
    const values = await settings.values(ctx.business.id, 'google', true);
    const result = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: values.clientId!,
        client_secret: values.clientSecret!,
        code: req.query.code,
        code_verifier: flow.verifier,
        redirect_uri: `${env.APP_URL}/api/hesap/google/callback`,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!result.ok) throw new Error('Token exchange failed');
    const tokens = z
      .object({
        access_token: z.string(),
        refresh_token: z.string().optional(),
        expires_in: z.number(),
      })
      .parse(await result.json());
    await db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries({
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: String(Date.now() + tokens.expires_in * 1000),
      }))
        await tx.isletmeAyari.upsert({
          where: {
            businessId_section_key: { businessId: ctx.business.id, section: 'google', key },
          },
          create: {
            businessId: ctx.business.id,
            section: 'google',
            key,
            value: settings.isSecret(key) ? settings.encrypt(value) : value,
          },
          update: { value: settings.isSecret(key) ? settings.encrypt(value) : value },
        });
      await tx.islemKaydi.update({ where: { id: entry.id }, data: { status: 'Başarılı' } });
    });
    return res.redirect(destination + '?google=baglandi');
  } catch {
    await db.islemKaydi.update({ where: { id: entry.id }, data: { status: 'Reddedildi' } });
    return res.redirect(destination + '?google=hata');
  }
}
