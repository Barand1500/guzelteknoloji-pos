import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import type { PrismaClient } from '../lib/prisma';
import { quoteCampaignCart } from '../modules/campaigns/campaign-quote';
import express from 'express';
import request from 'supertest';
import { createCampaignRouter } from '../modules/campaigns/campaign.routes';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';

const D = Prisma.Decimal;
function fixture() {
  const product = {
    kimlik: 1,
    stokAdi: 'Kalem',
    markaKimligi: null,
    envanterTakibi: 'normal',
    stokMiktari: new D(3),
    kategoriler: [],
    varyantlar: [],
    birimler: [
      {
        fiyatlar: [
          {
            girilenFiyat: new D(50),
            iskontoOrani: new D(20),
            kdvOrani: new D(20),
            kdvDahilGirildi: false,
            paraBirimi: 'TRY',
          },
        ],
      },
    ],
  };
  const tx = {
    stokSecenegi: { findFirst: vi.fn(async () => ({ kimlik: 6, secenekAdi: 'FİYAT' })) },
    cariTipi: { findFirst: vi.fn(async () => ({ id: 5, ad: 'Bayi' })) },
    fiyatListesiAyari: { findFirst: vi.fn(async () => null) },
    stokKarti: { findMany: vi.fn(async () => [product]) },
    kampanya: {
      findMany: vi.fn(async () => [
        {
          id: 1,
          kind: 'SEPET_INDIRIMI',
          durum: true,
          customerTypes: ['5'],
          priceLists: ['6'],
          minTotal: new D(0),
          discountKind: 'YUZDE',
          discountValue: new D(10),
          rules: [],
        },
      ]),
    },
  };
  const db = {
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaClient;
  return { db, tx, product };
}
const input = {
  priceListId: '6',
  customerTypeId: '5',
  shippingFee: 10,
  items: [{ productId: '1', quantity: 2 }],
};

describe('Gerçek ürün fiyatlarıyla kampanya önizlemesi', () => {
  it('API ucu kampanya okuma yetkisiyle hesaplar; kayıt yapma yetkisi istemez', async () => {
    const { db } = fixture();
    const app = express().use(express.json());
    app.use((_req, res, next) => {
      res.locals.workspace = {
        business: { id: 3 },
        ownerId: 7,
        owner: false,
        permissions: [{ resource: 'campaigns', read: true, save: false, delete: false }],
      };
      next();
    });
    app.use(createCampaignRouter(db), errorHandler(createLogger('silent')));
    const res = await request(app).post('/hesapla').send(input);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subtotal: '96.00', total: '96.40' });
  });
  it('fiyatı veritabanından alır; ürün iskontosu, KDV ve kayıtlı kampanyayı birlikte hesaplar', async () => {
    const { db, tx } = fixture();
    expect(await quoteCampaignCart(db, 3, 7, input)).toMatchObject({
      subtotal: '96.00',
      discount: '9.60',
      total: '96.40',
    });
    expect(tx.stokKarti.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { kullaniciKimligi: 7, satisAcik: true, kimlik: { in: [1] } },
      }),
    );
    expect(tx.cariTipi.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, isletmeId: 3 } }),
    );
  });
  it('istemciden sahte fiyat veya aynı ürün için birden fazla satır kabul etmez', async () => {
    const { db } = fixture();
    await expect(
      quoteCampaignCart(db, 3, 7, {
        ...input,
        items: [{ productId: '1', quantity: 2, unitPrice: 1 }],
      }),
    ).rejects.toBeDefined();
    await expect(
      quoteCampaignCart(db, 3, 7, { ...input, items: [...input.items, ...input.items] }),
    ).rejects.toBeDefined();
  });
  it('başka işletmenin ürünü veya fiyat listesiyle hesaplama yapmaz', async () => {
    const { db, tx } = fixture();
    tx.stokKarti.findMany.mockResolvedValueOnce([]);
    await expect(quoteCampaignCart(db, 3, 7, input)).rejects.toMatchObject({ status: 404 });
    tx.stokSecenegi.findFirst.mockResolvedValueOnce(null as never);
    await expect(quoteCampaignCart(db, 3, 7, input)).rejects.toMatchObject({ status: 400 });
  });
  it('yetersiz stokta veya desteklenmeyen dövizde tutar uydurmaz', async () => {
    const { db, product } = fixture();
    await expect(
      quoteCampaignCart(db, 3, 7, { ...input, items: [{ productId: '1', quantity: 4 }] }),
    ).rejects.toMatchObject({ status: 409 });
    product.birimler[0]!.fiyatlar[0]!.paraBirimi = 'USD';
    await expect(quoteCampaignCart(db, 3, 7, input)).rejects.toMatchObject({ status: 400 });
  });
});
