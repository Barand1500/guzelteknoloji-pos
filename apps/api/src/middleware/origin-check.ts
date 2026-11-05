import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF savunmasının ikinci katmanı (ilk katman SameSite=Lax cookie).
 * Durum değiştiren isteklerde Origin başlığı izinli listede olmalıdır. Modern tarayıcılar
 * fetch/form POST'larında Origin'i her zaman gönderir; yoksa Referer'a bakılır.
 */
export function originCheck(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    let origin = req.get('origin');
    if (!origin) {
      const referer = req.get('referer');
      try {
        origin = referer ? new URL(referer).origin : undefined;
      } catch {
        origin = undefined;
      }
    }

    if (!origin || !allowed.has(origin)) {
      return next(new HttpError(403, 'FORBIDDEN_ORIGIN', 'İstek kaynağı doğrulanamadı.'));
    }
    next();
  };
}
