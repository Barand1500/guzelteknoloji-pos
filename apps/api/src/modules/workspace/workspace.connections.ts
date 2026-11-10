import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import tls from 'node:tls';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import nodemailer from 'nodemailer';
import type { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { WorkspaceAccess, requirePermission, type AccessContext } from './workspace.access';
import type { AuthService } from '../auth/auth.service';
import { readSessionToken } from '../auth/auth.cookies';
import { WorkspaceSettings } from './workspace.settings';

export function mailConnectionMessage(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (
    /CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(e?.code ?? '') ||
    /certificate|self.signed/i.test(e?.message ?? '')
  )
    return 'Posta sunucusunun TLS sertifikası doğrulanamadı. Sunucu adıyla eşleşen, geçerli ve güvenilir bir sertifika kurulmalı. Posta sağlayıcınızın önerdiği sunucu adresini kontrol edin.';
  if (e?.code === 'EAUTH')
    return 'Posta sunucusu kullanıcı adı veya şifreyi kabul etmedi. Tam e-posta adresini ve posta/uygulama şifresini kontrol edin.';
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(e?.code ?? ''))
    return 'Posta sunucusunun adresi çözümlenemedi. Sunucu adını ve DNS kayıtlarını kontrol edin.';
  if (['ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'ESOCKET'].includes(e?.code ?? ''))
    return 'Posta sunucusuna bağlantı kurulamadı. Portu, TLS seçimini ve uygulama sunucusunun dış bağlantı izinlerini kontrol edin.';
  if (e?.code === 'PRIVATE_ADDRESS')
    return 'Bağlantı testi yalnızca herkese açık posta sunucusu adresleriyle kullanılabilir.';
  return 'Bağlantı doğrulanamadı. Sunucu, port, TLS ve giriş bilgilerini kontrol edin.';
}

export function mailTlsOptions(host: string, values: Record<string, string>) {
  return { servername: host, rejectUnauthorized: values.allowInvalidCertificate !== 'true' };
}
export async function resolvePublicMailHost(host: string) {
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
    throw Object.assign(new Error('Private address'), { code: 'PRIVATE_ADDRESS' });
  return addresses[0]!.address;
}
export async function testMailConnection(section: 'smtp' | 'imap', values: Record<string, string>) {
  const host = values.host?.trim();
  const port = Number(values.port || (section === 'imap' ? 993 : 587));
  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (section === 'imap' && (!values.username || !values.password)) ||
    (section === 'smtp' && !!values.username !== !!values.password)
  )
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Sunucu, port, kullanıcı adı ve şifreyi kaydedin.',
    );
  try {
    // İşletme ayarları herkese açık kayıtlarla kullanılabilir; test ucu iç ağa erişim sağlamaz.
    const address = await resolvePublicMailHost(host);
    if (section === 'smtp') {
      const transport = nodemailer.createTransport({
        host: address,
        port,
        secure: values.secure === 'true',
        requireTLS: values.secure !== 'true',
        tls: mailTlsOptions(host, values),
        ...(values.username && values.password
          ? { auth: { user: values.username, pass: values.password } }
          : {}),
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
          ...mailTlsOptions(host, values),
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
        socket.setTimeout(10000, () =>
          finish(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' })),
        );
        socket.on('error', (error) => finish(error));
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
              finish(Object.assign(new Error('Authentication failed'), { code: 'EAUTH' }));
          }
        });
      });
    }
  } catch (error) {
    throw new HttpError(400, 'VALIDATION_ERROR', mailConnectionMessage(error));
  }
}

const cookie = 'gt_business_google';
const cookieOptions = (env: Env) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/api',
});
export function workspaceGoogleRedirect(env: Env, clientId?: string) {
  if (env.google && clientId === env.google.clientId) {
    const configured = new URL(env.google.redirectUri);
    if (
      configured.origin === new URL(env.APP_URL).origin &&
      configured.pathname === '/api/auth/google/callback'
    )
      return env.google.redirectUri;
  }
  return `${env.APP_URL}/api/hesap/google/callback`;
}
// Aynı Google istemcisiyle çalışan mevcut dönüş adresi kullanılır. Akışlar imzalı state ile ayrılır.
export function workspaceGoogleReturn(
  db: PrismaClient,
  env: Env,
  auth: AuthService,
): RequestHandler {
  return async (req, res, next) => {
    let state: unknown;
    try {
      state = JSON.parse(req.signedCookies?.[cookie] ?? '{}').state;
    } catch {
      return next();
    }
    if (
      typeof state !== 'string' ||
      typeof req.query.state !== 'string' ||
      state !== req.query.state
    )
      return next();
    const token = readSessionToken(req, env);
    const session = token ? await auth.getSession(token) : null;
    if (!session) return res.redirect(`${env.APP_URL}/uygulama/ayarlar/google?google=gecersiz`);
    const ctx = await new WorkspaceAccess(db).resolve(session.user);
    requirePermission(ctx, 'settings', 'save');
    await googleCallback(new WorkspaceSettings(db, env.COOKIE_SECRET), db, ctx, env, req, res);
  };
}
export async function googleConnect(
  settings: WorkspaceSettings,
  ctx: AccessContext,
  env: Env,
  res: Response,
) {
  const { values } = await settings.effective(ctx.business.id, 'google', env);
  if (!values.clientId || !values.clientSecret)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Google istemci kimliği ve anahtarını önce kaydedin.',
    );
  const state = randomBytes(32).toString('base64url');
  const redirectUri = workspaceGoogleRedirect(env, values.clientId);
  const verifier = randomBytes(48).toString('base64url');
  res.clearCookie(cookie, { ...cookieOptions(env), path: '/api/hesap/google' });
  res.cookie(
    cookie,
    JSON.stringify({
      state,
      verifier,
      redirectUri,
      businessId: ctx.business.id,
      userId: ctx.user.id,
      expires: Date.now() + 600000,
    }),
    { ...cookieOptions(env), signed: true, maxAge: 600000 },
  );
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: values.clientId,
    redirect_uri: redirectUri,
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
    redirectUri: z.string().optional(),
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
    const { values } = await settings.effective(ctx.business.id, 'google', env);
    const result = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: values.clientId!,
        client_secret: values.clientSecret!,
        code: req.query.code,
        code_verifier: flow.verifier,
        redirect_uri: flow.redirectUri ?? `${env.APP_URL}/api/hesap/google/callback`,
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
