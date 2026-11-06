import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { parseEnv } from '../src/config/env';
import { createPrismaClient } from '../src/lib/prisma';

// Migration öncesi kontrol: hatada eski API henüz durdurulmamış olur.
const env = parseEnv(process.env);
const prisma = createPrismaClient(env.DATABASE_URL);
try {
  await prisma.$queryRaw`SELECT 1`;
  await mkdir(env.UPLOADS_DIR, { recursive: true });
  await access(env.UPLOADS_DIR, constants.R_OK | constants.W_OK);
  console.log('Dağıtım ön kontrolü başarılı: ortam, MySQL ve uploads.');
} catch {
  console.error(
    'Dağıtım ön kontrolü başarısız. Ortam ayarlarını, MySQL ve uploads erişimini kontrol edin.',
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
