import { Router } from 'express';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { readSessionToken } from '../auth/auth.cookies';
import type { AuthService } from '../auth/auth.service';
import { prepareBrandLogo } from '../brands/brand.repository';
import type { BrandLogoStorage } from '../brands/brand-logo.storage';

export const fold = (s: string) => s.normalize('NFC').trim().toLocaleLowerCase('tr-TR');
export function catalogRouter(env: Env, auth: AuthService) {
  const router = Router();
  router.use(async (req, res, next) => {
    const token = readSessionToken(req, env);
    const session = token ? await auth.getSession(token) : null;
    if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
    res.locals.catalogUserId = Number(session.user.id);
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 300 }));
  return router;
}
export function catalogWrite<T>(
  db: PrismaClient,
  user: number,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id=${user} FOR UPDATE`);
      return fn(tx);
    },
    { timeout: 15000 },
  );
}
export function checkOrder(existing: number[], ids: number[]) {
  if (
    ids.length !== existing.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !existing.includes(id))
  )
    throw new HttpError(409, 'CONFLICT', 'Liste değişmiş. Yenileyip tekrar sıralayın.');
}
export async function imageFile(storage: BrandLogoStorage, value: string | null) {
  if (!value?.startsWith('data:')) return null;
  const image = await prepareBrandLogo(value);
  return image ? storage.write(image.data, image.format) : null;
}
export async function rollbackImage(
  storage: BrandLogoStorage,
  file: string | null,
  error: unknown,
): Promise<never> {
  if (file && error instanceof HttpError) await storage.remove(file).catch(() => undefined);
  throw error;
}
