import { notificationDraftSchema } from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { NotificationRepository } from './notification.repository';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      result.error.issues[0]?.message ?? 'Bilgileri kontrol edin.',
    );
  return result.data;
}

function context(res: Response): AccessContext {
  const value = res.locals.workspace as AccessContext | undefined;
  if (!value) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
  return value;
}

const idSchema = z.string().regex(/^\d+$/, 'Geçersiz bildirim kimliği.');

/** Mobil Bildirimler: listele, gönder/planla, planlananı iptal et. */
export function createNotificationRouter(db: PrismaClient, env: Env) {
  const repo = new NotificationRepository(db);
  const router = Router();
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 120 }));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/mobil', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'notifications', 'read');
    res.json(await repo.list(ctx.business.id));
  });

  router.post('/mobil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'notifications', 'save');
    const draft = parse(notificationDraftSchema, req.body);
    res.status(201).json(await repo.create(ctx.business.id, draft));
  });

  router.post('/mobil/:id/iptal', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'notifications', 'save');
    const id = Number(parse(idSchema, req.params.id));
    await repo.cancel(ctx.business.id, id);
    res.status(204).end();
  });

  return router;
}
