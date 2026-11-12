import { customHolidayDraftSchema } from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { HolidayRepository } from './holiday.repository';
import { officialDays } from './nager';

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

const idSchema = z.string().regex(/^\d+$/, 'Geçersiz kayıt kimliği.');
const idOf = (raw: string) => Number(parse(idSchema, raw));
const yearSchema = z.coerce.number().int().min(2000).max(2100);

/** Tanımlamalar › Resmi Tatil Günleri: resmî günler dış servisten, özel tatiller veritabanından. */
export function createHolidayRouter(db: PrismaClient, env: Env) {
  const repo = new HolidayRepository(db);
  const router = Router();
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 120 }));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const year = parse(yearSchema, req.query.yil ?? new Date().getFullYear());
    const [{ official, offline }, custom] = await Promise.all([
      officialDays(year),
      repo.list(ctx.business.id, year),
    ]);
    res.json({ official, custom, offline });
  });

  router.post('/', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res
      .status(201)
      .json(await repo.save(ctx.business.id, parse(customHolidayDraftSchema, req.body)));
  });

  router.post('/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.save(
        ctx.business.id,
        parse(customHolidayDraftSchema, req.body),
        idOf(req.params.id!),
      ),
    );
  });

  router.post('/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.remove(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  return router;
}
