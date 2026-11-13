import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { createCampaignRouter } from '../modules/campaigns/campaign.routes';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';

function app(db: Record<string, unknown>) {
  const server = express();
  server.use(express.json());
  server.use((_req, res, next) => {
    res.locals.workspace = { ownerId: 7, business: { id: 3 }, owner: true, permissions: [] };
    next();
  });
  server.use(createCampaignRouter(db as unknown as PrismaClient));
  server.use(errorHandler(createLogger('silent')));
  return server;
}

describe('Kampanya API', () => {
  it('iki kampanya türü için kayıt yokken boş ve birbirinden bağımsız varsayılan döndürür', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const server = app({ kampanya: { findUnique } });

    const cart = await request(server).get('/sepet-indirimi');
    const shipping = await request(server).get('/ucretsiz-kargo');

    expect(cart.status).toBe(200);
    expect(cart.body).toEqual({
      general: {
        active: false,
        customerTypes: [],
        priceLists: [],
        minTotal: 0,
        discountKind: 'percent',
        discountValue: 0,
      },
      rules: [],
    });
    expect(shipping.status).toBe(200);
    expect(shipping.body.general).toMatchObject({ active: false, minTotal: 0 });
    expect(shipping.body.rules).toEqual([]);
    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { userId_kind: { userId: 7, kind: 'SEPET_INDIRIMI' } },
      include: expect.any(Object),
    });
    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: { userId_kind: { userId: 7, kind: 'UCRETSIZ_KARGO' } },
      include: expect.any(Object),
    });
  });

  it('sepette indirimi saklar, ücretsiz kargoda indirim alanlarını boş bırakır', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const server = app({
      kampanya: { upsert },
      cariTipi: { findMany: vi.fn().mockResolvedValue([{ id: 5, ad: 'Bayi' }]) },
      stokSecenegi: { findMany: vi.fn().mockResolvedValue([{ kimlik: 6, secenekAdi: 'TOPTAN' }]) },
    });
    const general = {
      active: true,
      customerTypes: ['Bayi'],
      priceLists: ['TOPTAN'],
      minTotal: 500,
      discountKind: 'percent',
      discountValue: 15,
    };

    const cart = await request(server).post('/sepet-indirimi/genel').send(general);
    const shipping = await request(server)
      .post('/ucretsiz-kargo/genel')
      .send({ ...general, discountValue: 0 });

    expect(cart.status).toBe(204);
    expect(shipping.status).toBe(204);
    const cartCreate = upsert.mock.calls[0]?.[0].create;
    expect(cartCreate).toMatchObject({ kind: 'SEPET_INDIRIMI', discountKind: 'YUZDE' });
    expect(cartCreate.customerTypes).toEqual(['5']);
    expect(cartCreate.priceLists).toEqual(['6']);
    expect(Number(cartCreate.discountValue.toString())).toBe(15);
    expect(upsert.mock.calls[1]?.[0]).toMatchObject({
      create: { kind: 'UCRETSIZ_KARGO', discountKind: null, discountValue: null },
      update: { discountKind: null, discountValue: null },
    });
  });

  it('işletmenin gerçek seçim kimliklerini kaydeder; başka işletmenin seçimini reddeder', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const types = vi.fn().mockResolvedValue([{ id: 5, ad: 'Özel bayi' }]);
    const prices = vi.fn().mockResolvedValue([{ kimlik: 6, secenekAdi: 'Yeni liste' }]);
    const server = app({ kampanya: { upsert }, cariTipi: { findMany: types }, stokSecenegi: { findMany: prices } });
    const body = { active: true, customerTypes: ['5'], priceLists: ['6'], minTotal: 50, discountKind: 'percent', discountValue: 10 };
    expect((await request(server).post('/sepet-indirimi/genel').send(body)).status).toBe(204);
    expect(types).toHaveBeenCalledWith(expect.objectContaining({ where: { isletmeId: 3 } }));
    expect(prices).toHaveBeenCalledWith(expect.objectContaining({ where: { kullaniciKimligi: 7, listeTuru: 'priceLists', durum: true } }));
    expect((await request(server).post('/sepet-indirimi/genel').send({ ...body, priceLists: ['999'] })).status).toBe(400);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
