import { Router, urlencoded } from 'express';
import { createRateLimiter } from '../../middleware/rate-limit';
import { createAuthController, type AuthControllerDeps } from './auth.controller';

export function createAuthRouter(deps: AuthControllerDeps): Router {
  const controller = createAuthController(deps);
  const enabled = deps.env.rateLimitEnabled;
  const router = Router();

  // IP başına geniş sınır + (IP, e-posta) başına dar sınır: hem yaygın hem hedefli
  // kaba kuvvet denemelerini yavaşlatır.
  const loginIpLimiter = createRateLimiter({ enabled, windowMs: 15 * 60_000, limit: 30 });
  const loginAccountLimiter = createRateLimiter({
    enabled,
    windowMs: 15 * 60_000,
    limit: 8,
    perEmail: true,
  });
  const googleLimiter = createRateLimiter({ enabled, windowMs: 60_000, limit: 20 });

  // Hesap sorgulama/kod gönderimi: hem IP hem (IP + e-posta) başına dar sınır.
  const emailStartIpLimiter = createRateLimiter({ enabled, windowMs: 15 * 60_000, limit: 30 });
  const emailStartAccountLimiter = createRateLimiter({
    enabled,
    windowMs: 15 * 60_000,
    limit: 8,
    perEmail: true,
  });
  const emailVerifyLimiter = createRateLimiter({
    enabled,
    windowMs: 15 * 60_000,
    limit: 12,
    perEmail: true,
  });

  router.get('/providers', controller.providers);
  router.post(
    '/robot',
    createRateLimiter({ enabled, windowMs: 60000, limit: 60 }),
    controller.robotConfig,
  );
  router.post('/email/start', emailStartIpLimiter, emailStartAccountLimiter, controller.emailStart);
  router.post('/email/verify', loginIpLimiter, emailVerifyLimiter, controller.emailVerify);
  router.get('/apple', googleLimiter, controller.appleStart);
  router.post(
    '/apple/callback',
    googleLimiter,
    urlencoded({ extended: false, limit: '10kb' }),
    controller.appleCallback,
  );
  router.post('/login', loginIpLimiter, loginAccountLimiter, controller.login);
  router.get('/me', controller.me);
  router.post('/logout', controller.logout);
  router.get('/google', googleLimiter, controller.googleStart);
  router.get('/google/callback', googleLimiter, controller.googleCallback);

  return router;
}
