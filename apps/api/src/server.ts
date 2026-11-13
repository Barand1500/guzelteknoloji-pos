import { createApp } from './app';
import { parseEnv } from './config/env';
import { createLogger } from './lib/logger';
import { createMailer } from './lib/mailer';
import { createWorkspaceMailer } from './modules/workspace/workspace.mailer';
import { argon2Hasher } from './lib/password';
import { createPrismaClient } from './lib/prisma';
import { PrismaAuthRepository } from './modules/auth/auth.repository';
import { createGoogleOidcClient } from './modules/auth/google.client';
import { PrismaStockRepository } from './modules/stock/stock.repository';
import { PrismaBrandRepository } from './modules/brands/brand.repository';
import { MysqlEmailCodeStore } from './modules/auth/mysql-email-code.store';
import { startMessageWorker } from './modules/orders/message-worker';
import { createMessageDelivery } from './modules/orders/message-delivery';

let env;
try {
  env = parseEnv(process.env);
} catch (error) {
  // Zorunlu yapılandırma eksikse sunucu açık bir mesajla başlamayı reddeder.
  console.error((error as Error).message);
  process.exit(1);
}

const logger = createLogger(env.LOG_LEVEL);
const prisma = createPrismaClient(env.DATABASE_URL);
const brandRepo = new PrismaBrandRepository(prisma, env.UPLOADS_DIR);
try {
  await brandRepo.migrateLegacyLogos();
} catch {
  logger.fatal('Eski logoların dosyaya taşınması başarısız. Yapılandırmayı kontrol edin.');
  await prisma.$disconnect();
  process.exit(1);
}

if (!env.smtp) {
  logger.warn(
    env.isProduction
      ? 'Ortak SMTP tanımlı değil: işletme SMTP ayarı bulunmayan adreslere giriş kodu gönderilemez.'
      : 'Ortak SMTP tanımlı değil: işletme ayarı olmayan adreslerin kodları yalnızca geliştirme konsoluna yazılır.',
  );
}

if (!env.google) {
  logger.warn(
    'Google girişi devre dışı: GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET tanımlı değil (README > Google OAuth).',
  );
}

const app = createApp({
  env,
  logger,
  repo: new PrismaAuthRepository(prisma),
  codes: new MysqlEmailCodeStore(prisma, env.COOKIE_SECRET),
  stockRepo: new PrismaStockRepository(prisma),
  brandRepo,
  catalogDb: prisma,
  hasher: argon2Hasher,
  mailer: createWorkspaceMailer(env, prisma, createMailer(env, logger), logger),
  google: env.google ? createGoogleOidcClient(env.google) : null,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
});

const server = app.listen(env.PORT, () => {
  logger.info(`API http://localhost:${env.PORT} adresinde çalışıyor`);
});
const messageWorker = startMessageWorker(prisma, createMessageDelivery(prisma, env), logger);

const shutdown = (signal: string) => {
  logger.info(`${signal} alındı, kapanıyor`);
  server.close(() => {
    void messageWorker.stop().finally(() => prisma.$disconnect()).finally(() => process.exit(0));
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
