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
import type { EmailCodeStore } from './modules/auth/email-code.store';
import { createAuthRouter } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import type { GoogleOidcClient } from './modules/auth/google.client';
import { createAppleOidcClient } from './modules/auth/apple.client';
import { createHealthRouter } from './modules/health/health.routes';
import { createStockRouter } from './modules/stock/stock.routes';
import type { StockRepository } from './modules/stock/stock.repository';
import { createBrandRouter } from './modules/brands/brand.routes';
import type { PrismaBrandRepository } from './modules/brands/brand.repository';
import type { PrismaClient } from './lib/prisma';
import { createCatalogRouter } from './modules/catalog/catalog.routes';
import { createDealRouter } from './modules/catalog/deal.routes';
import { createAttributeRouter } from './modules/catalog/attribute.routes';
import { createOrderRouter, createHomeRouter } from './modules/orders/order.routes';
import { PrismaOrderStore } from './modules/orders/order.store';
import { createCustomerRouter } from './modules/customers/customer.routes';
import { PrismaCustomerStore } from './modules/customers/customer.store';
import { createCampaignRouter } from './modules/campaigns/campaign.routes';
import { createSeoRouter } from './modules/seo/seo.routes';
import {
  createCurrencyRouter,
  createShippingRouter,
} from './modules/definitions/definition.routes';
import {
  createStockDefsRouter,
  createTaxOfficeRouter,
  createTaxTypeRouter,
} from './modules/definitions/tax.routes';
import { workspaceMiddleware } from './modules/workspace/workspace.middleware';
import { createWorkspaceRouter } from './modules/workspace/workspace.routes';
import { WorkspaceChallenge, whatsappWebhook } from './modules/workspace/workspace.integrations';
import { workspaceGoogleReturn } from './modules/workspace/workspace.connections';
import { createRateLimiter } from './middleware/rate-limit';

export interface AppDeps {
  env: Env;
  logger: Logger;
  repo: AuthRepository;
  codes: EmailCodeStore;
  hasher: PasswordHasher;
  mailer: Mailer;
  google: GoogleOidcClient | null;
  apple?: GoogleOidcClient | null;
  checkDatabase?: () => Promise<void>;
  stockRepo?: StockRepository;
  brandRepo?: PrismaBrandRepository;
  catalogDb?: PrismaClient;
  /** Testlerde sahte doğrulama sağlayıcısı enjekte etmek için; normalde catalogDb'den üretilir. */
  challenge?: WorkspaceChallenge;
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
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
          styleSrc: ["'self'"],
          // React'in satır içi style= nitelikleri (ör. hata kutusu oku) için; <style> blokları yine yasak.
          styleSrcAttr: ["'unsafe-inline'"],
          scriptSrc: [
            "'self'",
            'https://challenges.cloudflare.com',
            'https://www.google.com/recaptcha/',
            'https://www.gstatic.com/recaptcha/',
          ],
          connectSrc: [
            "'self'",
            'https://challenges.cloudflare.com',
            'https://www.google.com/recaptcha/',
          ],
          formAction: ["'self'", 'https://accounts.google.com'],
          // Destek formu ve robot doğrulama sağlayıcılarının çerçeveleri.
          frameSrc: [
            'https://challenges.cloudflare.com',
            'https://www.google.com/recaptcha/',
            'https://recaptcha.google.com/recaptcha/',
            ...(env.supportFormOrigin ? [env.supportFormOrigin] : []),
          ],
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
  if (deps.catalogDb) app.use('/api/webhooks/whatsapp', whatsappWebhook(deps.catalogDb, env));
  app.use('/api/hesap/ayarlar', express.json({ limit: '32kb' }));
  app.use('/api/stok/gorseller/yukle', express.json({ limit: '7mb' }));
  app.use('/api/stok', express.json({ limit: '512kb' }));
  app.use('/api/markalar', express.json({ limit: '3mb' }));
  app.use('/api/kargo', express.json({ limit: '256kb' }));
  app.use('/api/para-birimleri', express.json({ limit: '64kb' }));
  app.use(['/api/kategoriler', '/api/katalog/kategoriler'], express.json({ limit: '3mb' }));
  app.use(['/api/firsatlar', '/api/ozellikler'], express.json({ limit: '3mb' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  const service = new AuthService({
    repo: deps.repo,
    codes: deps.codes,
    hasher: deps.hasher,
    mailer: deps.mailer,
    codeSecret: env.COOKIE_SECRET,
    sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  const challenge =
    deps.challenge ?? (deps.catalogDb ? new WorkspaceChallenge(deps.catalogDb, env) : undefined);

  const checkOrigin = originCheck(env.allowedOrigins);
  app.use('/api', (req, res, next) => {
    // Apple callback authenticates the request with signed flow cookie + state + nonce.
    if (req.method === 'POST' && req.path === '/auth/apple/callback') return next();
    return checkOrigin(req, res, next);
  });
  app.use('/api/health', createHealthRouter(deps.checkDatabase));
  if (deps.catalogDb) {
    app.use(workspaceMiddleware(deps.catalogDb, env, service, logger));
    app.use('/api/hesap', createWorkspaceRouter(deps.catalogDb, env, deps.hasher));
    app.get(
      '/api/auth/google/callback',
      createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 20 }),
      workspaceGoogleReturn(deps.catalogDb, env, service),
    );
  }
  app.use(
    '/api/auth',
    createAuthRouter({
      env,
      service,
      google: deps.google,
      apple:
        deps.apple !== undefined ? deps.apple : env.apple ? createAppleOidcClient(env.apple) : null,
      logger,
      ...(challenge ? { challenge } : {}),
    }),
  );
  if (deps.stockRepo)
    app.use('/api/stok', createStockRouter(env, service, deps.stockRepo, deps.catalogDb));
  if (deps.brandRepo) app.use('/api/markalar', createBrandRouter(env, service, deps.brandRepo));
  if (deps.catalogDb)
    app.use(
      ['/api/kategoriler', '/api/katalog/kategoriler'],
      createCatalogRouter(env, service, deps.catalogDb),
    );
  if (deps.catalogDb) {
    app.use('/api/firsatlar', createDealRouter(env, service, deps.catalogDb));
    app.use('/api/ozellikler', createAttributeRouter(env, service, deps.catalogDb));
    app.use('/api/kampanyalar', createCampaignRouter(deps.catalogDb));
    app.use('/api/para-birimleri', createCurrencyRouter(deps.catalogDb, env));
    app.use('/api/kargo', createShippingRouter(deps.catalogDb, env));
    app.use('/api/vergiler', createTaxTypeRouter(deps.catalogDb, env));
    app.use('/api/vergi-daireleri', createTaxOfficeRouter(deps.catalogDb, env));
    app.use('/api/cari-stok', createStockDefsRouter(deps.catalogDb, env));
    app.use(
      '/api/seo',
      express.json({ limit: '64kb' }),
      createSeoRouter(env, deps.catalogDb),
    );
    const orderStore = new PrismaOrderStore(deps.catalogDb);
    const orderLimit = createRateLimiter({
      enabled: env.rateLimitEnabled,
      windowMs: 60000,
      limit: 180,
    });
    app.use('/api/siparisler', orderLimit, createOrderRouter(orderStore));
    app.use('/api/anasayfa', orderLimit, createHomeRouter(orderStore));
    const customerStore = new PrismaCustomerStore(deps.catalogDb);
    const customerLimit = createRateLimiter({
      enabled: env.rateLimitEnabled,
      windowMs: 60000,
      limit: 180,
    });
    app.use('/api/musteriler', customerLimit, createCustomerRouter(customerStore));
  }
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
