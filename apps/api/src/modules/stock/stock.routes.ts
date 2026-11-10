import { addStockOptionSchema, removeStockOptionSchema } from '@gt/shared';
import { stockValidationMessage } from '@gt/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { readSessionToken } from '../auth/auth.cookies';
import type { AuthService } from '../auth/auth.service';
import type { StockRepository } from './stock.repository';
import { stockBulkSchema, stockListQuery, stockSaveSchema, recordKey } from './stock.api';
import type { PrismaClient } from '../../lib/prisma';
import { importSchema, StockImport } from './stock-import';
import { createStockImages } from './stock-images';
import { registerStockVariants } from './stock-variants';

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
    res.locals.stockUserId = String(res.locals.workspace?.ownerId ?? session.user.id);
    res.set('Cache-Control', 'no-store');
    next();
  });
  const images = db ? createStockImages(env, db) : null;
  if (images) router.use(images.router);
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
    const input = parse(stockSaveSchema, req.body);
    res.status(201).json(await repo.create(res.locals.stockUserId as string, input));
  });
  router.get('/kartlar', async (req, res) => {
    res.json(await repo.list(res.locals.stockUserId as string, parse(stockListQuery, req.query)));
  });
  router.get('/kartlar/secim', async (req, res) => {
    res.json(
      await repo.selectIds(res.locals.stockUserId as string, parse(stockListQuery, req.query)),
    );
  });
  // Kod/barkod çakışma kontrolü: formda yazarken "Bu kod kullanılıyor" uyarısı için (yalnızca okur).
  if (db)
    router.get('/kartlar/kontrol', async (req, res) => {
      const q = parse(
        z.strictObject({
          kod: z.string().max(100).default(''),
          barkod: z.string().max(128).default(''),
          haric: z
            .string()
            .regex(/^[1-9][0-9]{0,9}$/)
            .optional(),
        }),
        req.query,
      );
      const userId = Number(res.locals.stockUserId);
      const except = q.haric ? { kimlik: { not: Number(q.haric) } } : {};
      const code = q.kod.trim();
      const barcode = q.barkod.trim();
      const byCode = code
        ? await db.stokKarti.findFirst({
            where: { kullaniciKimligi: userId, stokKodu: code, ...except },
            select: { kimlik: true, stokAdi: true, stokKodu: true },
          })
        : null;
      const byBarcode = barcode
        ? ((
            await db.stokBarkodu.findFirst({
              where: {
                barkod: barcode,
                stokBirimi: { stokKarti: { kullaniciKimligi: userId, ...except } },
              },
              select: {
                stokBirimi: {
                  select: {
                    stokKarti: { select: { kimlik: true, stokAdi: true, stokKodu: true } },
                  },
                },
              },
            })
          )?.stokBirimi.stokKarti ??
          (
            await db.stokVaryanti.findFirst({
              where: { barkod: barcode, stokKarti: { kullaniciKimligi: userId, ...except } },
              select: { stokKarti: { select: { kimlik: true, stokAdi: true, stokKodu: true } } },
            })
          )?.stokKarti ??
          null)
        : null;
      const card = (
        c: { kimlik: number; stokAdi: string | null; stokKodu: string | null } | null,
      ) => (c ? { id: String(c.kimlik), name: c.stokAdi ?? '', code: c.stokKodu ?? '' } : null);
      res.json({ code: card(byCode), barcode: card(byBarcode) });
    });
  router.post('/kartlar/toplu', async (req, res) => {
    const input = parse(stockBulkSchema, req.body);
    const files =
      db && input.islem === 'sil'
        ? await db.stokGorseli.findMany({
            where: {
              stokKartiId: { in: input.ids },
              stokKarti: { kullaniciKimligi: Number(res.locals.stockUserId) },
            },
            select: { dosyaAdi: true },
          })
        : [];
    const result = await repo.bulk(res.locals.stockUserId as string, input);
    if (images) await Promise.allSettled(files.map((file) => images.storage.remove(file.dosyaAdi)));
    res.json(result);
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
  router.get('/kartlar/:id/ekler', async (req, res) => {
    const id = parse(recordKey, req.params.id);
    const result = await repo.list(
      res.locals.stockUserId as string,
      stockListQuery.parse({ kimlik: id, boyut: 1 }),
    );
    const card = result.items[0];
    if (!card) throw new HttpError(404, 'NOT_FOUND', 'Stok kartı bulunamadı.');
    const attributes = db
      ? await db.stokOzellikDegeri.findMany({
          where: { stokKartiId: Number(id) },
          select: { degerId: true },
        })
      : [];
    res.json({
      categoryIds: card.categoryIds,
      dealIds: card.dealIds,
      attributeValueIds: attributes.map((x) => String(x.degerId)),
    });
  });
  if (db) registerStockVariants(router, db);
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
    const input = parse(stockSaveSchema, req.body);
    res.json(await repo.update(res.locals.stockUserId as string, id, input));
  });
  return router;
}
