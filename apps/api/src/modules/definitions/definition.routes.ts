import {
  carrierDraftSchema,
  currencyActiveSchema,
  currencyDraftSchema,
  definitionDraftSchema,
  listKeySchema,
  locationRenameSchema,
  priceTableSchema,
  RATE_TYPES,
} from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { CurrencyRepository } from './currency.repository';
import { ShippingRepository } from './shipping.repository';

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

const rateQuerySchema = z.strictObject({
  kod: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Kur için üç harfli para kodu gerekli.'),
  tip: z.enum(RATE_TYPES),
});

/** Para birimleri: işletme kapsamlı liste, kaydet, sil, aktiflik ve TCMB kuru. */
export function createCurrencyRouter(db: PrismaClient, env: Env) {
  const repo = new CurrencyRepository(db);
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

  router.get('/', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.list(ctx.business.id));
  });

  router.get('/kur', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const query = parse(rateQuerySchema, req.query);
    res.json({ rate: await repo.preview(query.kod, query.tip) });
  });

  router.post('/', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(currencyDraftSchema, req.body);
    res.status(201).json(await repo.save(ctx.business.id, draft));
  });

  router.post('/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(currencyDraftSchema, req.body);
    res.json(await repo.save(ctx.business.id, draft, idOf(req.params.id!)));
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
    const body = parse(currencyActiveSchema, req.body);
    await repo.setActive(ctx.business.id, idOf(req.params.id!), body.active);
    res.status(204).end();
  });

  router.post('/:id/guncelle', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(await repo.refresh(ctx.business.id, idOf(req.params.id!)));
  });

  return router;
}

/** Kargo ve Nakliye: firmalar + fiyat tabloları, lokasyon ağacı ve tanım listeleri. */
export function createShippingRouter(db: PrismaClient, env: Env) {
  const repo = new ShippingRepository(db);
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

  router.get('/firmalar', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.carriers(ctx.business.id));
  });

  router.post('/firmalar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(carrierDraftSchema, req.body);
    res.status(201).json(await repo.saveCarrier(ctx.business.id, draft));
  });

  router.post('/firmalar/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(carrierDraftSchema, req.body);
    res.json(await repo.saveCarrier(ctx.business.id, draft, idOf(req.params.id!)));
  });

  router.post('/firmalar/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeCarrier(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  router.post('/firmalar/:id/fiyatlar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const table = parse(priceTableSchema, req.body);
    await repo.savePrices(ctx.business.id, idOf(req.params.id!), table);
    res.status(204).end();
  });

  router.get('/lokasyonlar', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.locations(ctx.business.id));
  });

  const locationBody = z.strictObject({
    parentId: idSchema.nullable(),
    name: z.string().trim().min(1, 'Konum adı gerekli.').max(120),
  });

  router.post('/lokasyonlar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(locationBody, req.body);
    res
      .status(201)
      .json(
        await repo.createLocation(
          ctx.business.id,
          body.parentId === null ? null : Number(body.parentId),
          body.name,
        ),
      );
  });

  router.post('/lokasyonlar/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(locationRenameSchema, req.body);
    res.json(await repo.renameLocation(ctx.business.id, idOf(req.params.id!), body.name));
  });

  router.post('/lokasyonlar/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeLocation(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  router.get('/tanimlar/:liste', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const list = parse(listKeySchema, req.params.liste);
    res.json(await repo.definitions(ctx.business.id, list));
  });

  router.post('/tanimlar/:liste', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const list = parse(listKeySchema, req.params.liste);
    const draft = parse(definitionDraftSchema, req.body);
    res.status(201).json(await repo.saveDefinition(ctx.business.id, list, draft));
  });

  router.post('/tanimlar/:liste/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const list = parse(listKeySchema, req.params.liste);
    const draft = parse(definitionDraftSchema, req.body);
    res.json(await repo.saveDefinition(ctx.business.id, list, draft, idOf(req.params.id!)));
  });

  router.post('/tanimlar/:liste/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    const list = parse(listKeySchema, req.params.liste);
    await repo.removeDefinition(ctx.business.id, list, idOf(req.params.id!));
    res.status(204).end();
  });

  return router;
}
