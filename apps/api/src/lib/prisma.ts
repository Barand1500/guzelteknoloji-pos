import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

/** Veritabanına ulaşılamazsa istek ~30 sn asılı kalmasın; kullanıcıya hızlı hata dönülsün. */
const POOL_DEFAULTS = { connectTimeout: '5000', acquireTimeout: '8000' };

/** MySQL ve MariaDB için Prisma'nın resmî mariadb sürücü adaptörü kullanılır. */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const url = new URL(databaseUrl.replace(/^mysql:\/\//, 'mariadb://'));
  for (const [key, value] of Object.entries(POOL_DEFAULTS)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return new PrismaClient({ adapter: new PrismaMariaDb(url.href) });
}

export type { PrismaClient };
