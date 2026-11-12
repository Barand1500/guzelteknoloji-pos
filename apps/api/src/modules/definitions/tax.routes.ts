import {
  nameDraftSchema,
  nameListSchema,
  priceListDraftSchema,
  taxOfficeDraftSchema,
  taxRateSchema,
  taxTypeDraftSchema,
} from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { StockDefRepository } from './stockdef.repository';
import { TaxRepository } from './tax.repository';

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

function limiter(env: Env) {
  return createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 180 });
}

/** Vergiler: tür + oranlar. */
export function createTaxTypeRouter(db: PrismaClient, env: Env) {
  const repo = new TaxRepository(db);
  const router = Router();
  router.use(limiter(env));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.types(ctx.business.id));
  });

  router.post('/', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(taxTypeDraftSchema, req.body);
    res.status(201).json(await repo.saveType(ctx.business.id, draft));
  });

  router.post('/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(taxTypeDraftSchema, req.body);
    res.json(await repo.saveType(ctx.business.id, draft, idOf(req.params.id!)));
  });

  router.post('/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeType(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  router.post('/:id/oranlar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(taxRateSchema, req.body);
    res.json(await repo.addRate(ctx.business.id, idOf(req.params.id!), body.rate));
  });

  router.post('/:id/oranlar/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(taxRateSchema, req.body);
    res.json(await repo.removeRate(ctx.business.id, idOf(req.params.id!), body.rate));
  });

  return router;
}

/** Vergi daireleri. */
export function createTaxOfficeRouter(db: PrismaClient, env: Env) {
  const repo = new TaxRepository(db);
  const router = Router();
  router.use(limiter(env));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.offices(ctx.business.id));
  });

  router.post('/', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(taxOfficeDraftSchema, req.body);
    res.status(201).json(await repo.saveOffice(ctx.business.id, draft));
  });

  router.post('/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(taxOfficeDraftSchema, req.body);
    res.json(await repo.saveOffice(ctx.business.id, draft, idOf(req.params.id!)));
  });

  router.post('/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeOffice(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  return router;
}

/** Cari ve Stok Tanımları: cari tipleri, stok tipleri, ölçü birimleri, fiyat listeleri. */
export function createStockDefsRouter(db: PrismaClient, env: Env) {
  const repo = new StockDefRepository(db);
  const router = Router();
  router.use(limiter(env));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/fiyat-listeleri', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.priceLists(ctx.business.id, ctx.ownerId));
  });

  router.post('/fiyat-listeleri', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(priceListDraftSchema, req.body);
    res.status(201).json(await repo.savePriceList(ctx.business.id, ctx.ownerId, draft));
  });

  router.post('/fiyat-listeleri/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const draft = parse(priceListDraftSchema, req.body);
    res.json(await repo.savePriceList(ctx.business.id, ctx.ownerId, draft, idOf(req.params.id!)));
  });

  router.post('/fiyat-listeleri/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removePriceList(ctx.business.id, ctx.ownerId, idOf(req.params.id!));
    res.status(204).end();
  });

  router.post('/fiyat-listeleri/:id/varsayilan', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    await repo.setDefaultPriceList(ctx.business.id, ctx.ownerId, idOf(req.params.id!));
    res.status(204).end();
  });

  router.get('/:liste', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const list = parse(nameListSchema, req.params.liste);
    res.json(await repo.names(ctx.business.id, ctx.ownerId, list));
  });

  router.post('/:liste', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const list = parse(nameListSchema, req.params.liste);
    const draft = parse(nameDraftSchema, req.body);
    res.status(201).json(await repo.saveName(ctx.business.id, ctx.ownerId, list, draft));
  });

  router.post('/:liste/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const list = parse(nameListSchema, req.params.liste);
    const draft = parse(nameDraftSchema, req.body);
    res.json(await repo.saveName(ctx.business.id, ctx.ownerId, list, draft, idOf(req.params.id!)));
  });

  router.post('/:liste/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    const list = parse(nameListSchema, req.params.liste);
    await repo.removeName(ctx.business.id, ctx.ownerId, list, idOf(req.params.id!));
    res.status(204).end();
  });

  return router;
}
