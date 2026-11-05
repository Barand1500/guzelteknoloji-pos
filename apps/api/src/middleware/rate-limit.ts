import { normalizeEmail } from '@gt/shared';
import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { HttpError } from '../lib/http-error';

interface Options {
  enabled: boolean;
  windowMs: number;
  limit: number;
  /** true ise anahtar IP + normalize e-posta olur. */
  perEmail?: boolean;
}

/**
 * Not: Bellek içi depo tek süreç için uygundur. Birden fazla süreç/sunucuya
 * ölçeklenirken paylaşılan bir depo (ör. MySQL veya Redis store) gerekir.
 */
export function createRateLimiter({ enabled, windowMs, limit, perEmail }: Options): RequestHandler {
  if (!enabled) return (_req, _res, next) => next();

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? 'unknown');
      if (!perEmail) return ip;
      const body: unknown = req.body;
      const email =
        body && typeof body === 'object' && 'email' in body && typeof body.email === 'string'
          ? normalizeEmail(body.email).slice(0, 254)
          : '';
      return `${ip}|${email}`;
    },
    handler: (_req, _res, next) => {
      next(
        new HttpError(429, 'RATE_LIMITED', 'Çok fazla deneme yapıldı. Lütfen biraz sonra deneyin.'),
      );
    },
  });
}
