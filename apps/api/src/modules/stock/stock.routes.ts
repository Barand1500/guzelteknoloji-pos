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
import { Prisma } from '../../generated/prisma/client';

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
  if (db) {
    const variantSchema = z.strictObject({
      code: z.string().trim().min(1).max(100),
      barcode: z.string().trim().max(100),
      price: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
      quantity: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/),
      valueIds: z
        .array(z.string().regex(/^[1-9][0-9]{0,9}$/))
        .min(1)
        .max(30),
    });
    router.get('/kartlar/:id/varyantlar', async (req, res) => {
      const id = Number(parse(recordKey, req.params.id));
      const card = await db.stokKarti.findFirst({
        where: { kimlik: id, kullaniciKimligi: Number(res.locals.stockUserId) },
      });
      if (!card) throw new HttpError(404, 'NOT_FOUND', 'Ürün bulunamadı.');
      const rows = await db.stokVaryanti.findMany({
        where: { stokKartiId: id },
        include: { degerler: true },
        orderBy: { id: 'asc' },
      });
      res.json(
        rows.map((v) => ({
          code: v.kod,
          barcode: v.barkod ?? '',
          price: v.fiyat.toString(),
          quantity: v.miktar.toString(),
          valueIds: v.degerler.map((d) => String(d.degerId)),
        })),
      );
    });
    router.post('/kartlar/:id/varyantlar', async (req, res) => {
      const id = Number(parse(recordKey, req.params.id));
      const { variants } = z
        .strictObject({ variants: z.array(variantSchema).max(200) })
        .parse(req.body);
      const user = Number(res.locals.stockUserId);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${user} FOR UPDATE`);
        const card = await tx.stokKarti.findFirst({
          where: { kimlik: id, kullaniciKimligi: user },
        });
        if (!card) throw new HttpError(404, 'NOT_FOUND', 'Ürün bulunamadı.');
        const selected = await tx.stokOzellikDegeri.findMany({
          where: { stokKartiId: id },
          include: { deger: { include: { grup: true } } },
        });
        const valid = selected.filter((x) => x.deger.grup.varyant);
        const groupIds = new Set(valid.map((x) => x.deger.grupId));
        const codes = new Set<string>(),
          barcodes = new Set<string>(),
          combinations = new Set<string>();
        for (const variant of variants) {
          const ids = variant.valueIds.map(Number);
          const chosen = valid.filter((x) => ids.includes(x.degerId));
          const combination = [...ids].sort((a, b) => a - b).join(',');
          if (
            new Set(ids).size !== ids.length ||
            chosen.length !== ids.length ||
            new Set(chosen.map((x) => x.deger.grupId)).size !== groupIds.size ||
            ids.length !== groupIds.size
          )
            throw new HttpError(
              400,
              'VALIDATION_ERROR',
              'Her varyant grubu için bir özellik seçin.',
            );
          const code = variant.code.toLocaleLowerCase('tr-TR');
          if (
            codes.has(code) ||
            combinations.has(combination) ||
            (variant.barcode && barcodes.has(variant.barcode))
          )
            throw new HttpError(
              409,
              'CONFLICT',
              'Varyant kodu, barkodu veya özellik birleşimi tekrar ediyor.',
            );
          codes.add(code);
          combinations.add(combination);
          if (variant.barcode) barcodes.add(variant.barcode);
        }
        const conflicts = await tx.stokVaryanti.findMany({
          where: {
            stokKartiId: { not: id },
            stokKarti: { kullaniciKimligi: user },
            OR: [{ kod: { in: variants.map((v) => v.code) } }, { barkod: { in: [...barcodes] } }],
          },
        });
        if (
          conflicts.length ||
          (await tx.stokKarti.findFirst({
            where: { kullaniciKimligi: user, stokKodu: { in: variants.map((v) => v.code) } },
          })) ||
          (await tx.stokBarkodu.findFirst({
            where: {
              barkod: { in: [...barcodes] },
              stokBirimi: { stokKarti: { kullaniciKimligi: user } },
            },
          }))
        )
          throw new HttpError(
            409,
            'CONFLICT',
            'Varyant kodu veya barkodu başka bir üründe kullanılıyor.',
          );
        await tx.stokVaryanti.deleteMany({ where: { stokKartiId: id } });
        for (const v of variants)
          await tx.stokVaryanti.create({
            data: {
              stokKartiId: id,
              kod: v.code,
              barkod: v.barcode || null,
              fiyat: v.price,
              miktar: v.quantity,
              degerler: { create: v.valueIds.map((degerId) => ({ degerId: Number(degerId) })) },
            },
          });
      });
      res.status(204).end();
    });
  }
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
