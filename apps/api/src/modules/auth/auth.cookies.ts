import type { CookieOptions, Request, Response } from 'express';
import { createHmac } from 'node:crypto';
import { normalizeEmail } from '@gt/shared';
import type { Env } from '../../config/env';
import { hashToken, safeEqualHex } from '../../lib/crypto';
import { oauthFlowCookieSchema, type OAuthFlowCookie } from './auth.schemas';

export const OAUTH_COOKIE_NAME = 'gt_oauth';
const OAUTH_COOKIE_PATH = '/api/auth/google';
const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Production'da `__Host-` öneki: cookie yalnızca Secure, Path=/ ve Domain'siz olabilir;
 * alt alan adlarından üzerine yazılması (cookie tossing) engellenir.
 * COOKIE_DOMAIN gerekiyorsa (ayrı subdomain dağıtımı) önek kullanılamaz.
 */
export function sessionCookieName(env: Env): string {
  return env.isProduction && !env.COOKIE_DOMAIN ? '__Host-gt_session' : 'gt_session';
}

function baseOptions(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // Lax: Google'dan dönen üst düzey GET yönlendirmesinde cookie gönderilir,
    // siteler arası POST'larda gönderilmez (CSRF savunmasının ilk katmanı).
    sameSite: 'lax',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function readSessionToken(req: Request, env: Env): string | undefined {
  const value: unknown = req.cookies?.[sessionCookieName(env)];
  return typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : undefined;
}

export function setSessionCookie(res: Response, env: Env, token: string, expiresAt: Date) {
  res.cookie(sessionCookieName(env), token, { ...baseOptions(env), path: '/', expires: expiresAt });
}

export function clearSessionCookie(res: Response, env: Env) {
  res.clearCookie(sessionCookieName(env), { ...baseOptions(env), path: '/' });
}

export function setOAuthCookie(res: Response, env: Env, flow: OAuthFlowCookie) {
  res.cookie(OAUTH_COOKIE_NAME, JSON.stringify(flow), {
    ...baseOptions(env),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE_MS,
    signed: true,
  });
}

export function readOAuthCookie(req: Request): OAuthFlowCookie | null {
  const raw: unknown = req.signedCookies?.[OAUTH_COOKIE_NAME];
  if (typeof raw !== 'string') return null;
  try {
    const parsed = oauthFlowCookieSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearOAuthCookie(res: Response, env: Env) {
  res.clearCookie(OAUTH_COOKIE_NAME, { ...baseOptions(env), path: OAUTH_COOKIE_PATH });
}

/**
 * E-posta akışı doğrulama işareti: ilk adımda robot doğrulaması geçilince imzalı, HttpOnly bir
 * cookie bırakılır. Kod/şifre adımında ve yeniden göndermede aynı e-posta için bu işaret geçerliyse
 * doğrulama tekrar istenmez. Cookie e-postaya bağlıdır ve 10 dakika yaşar; başka e-posta için
 * geçersizdir. Böylece akış başına tek doğrulama yeter, sunucu yine de doğrulama kanıtı görür.
 */
export const EMAIL_FLOW_COOKIE = 'gt_email_flow';
const EMAIL_FLOW_PATH = '/api/auth';
const EMAIL_FLOW_MAX_AGE_MS = 10 * 60 * 1000;

export interface EmailFlowCookie {
  emailHash: string;
  exp: number;
}

export function setEmailFlowCookie(res: Response, env: Env, email: string) {
  const flow: EmailFlowCookie = {
    emailHash: hashToken(normalizeEmail(email)),
    exp: Date.now() + EMAIL_FLOW_MAX_AGE_MS,
  };
  res.cookie(EMAIL_FLOW_COOKIE, JSON.stringify(flow), {
    ...baseOptions(env),
    path: EMAIL_FLOW_PATH,
    maxAge: EMAIL_FLOW_MAX_AGE_MS,
    signed: true,
  });
}

export function readEmailFlowCookie(req: Request): EmailFlowCookie | null {
  const raw: unknown = req.signedCookies?.[EMAIL_FLOW_COOKIE];
  if (typeof raw !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'emailHash' in parsed &&
      typeof parsed.emailHash === 'string' &&
      'exp' in parsed &&
      typeof parsed.exp === 'number'
    )
      return { emailHash: parsed.emailHash, exp: parsed.exp };
  } catch {
    // Bozuk cookie yok sayılır; doğrulama normal akışla istenir.
  }
  return null;
}

/** Cookie bu e-posta için geçerli ve süresi dolmamış mı? */
export function emailFlowMatches(req: Request, email: string): boolean {
  const flow = readEmailFlowCookie(req);
  return (
    !!flow &&
    flow.exp > Date.now() &&
    safeEqualHex(flow.emailHash, hashToken(normalizeEmail(email)))
  );
}

export function clearEmailFlowCookie(res: Response, env: Env) {
  res.clearCookie(EMAIL_FLOW_COOKIE, { ...baseOptions(env), path: EMAIL_FLOW_PATH });
}

/**
 * Çerezden bağımsız akış kanıtı: `emailHash.exp.signature` biçiminde imzalı, kısa ömürlü bir
 * anahtar. Bazı tarayıcı/dağıtım kurgularında HttpOnly çerez gönderilemediğinde kod veya şifre
 * adımının robot doğrulamasını yeniden istemesini önler. E-postaya bağlıdır ve 10 dakika yaşar.
 */
const EMAIL_FLOW_TOKEN_TTL_MS = 10 * 60 * 1000;

export function createEmailFlowToken(env: Env, email: string): string {
  const payload = `${hashToken(normalizeEmail(email))}.${Date.now() + EMAIL_FLOW_TOKEN_TTL_MS}`;
  const signature = createHmac('sha256', env.COOKIE_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function emailFlowTokenMatches(env: Env, token: unknown, email: string): boolean {
  if (typeof token !== 'string' || token.length === 0 || token.length > 200) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [emailHash, expires, signature] = parts as [string, string, string];
  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  const expected = createHmac('sha256', env.COOKIE_SECRET)
    .update(`${emailHash}.${expires}`)
    .digest('hex');
  return (
    safeEqualHex(signature, expected) && safeEqualHex(emailHash, hashToken(normalizeEmail(email)))
  );
}

export function setAppleFlow(res: Response, env: Env, flow: OAuthFlowCookie) {
  res.cookie('gt_apple_oauth', JSON.stringify(flow), {
    ...baseOptions(env),
    sameSite: 'none',
    secure: true,
    path: '/api/auth/apple',
    signed: true,
    maxAge: OAUTH_COOKIE_MAX_AGE_MS,
  });
}
export function readAppleFlow(req: Request): OAuthFlowCookie | null {
  try {
    return oauthFlowCookieSchema.parse(JSON.parse(req.signedCookies?.gt_apple_oauth));
  } catch {
    return null;
  }
}
export function clearAppleFlow(res: Response, env: Env) {
  res.clearCookie('gt_apple_oauth', {
    ...baseOptions(env),
    sameSite: 'none',
    secure: true,
    path: '/api/auth/apple',
  });
}
