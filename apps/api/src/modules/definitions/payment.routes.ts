import { paymentActiveSchema, paymentDraftSchema, siteReorderSchema } from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { PaymentRepository } from './payment.repository';

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

/** Tanımlamalar › Ödeme Şekilleri (kasa/ödeme ekranındaki sıralı yöntemler). */
export function createPaymentRouter(db: PrismaClient, env: Env) {
  const repo = new PaymentRepository(db, env.UPLOADS_DIR);
  const router = Router();
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 180 }));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.list(ctx.business.id));
  });

  router.get('/:id/gorsel', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const image = await repo.image(ctx.business.id, idOf(req.params.id!));
    res.set('Cache-Control', 'private, max-age=86400');
    res.type(image.mime).send(image.data);
  });

  /** `/sirala`, `/:id`'den ÖNCE tanımlı olmalı; yoksa "sirala" kimlik sanılır. */
  router.post('/sirala', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    await repo.reorder(ctx.business.id, parse(siteReorderSchema, req.body).ids);
    res.status(204).end();
  });

  router.post('/', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.status(201).json(await repo.save(ctx.business.id, parse(paymentDraftSchema, req.body)));
  });

  router.post('/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.save(ctx.business.id, parse(paymentDraftSchema, req.body), idOf(req.params.id!)),
    );
  });

  router.post('/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.remove(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  router.post('/:id/aktiflik', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(paymentActiveSchema, req.body);
    await repo.setActive(ctx.business.id, idOf(req.params.id!), body.active);
    res.status(204).end();
  });

  return router;
}
