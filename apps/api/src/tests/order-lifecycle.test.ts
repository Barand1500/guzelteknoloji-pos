import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import type { PrismaClient } from '../lib/prisma';
import { OrderLifecycle } from '../modules/orders/order-lifecycle';

const D = Prisma.Decimal;
const ctx = { businessId: 3, ownerId: 7, actorId: 9 };
const requestId = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const row = {
    id: 10,
    businessId: 3,
    akisSurumu: 1,
    durum: 'pending',
    odendi: false,
    odemeTuru: 'bank_transfer',
    kdvDahilToplam: new D(100),
    musteriId: 2,
    siparisNo: 'S1',
    satirlar: [
      {
        id: 20,
        urunId: 1,
        adet: new D(2),
        satisTutari: new D(100),
        stokIslendi: true,
        ad: 'Kalem',
      },
    ],
    iadeler: [] as {
      durum: string;
      iadeTutari: Prisma.Decimal;
      satirlar: { siparisSatiriId: number; adet: Prisma.Decimal; tutar: Prisma.Decimal }[];
    }[],
    hareketler: [],
  };
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: 3 }]),
    isletme: { findUniqueOrThrow: vi.fn(async () => ({ ownerId: 7 })) },
    siparis: { findFirst: vi.fn(async () => row), update: vi.fn(async () => row) },
    siparisOdemeHareketi: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: 1 })),
    },
    musteriHareketi: { create: vi.fn(async () => ({})) },
    stokKarti: { updateMany: vi.fn(async () => ({ count: 1 })) },
    iadeTalebi: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (v) => ({ id: 30, ...v.data })),
      update: vi.fn(async (_args: unknown) => ({})),
    },
    iadeSatiri: { update: vi.fn(async () => ({})) },
  };
  const db = {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient;
  return { row, tx, service: new OrderLifecycle(db) };
}
describe('Sipariş tahsilat ve iade korumaları', () => {
  it('tahsilat tutarını siparişten alır ve cari alacağı aynı transaction içinde kaydeder', async () => {
    const { service, tx } = fixture();
    await service.collect(ctx, 10, {
      requestId,
      reference: 'Banka dekont 123',
      confirmed: true,
      expectedAmount: '100.00',
    });
    expect(tx.siparisOdemeHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tutar: '100.00', tur: 'collection', kullaniciId: 9 }),
      }),
    );
    expect(tx.musteriHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ musteriId: 2, alacak: '100.00' }),
      }),
    );
    expect(tx.siparis.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10, businessId: 3 } }),
    );
  });
  it('tahsil edilmiş veya başka işletmeye ait siparişte tekrar para kaydı oluşturmaz', async () => {
    const { service, tx, row } = fixture();
    row.odendi = true;
    await expect(
      service.collect(ctx, 10, {
        requestId,
        reference: 'Dekont',
        confirmed: true,
        expectedAmount: '100.00',
      }),
    ).rejects.toMatchObject({ status: 409 });
    tx.siparis.findFirst.mockResolvedValueOnce(null as never);
    await expect(
      service.collect(ctx, 10, {
        requestId,
        reference: 'Dekont',
        confirmed: true,
        expectedAmount: '100.00',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.siparisOdemeHareketi.create).not.toHaveBeenCalled();
  });
  it('satılandan fazla ürün iadesi ve geçmiş kayda finansal işlem kabul etmez', async () => {
    const { service, row, tx } = fixture();
    await expect(
      service.requestReturn(ctx, 10, {
        requestId,
        reason: 'İade',
        items: [{ lineId: '20', quantity: 3 }],
      }),
    ).rejects.toMatchObject({ status: 400 });
    row.akisSurumu = 0;
    await expect(
      service.collect(ctx, 10, {
        requestId,
        reference: 'Dekont',
        confirmed: true,
        expectedAmount: '100.00',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.iadeTalebi.create).not.toHaveBeenCalled();
  });
  it('ödenmiş siparişi iptal etmez; ödenmemiş siparişin iptalinde stoğu ve cari borcu geri alır', async () => {
    const { service, row, tx } = fixture();
    row.odendi = true;
    await expect(service.changeOrderStatus(3, 10, 'cancelled')).rejects.toMatchObject({
      status: 409,
    });
    row.odendi = false;
    await service.changeOrderStatus(3, 10, 'cancelled');
    expect(tx.stokKarti.updateMany).toHaveBeenCalledWith({
      where: { kimlik: 1, kullaniciKimligi: 7 },
      data: { stokMiktari: { increment: row.satirlar[0]!.adet } },
    });
    expect(tx.musteriHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ alacak: row.kdvDahilToplam }) }),
    );
  });
  it('iade ödeme ve stoğa ekleme kaydını bir kez yapar; tekrar tamamlamada ikinci hareket oluşturmaz', async () => {
    const { service, row, tx } = fixture();
    row.odendi = true;
    const returned = {
      id: 30,
      businessId: 3,
      siparisId: 10,
      durum: 'approved',
      iadeTutari: new D(50),
      tamamlamaHash: null as string | null,
      satirlar: [{ id: 40, siparisSatiriId: 20, adet: new D(1), siparisSatiri: row.satirlar[0] }],
    };
    tx.iadeTalebi.findFirst.mockImplementation(async () => returned as never);
    tx.iadeTalebi.update.mockImplementation(async (args: unknown) => {
      const { data } = args as { data: { durum: string; tamamlamaHash: string } };
      returned.durum = data.durum;
      returned.tamamlamaHash = data.tamamlamaHash;
      return {};
    });
    const input = {
      requestId,
      reference: 'Geri ödeme dekont 123',
      confirmed: true,
      expectedAmount: '50.00',
      restockLineIds: ['20'],
    };
    await service.completeReturn(ctx, 30, input);
    await service.completeReturn(ctx, 30, input);
    expect(tx.stokKarti.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.siparisOdemeHareketi.create).toHaveBeenCalledTimes(1);
    expect(tx.siparisOdemeHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tur: 'refund', tutar: new D(50), iadeId: 30 }),
      }),
    );
    expect(tx.musteriHareketi.create).toHaveBeenCalledTimes(2);
    await expect(
      service.completeReturn(ctx, 30, { ...input, restockLineIds: [] }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('tahsil edilmemiş siparişte geri ödeme uydurmaz, yalnızca borcu düşürür', async () => {
    const { service, row, tx } = fixture();
    tx.iadeTalebi.findFirst.mockResolvedValueOnce({
      id: 30,
      siparisId: 10,
      durum: 'approved',
      iadeTutari: new D(50),
      satirlar: [{ id: 40, siparisSatiriId: 20, adet: new D(1), siparisSatiri: row.satirlar[0] }],
    } as never);
    await service.completeReturn(ctx, 30, {
      requestId,
      reference: 'Teslim alındı',
      confirmed: true,
      expectedAmount: '0.00',
      restockLineIds: [],
    });
    expect(tx.siparisOdemeHareketi.create).not.toHaveBeenCalled();
    expect(tx.stokKarti.updateMany).not.toHaveBeenCalled();
    expect(tx.musteriHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ alacak: new D(50) }) }),
    );
  });
  it('tamamlanan kısmi iadeleri ve açık talepleri dikkate alır', async () => {
    const { service, row, tx } = fixture();
    row.iadeler.push({
      durum: 'completed',
      iadeTutari: new D(50),
      satirlar: [{ siparisSatiriId: 20, adet: new D(1), tutar: new D(50) }],
    });
    await expect(
      service.requestReturn(ctx, 10, {
        requestId,
        reason: 'İade',
        items: [{ lineId: '20', quantity: 2 }],
      }),
    ).rejects.toMatchObject({ status: 400 });
    await service.collect(ctx, 10, {
      requestId,
      reference: 'Dekont kalan ödeme',
      confirmed: true,
      expectedAmount: '50.00',
    });
    expect(tx.siparisOdemeHareketi.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tutar: '50.00' }) }),
    );
    row.iadeler[0]!.durum = 'approved';
    await expect(
      service.requestReturn(ctx, 10, {
        requestId,
        reason: 'İade',
        items: [{ lineId: '20', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('kullanıcının teyit ettiği tutar başka işlemle değiştiğinde farklı tutarı sessizce tahsil etmez', async () => {
    const { service, row, tx } = fixture();
    row.iadeler.push({ durum: 'completed', iadeTutari: new D(40), satirlar: [] });
    await expect(
      service.collect(ctx, 10, {
        requestId,
        reference: 'Dekont 100 TL',
        confirmed: true,
        expectedAmount: '100.00',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.siparisOdemeHareketi.create).not.toHaveBeenCalled();
    expect(tx.siparis.update).not.toHaveBeenCalled();
  });
});
