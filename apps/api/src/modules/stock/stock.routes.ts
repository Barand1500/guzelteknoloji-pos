import { addStockOptionSchema, createStockSchema, removeStockOptionSchema } from '@gt/shared';
import { stockValidationMessage } from '@gt/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { readSessionToken } from '../auth/auth.cookies';
import type { AuthService } from '../auth/auth.service';
import type { StockRepository } from './stock.repository';
import { stockBulkSchema, stockListQuery } from './stock.api';
import type { PrismaClient } from '../../lib/prisma';
import { importSchema, StockImport } from './stock-import';

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new HttpError(400, 'VALIDATION_ERROR', stockValidationMessage(result.error));
  return result.data;
}

export function createStockRouter(
  env: Env,
  service: AuthService,
  repo: StockRepository,
  db?: PrismaClient,
) {
  const router = Router();
  router.use(async (req, res, next) => {
    const token = readSessionToken(req, env);
    const session = token ? await service.getSession(token) : null;
    if (!session)
      throw new HttpError(401, 'UNAUTHENTICATED', 'Stok kaydı için hesabınıza giriş yapın.');
    res.locals.stockUserId = session.user.id;
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 120 }));
  if (db) {
    const importer = new StockImport(db, repo);
    router.post('/aktarim/onizle', async (req, res) =>
      res.json(
        await importer.preview(res.locals.stockUserId as string, importSchema.parse(req.body).text),
      ),
    );
    router.post('/aktarim/kaydet', async (req, res) =>
      res.json(
        await importer.commit(res.locals.stockUserId as string, importSchema.parse(req.body).text),
      ),
    );
  }
  router.get('/secenekler', async (_req, res) =>
    res.json(await repo.getLookups(res.locals.stockUserId as string)),
  );
  router.post('/secenekler/ekle', async (req, res) => {
    const { list, label } = parse(addStockOptionSchema, req.body);
    res.status(201).json(await repo.addOption(res.locals.stockUserId as string, list, label));
  });
  router.post('/secenekler/kaldir', async (req, res) => {
    const { list, value } = parse(removeStockOptionSchema, req.body);
    await repo.removeOption(res.locals.stockUserId as string, list, value);
    res.status(204).end();
  });
  router.post('/kartlar', async (req, res) => {
    const input = parse(createStockSchema, req.body);
    res.status(201).json(await repo.create(res.locals.stockUserId as string, input));
  });
  router.get('/kartlar', async (req, res) => {
    res.json(await repo.list(res.locals.stockUserId as string, parse(stockListQuery, req.query)));
  });
  router.post('/kartlar/toplu', async (req, res) => {
    res.json(await repo.bulk(res.locals.stockUserId as string, parse(stockBulkSchema, req.body)));
  });
  router.get('/kartlar/:id/form', async (req, res) => {
    const id = parse(
      z
        .string()
        .regex(/^[1-9][0-9]{0,9}$/)
        .refine((value) => Number(value) <= 2147483647),
      req.params.id,
    );
    res.json(await repo.getDraft(res.locals.stockUserId as string, id));
  });
  router.get('/kartlar/:id', async (req, res) => {
    const id = parse(
      z
        .string()
        .regex(/^[1-9][0-9]{0,9}$/)
        .refine((value) => Number(value) <= 2147483647),
      req.params.id,
    );
    res.json(await repo.get(res.locals.stockUserId as string, id));
  });
  router.post('/kartlar/:id/guncelle', async (req, res) => {
    const id = parse(
      z
        .string()
        .regex(/^[1-9][0-9]{0,9}$/)
        .refine((value) => Number(value) <= 2147483647),
      req.params.id,
    );
    const input = parse(createStockSchema, req.body);
    res.json(await repo.update(res.locals.stockUserId as string, id, input));
  });
  return router;
}
