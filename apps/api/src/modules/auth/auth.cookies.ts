import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../../config/env';
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
