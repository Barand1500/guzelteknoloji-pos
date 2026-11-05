/**
 * YALNIZCA GELİŞTİRME: e-posta/şifre girişini denemek için bir test kullanıcısı oluşturur
 * veya şifresini günceller. Production'da çalışmayı reddeder; kod içinde sabit şifre yoktur.
 *
 * Kullanım:
 *   SEED_USER_EMAIL=deneme@example.com SEED_USER_PASSWORD='en-az-12-karakter' npm run db:seed:dev
 */
import { loginSchema, normalizeEmail } from '@gt/shared';
import { argon2Hasher } from '../src/lib/password';
import { createPrismaClient } from '../src/lib/prisma';
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository';

const MIN_SEED_PASSWORD_LENGTH = 12;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed betiği production ortamında çalıştırılamaz.');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL tanımlı değil.');

  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new Error('SEED_USER_EMAIL ve SEED_USER_PASSWORD geçerli biçimde tanımlanmalıdır.');
  }
  if (parsed.data.password.length < MIN_SEED_PASSWORD_LENGTH) {
    throw new Error(`SEED_USER_PASSWORD en az ${MIN_SEED_PASSWORD_LENGTH} karakter olmalıdır.`);
  }

  const prisma = createPrismaClient(databaseUrl);
  try {
    const repo = new PrismaAuthRepository(prisma);
    const user = await repo.upsertPasswordUser({
      email: normalizeEmail(parsed.data.email),
      passwordHash: await argon2Hasher.hash(parsed.data.password),
      displayName: process.env.SEED_USER_NAME?.trim() || null,
    });
    console.log(`Geliştirme kullanıcısı hazır: ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
