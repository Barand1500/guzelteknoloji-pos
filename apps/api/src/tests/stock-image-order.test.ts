import { describe, expect, it } from 'vitest';
import { orderedStockImages } from '../modules/stock/stock-images';
import { createStockImages } from '../modules/stock/stock-images';
import express from 'express';
import request from 'supertest';
import { vi } from 'vitest';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';
import type { Env } from '../config/env';
import type { PrismaClient } from '../lib/prisma';

const rows = [
  { id: 1, dosyaAdi: 'existing.png' },
  { id: 2, dosyaAdi: 'uploaded.png' },
];

describe('Ürün görsel sırası', () => {
  it('yeni dosya olmadan mevcut sıralamayı kaydeder ve eksik listeyi reddeder', async () => {
    const update = vi.fn().mockResolvedValue({});
    const tx = {
      $queryRaw: vi.fn(),
      stokKarti: { count: vi.fn().mockResolvedValue(1) },
      stokGorseli: {
        findMany: vi.fn().mockImplementation(async ({ where }) => (where.stokKartiId ? rows : [])),
        aggregate: vi.fn().mockResolvedValue({ _max: { sira: 1 } }),
        update,
      },
    };
    const db = {
      $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx),
    } as unknown as PrismaClient;
    const env = { UPLOADS_DIR: '.', COOKIE_SECRET: 'test', rateLimitEnabled: false } as Env;
    const app = express().use(express.json());
    app.use((_req, res, next) => {
      res.locals.stockUserId = '7';
      next();
    });
    app.use(createStockImages(env, db).router, errorHandler(createLogger('silent')));
    const entry = { productId: 3, tickets: [], finalOrder: [{ imageId: 2 }, { imageId: 1 }] };
    const response = await request(app)
      .post('/gorseller/kaydet')
      .send({ replace: false, entries: [entry] });
    expect(response.status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(1, { where: { id: 2 }, data: { sira: 0 } });
    expect(update).toHaveBeenNthCalledWith(2, { where: { id: 1 }, data: { sira: 1 } });
    update.mockClear();
    const invalid = await request(app)
      .post('/gorseller/kaydet')
      .send({ replace: false, entries: [{ ...entry, finalOrder: [{ imageId: 1 }] }] });
    expect(invalid.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
    const replace = await request(app)
      .post('/gorseller/kaydet')
      .send({ replace: true, entries: [entry] });
    expect(replace.status).toBe(400);
  });
  it('yeni yüklemeyi mevcut görselin önüne alabilir', () => {
    expect(
      orderedStockImages(rows, [{ file: 'uploaded.png' }, { imageId: 1 }]).map((r) => r.id),
    ).toEqual([2, 1]);
  });
  it.each([
    [{ imageId: 1 }],
    [{ imageId: 1 }, { imageId: 1 }],
    [{ imageId: 1 }, { imageId: 999 }],
    [{ imageId: 1 }, { file: 'another-product.png' }],
    [{ imageId: 1 }, { imageId: 2 }, { imageId: 3 }],
  ])('eksik, yinelenen veya başka ürüne ait sırayı reddeder: %j', (...order) => {
    expect(() => orderedStockImages(rows, order)).toThrow('Ürünün görselleri değişmiş');
  });
});
