import { seoKindSchema, seoRedirectDraftSchema, seoSaveSchema } from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { SeoRepository } from './seo.repository';

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

const listQuerySchema = z.object({
  ara: z.string().trim().max(120).optional(),
  sayfa: z.coerce.number().int().min(1).default(1),
  adet: z.coerce.number().int().min(1).max(200).default(10),
});

const idSchema = z.string().regex(/^\d+$/, 'Geçersiz kayıt kimliği.');
const idOf = (raw: string) => Number(parse(idSchema, raw));

/** SEO Ayarları: katalog kayıtlarının SEO başlık/açıklama alanları ve 301 yönlendirmeleri. */
export function createSeoRouter(env: Env, db: PrismaClient) {
  const repo = new SeoRepository(db);
  const router = Router();
  const limit = createRateLimiter({
    enabled: env.rateLimitEnabled,
    windowMs: 60000,
    limit: 180,
  });
  router.use(limit);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/:tur', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const tur = parse(seoKindSchema, req.params.tur);
    const query = parse(listQuerySchema, req.query);
    res.json(
      await repo.list(ctx.ownerId, ctx.business.id, tur, query.ara, query.sayfa, query.adet),
    );
  });

  router.post('/yonlendirme', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(seoRedirectDraftSchema, req.body);
    await repo.addRedirect(ctx.ownerId, ctx.business.id, draft);
    res.status(201).end();
  });

  router.post('/yonlendirme/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const input = parse(seoSaveSchema, req.body);
    await repo.updateRedirect(ctx.business.id, idOf(req.params.id!), input);
    res.status(204).end();
  });

  router.post('/yonlendirme/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeRedirect(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  router.post('/:tur/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const tur = parse(seoKindSchema, req.params.tur);
    const input = parse(seoSaveSchema, req.body);
    await repo.save(ctx.ownerId, ctx.business.id, tur, idOf(req.params.id!), input);
    res.status(204).end();
  });

  return router;
}
