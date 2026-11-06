import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { parseEnv } from '../src/config/env';
import { createLogger } from '../src/lib/logger';
import { createPrismaClient } from '../src/lib/prisma';
import { createCodeRedisClient } from '../src/modules/auth/redis-email-code.store';

// Migration öncesi kontrol: hatada eski API henüz durdurulmamış olur.
const env = parseEnv(process.env);
const prisma = createPrismaClient(env.DATABASE_URL);
const redis = createCodeRedisClient(env.REDIS_URL, createLogger('silent'));
try {
  await prisma.$queryRaw`SELECT 1`;
  await redis.connect();
  await redis.withCommandOptions({ timeout: 5000 }).ping();
  const save = await redis.configGet('save');
  const appendonly = await redis.configGet('appendonly');
  if (save.save !== '' || appendonly.appendonly !== 'no') {
    throw new Error('Doğrulama kodları için Redis disk kalıcılığı kapalı olmalı.');
  }
  await mkdir(env.UPLOADS_DIR, { recursive: true });
  await access(env.UPLOADS_DIR, constants.R_OK | constants.W_OK);
  console.log('Dağıtım ön kontrolü başarılı: ortam, MySQL, Redis ve uploads.');
} catch {
  console.error(
    'Dağıtım ön kontrolü başarısız. Ortam ayarlarını, MySQL, Redis ve uploads erişimini kontrol edin.',
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled([
    redis.isOpen ? redis.close() : Promise.resolve(),
    prisma.$disconnect(),
  ]);
}
