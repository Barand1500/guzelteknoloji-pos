import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { createCampaignRouter } from '../modules/campaigns/campaign.routes';

function app(db: Record<string, unknown>) {
  const server = express();
  server.use(express.json());
  server.use((_req, res, next) => {
    res.locals.workspace = { ownerId: 7, business: { id: 3 }, owner: true, permissions: [] };
    next();
  });
  server.use(createCampaignRouter(db as unknown as PrismaClient));
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
    const server = app({ kampanya: { upsert } });
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
    expect(Number(cartCreate.discountValue.toString())).toBe(15);
    expect(upsert.mock.calls[1]?.[0]).toMatchObject({
      create: { kind: 'UCRETSIZ_KARGO', discountKind: null, discountValue: null },
      update: { discountKind: null, discountValue: null },
    });
  });
});
