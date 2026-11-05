import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env';
import type { Logger } from './lib/logger';
import type { Mailer } from './lib/mailer';
import type { PasswordHasher } from './lib/password';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { originCheck } from './middleware/origin-check';
import { requestLogger } from './middleware/request-logger';
import type { AuthRepository } from './modules/auth/auth.repository';
import { createAuthRouter } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import type { GoogleOidcClient } from './modules/auth/google.client';
import { createAppleOidcClient } from './modules/auth/apple.client';
import { createHealthRouter } from './modules/health/health.routes';
import { createStockRouter } from './modules/stock/stock.routes';
import type { StockRepository } from './modules/stock/stock.repository';

export interface AppDeps {
  env: Env;
  logger: Logger;
  repo: AuthRepository;
  hasher: PasswordHasher;
  mailer: Mailer;
  google: GoogleOidcClient | null;
  apple?: GoogleOidcClient | null;
  checkDatabase?: () => Promise<void>;
  stockRepo?: StockRepository;
}

export function createApp(deps: AppDeps): Express {
  const { env, logger } = deps;
  const app = express();

  app.disable('x-powered-by');
  // CloudPanel/Nginx arkasında req.ip ve req.secure'un doğru olması için.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
          styleSrc: ["'self'"],
          // React'in satır içi style= nitelikleri (ör. hata kutusu oku) için; <style> blokları yine yasak.
          styleSrcAttr: ["'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          formAction: ["'self'", 'https://accounts.google.com'],
          // Yalnızca yapılandırılan destek formu çerçevelenebilir; başka hiçbir iframe'e izin yok.
          frameSrc: env.supportFormOrigin ? [env.supportFormOrigin] : ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      // Google'a yönlendirme sonrası Referer'da iç yol sızmasın.
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // Yalnızca ayrı domain dağıtımında anlamlıdır; tek origin'de etkisizdir.
  if (env.allowedOrigins.length > 1) {
    app.use('/api', cors({ origin: env.allowedOrigins, credentials: true }));
  }

  app.use(requestLogger(logger));
  app.use('/api/stok', express.json({ limit: '512kb' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  const service = new AuthService({
    repo: deps.repo,
    hasher: deps.hasher,
    mailer: deps.mailer,
    codeSecret: env.COOKIE_SECRET,
    sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  const checkOrigin = originCheck(env.allowedOrigins);
  app.use('/api', (req, res, next) => {
    // Apple callback authenticates the request with signed flow cookie + state + nonce.
    if (req.method === 'POST' && req.path === '/auth/apple/callback') return next();
    return checkOrigin(req, res, next);
  });
  app.use('/api/health', createHealthRouter(deps.checkDatabase));
  app.use(
    '/api/auth',
    createAuthRouter({
      env,
      service,
      google: deps.google,
      apple:
        deps.apple !== undefined ? deps.apple : env.apple ? createAppleOidcClient(env.apple) : null,
      logger,
    }),
  );
  if (deps.stockRepo) app.use('/api/stok', createStockRouter(env, service, deps.stockRepo));
  app.use('/api', notFoundHandler);

  // Tek origin dağıtımı: derlenmiş SPA aynı sunucudan sunulur.
  if (env.WEB_DIST_DIR) {
    const distDir = path.resolve(env.WEB_DIST_DIR);
    if (existsSync(path.join(distDir, 'index.html'))) {
      app.use(express.static(distDir, { index: false, maxAge: '1h' }));
      app.get(/^(?!\/api\/).*/, (_req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else {
      logger.warn({ distDir }, 'WEB_DIST_DIR içinde index.html bulunamadı; SPA sunulmayacak');
    }
  }

  app.use(errorHandler(logger));
  return app;
}
