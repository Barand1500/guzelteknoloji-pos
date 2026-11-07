import express, { Router } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import type { PrismaClient } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { errorHandler } from '../middleware/error-handler';
import { registerStockVariants, variantSchema } from '../modules/stock/stock-variants';

function setup() {
  type Row = {
    id: number;
    kod: string;
    barkod: string | null;
    fiyat: Prisma.Decimal;
    miktar: Prisma.Decimal;
    degerler: { degerId: number }[];
  };
  let rows: Row[] = [];
  let sequence = 0;
  const selected = [1, 2].map((id) => ({
    degerId: id,
    deger: { grupId: 10, grup: { varyant: true } },
  }));
  const update = vi.fn();
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    stokKarti: {
      findFirst: vi.fn(async ({ where }) =>
        where.kimlik === 7 && where.kullaniciKimligi === 1 ? { kimlik: 7 } : null,
      ),
      update,
    },
    stokOzellikDegeri: { findMany: vi.fn(async () => selected) },
    stokBarkodu: { findFirst: vi.fn().mockResolvedValue(null) },
    stokVaryanti: {
      findMany: vi.fn(async () => rows),
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn(async () => {
        rows = [];
      }),
      create: vi.fn(async ({ data }) => {
        rows.push({
          id: ++sequence,
          kod: data.kod,
          barkod: data.barkod,
          fiyat: new Prisma.Decimal(data.fiyat),
          miktar: new Prisma.Decimal(data.miktar),
          degerler: data.degerler.create,
        });
      }),
    },
  };
  const db = {
    $transaction: (fn: (arg: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient;
  const app = express();
  app.use(express.json(), (_req, res, next) => {
    res.locals.stockUserId = '1';
    next();
  });
  const router = Router();
  registerStockVariants(router, db);
  app.use(router, errorHandler(createLogger('silent')));
  const get = () => request(app).get('/kartlar/7/varyantlar');
  const post = (revision: string, variants: unknown[]) =>
    request(app).post('/kartlar/7/varyantlar').send({ revision, variants });
  return { app, get, post, tx, selected, update };
}
const variant = (id = '1') => ({
  code: 'A-' + id,
  barcode: '0012' + id,
  price: '12,50',
  quantity: '5,75',
  valueIds: [id],
});

describe('Varyant kayıt akışı', () => {
  it('virgülleri kaydeder, miktarları tam hassasiyetle toplar ve yeni sürüm döndürür', async () => {
    const s = setup();
    const initial = await s.get().expect(200);
    const saved = await s.post(initial.body.revision, [variant(), variant('2')]).expect(200);
    expect(saved.body.variants[0]).toMatchObject({
      price: '12.5',
      quantity: '5.75',
      barcode: '00121',
    });
    expect(saved.body.revision).not.toBe(initial.body.revision);
    expect(s.update.mock.calls[0]![0].data.stokMiktari.toString()).toBe('11.5');
    expect((await s.get()).body).toEqual(saved.body);
    await s.post(saved.body.revision, []).expect(200);
    expect(s.update.mock.calls.at(-1)![0].data.stokMiktari.toString()).toBe('0');
    expect((await s.get()).body.variants).toEqual([]);
  });
  it('eski sekmenin kaydı yeni varyantları silemez', async () => {
    const s = setup();
    const tabA = await s.get();
    const tabB = await s.get();
    await s.post(tabA.body.revision, [variant()]).expect(200);
    const result = await s.post(tabB.body.revision, []).expect(409);
    expect(result.body.error.message).toContain('başka bir işlemde değişti');
    expect((await s.get()).body.variants).toHaveLength(1);
    expect(s.tx.stokVaryanti.deleteMany).toHaveBeenCalledTimes(1);
  });
  it('özellik seçimleri değişince eski sürümü reddeder; yeni sürümde eksik grubu satırıyla açıklar', async () => {
    const s = setup();
    const old = await s.get();
    s.selected.push({ degerId: 3, deger: { grupId: 20, grup: { varyant: true } } });
    await s.post(old.body.revision, [variant()]).expect(409);
    const fresh = await s.get();
    const rejected = await s.post(fresh.body.revision, [variant()]).expect(400);
    expect(rejected.body.error.message).toContain('1. varyant');
    expect(s.tx.stokVaryanti.deleteMany).not.toHaveBeenCalled();
  });
  it('hesap/kart kontrolü ve yinelenen birleşim doğrulaması yazmadan çalışır', async () => {
    const s = setup();
    await request(s.app).get('/kartlar/8/varyantlar').expect(404);
    const fresh = await s.get();
    await s
      .post(fresh.body.revision, [variant(), { ...variant(), code: 'B', barcode: 'B' }])
      .expect(409);
    expect(s.tx.stokVaryanti.deleteMany).not.toHaveBeenCalled();
  });
  it('miktarda eksiye izin verir; negatif fiyat, hatalı virgül ve taşmayı reddeder', () => {
    expect(variantSchema.parse({ ...variant(), quantity: '-2,25' }).quantity).toBe('-2.25');
    for (const price of ['-1', '1,2,3', '1e3', '1000000000000', '1.1234567'])
      expect(variantSchema.safeParse({ ...variant(), price }).success).toBe(false);
  });
});
