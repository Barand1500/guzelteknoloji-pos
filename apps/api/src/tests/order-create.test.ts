import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import type { PrismaClient } from '../lib/prisma';
import { OrderLifecycle } from '../modules/orders/order-lifecycle';

const D = Prisma.Decimal;
const ctx = { businessId: 3, ownerId: 7, actorId: 9 };
const input = {
  requestId: '11111111-1111-4111-8111-111111111111',
  customerId: '2',
  priceListId: '6',
  paymentMethodId: '4',
  paymentKind: 'bank_transfer',
  address: 'Teslimat adresi',
  shippingFee: 12,
  shippingVatRate: 20,
  expectedTotal: '98.40',
  items: [{ productId: '1', quantity: 2 }],
};
function fixture() {
  let saved: { id: number; siparisNo: string; istekHash: string } | null = null;
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: 3 }]),
    siparis: {
      findFirst: vi.fn(async () => saved),
      create: vi.fn(async ({ data }: { data: { siparisNo: string; istekHash: string } }) => {
        saved = { id: 10, siparisNo: data.siparisNo, istekHash: data.istekHash };
        return saved;
      }),
    },
    musteri: { findFirst: vi.fn(async () => ({ id: 2, ad: 'Ali', cariTipi: 'Bayi' })) },
    odemeSekli: { findFirst: vi.fn(async () => ({ ad: 'Havale', kargoYok: false })) },
    cariTipi: { findFirst: vi.fn(async () => ({ id: 5, ad: 'Bayi' })) },
    stokSecenegi: { findFirst: vi.fn(async () => ({ kimlik: 6, secenekAdi: 'FİYAT' })) },
    fiyatListesiAyari: { findFirst: vi.fn(async () => null) },
    stokKarti: {
      findMany: vi.fn(async () => [
        {
          kimlik: 1,
          stokAdi: 'Kalem',
          stokKodu: 'K1',
          envanterTakibi: 'normal',
          stokMiktari: new D(3),
          markaKimligi: null,
          varyantlar: [],
          vergiler: [],
          kategoriler: [],
          birimler: [
            {
              fiyatlar: [
                {
                  girilenFiyat: new D(50),
                  paraBirimi: 'TRY',
                  iskontoOrani: new D(20),
                  kdvOrani: new D(20),
                  kdvDahilGirildi: false,
                },
              ],
            },
          ],
        },
      ]),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    kampanya: {
      findMany: vi.fn(async () => [
        {
          id: 1,
          kind: 'SEPET_INDIRIMI',
          durum: true,
          customerTypes: [],
          priceLists: [],
          minTotal: new D(0),
          discountKind: 'YUZDE',
          discountValue: new D(10),
          rules: [],
        },
      ]),
    },
    musteriHareketi: { create: vi.fn(async () => ({})) },
  };
  const db = {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient;
  return { service: new OrderLifecycle(db), tx };
}
describe('Gerçek fiyatla atomik sipariş oluşturma', () => {
  it('ürün iskontosu, kampanya ve kargoyu kaydeder; tekrar istekte aynı siparişi döndürür', async () => {
    const { service, tx } = fixture();
    const first = await service.create(ctx, input);
    expect(await service.create(ctx, input)).toEqual(first);
    expect(tx.stokKarti.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.stokKarti.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          kimlik: 1,
          kullaniciKimligi: 7,
          stokMiktari: { gte: new D(2) },
        }),
        data: { stokMiktari: { decrement: new D(2) } },
      }),
    );
    expect(tx.siparis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toplam: new D(82),
          kdvDahilToplam: '98.40',
          akisSurumu: 1,
          satirlar: {
            create: [expect.objectContaining({ satisTutari: new D('86.40'), netTutar: new D(72) })],
          },
        }),
      }),
    );
    expect(tx.musteriHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ musteriId: 2, borc: '98.40' }) }),
    );
    await expect(service.create(ctx, { ...input, address: 'Başka adres' })).rejects.toMatchObject({
      status: 409,
    });
  });
  it('eski önizleme tutarıyla veya son stok kontrolü başarısızken sipariş oluşturmaz', async () => {
    const { service, tx } = fixture();
    await expect(service.create(ctx, { ...input, expectedTotal: '1.00' })).rejects.toMatchObject({
      status: 409,
    });
    expect(tx.stokKarti.updateMany).not.toHaveBeenCalled();
    tx.stokKarti.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.create(ctx, input)).rejects.toMatchObject({ status: 409 });
    expect(tx.siparis.create).not.toHaveBeenCalled();
    expect(tx.musteriHareketi.create).not.toHaveBeenCalled();
  });
  it('müşteri işletmeye ait değilse ve istemci fiyat göndermeye çalışırsa reddeder', async () => {
    const { service, tx } = fixture();
    tx.musteri.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.create(ctx, input)).rejects.toMatchObject({ status: 400 });
    await expect(
      service.create(ctx, { ...input, items: [{ productId: '1', quantity: 2, unitPrice: 1 }] }),
    ).rejects.toBeDefined();
    expect(tx.siparis.create).not.toHaveBeenCalled();
  });
});
