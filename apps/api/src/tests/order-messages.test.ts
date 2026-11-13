import { expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client';
import { Prisma as P } from '../generated/prisma/client';
import { enqueueOrderMessages } from '../modules/orders/order-messages';
import { processMessageQueue } from '../modules/orders/message-worker';
import type { PrismaClient } from '../lib/prisma';

function fixture(event: string | undefined = 'order.created') {
  const template = {
    id: '1',
    name: 'Sipariş',
    text: 'Merhaba #adsoyad#, #siparisno#',
    subject: 'Sipariş #siparisno#',
    event,
  };
  const settings = [
    { section: 'smtp', values: { enabled: 'true' } },
    { section: 'site_eposta_sablonlari', values: { sablonlar: JSON.stringify([template]) } },
  ];
  const tx = {
    isletmeAyari: { findMany: vi.fn().mockResolvedValue(settings) },
    siparis: {
      findFirst: vi
        .fn()
        .mockResolvedValue({
          id: 4,
          businessId: 3,
          musteriAdi: 'Ayşe',
          siparisNo: 'S4',
          kdvDahilToplam: new P.Decimal(100),
          tarih: new Date(),
          musteri: { businessId: 3, durum: true, eposta: 'ayse@example.com' },
          business: { name: 'Mağaza' },
        }),
    },
    siteSablonDegiskeni: { findMany: vi.fn().mockResolvedValue([]) },
    sablonGonderimi: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  return { tx, settings };
}
const event = {
  businessId: 3,
  orderId: 4,
  key: 'order:4:created',
  event: 'order.created' as const,
};
it('olaya bağlanmış şablonu aynı transaction içinde alıcı ve tekil anahtarla kuyruğa yazar', async () => {
  const { tx } = fixture();
  await enqueueOrderMessages(tx as unknown as Prisma.TransactionClient, event);
  expect(tx.siparis.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 4, businessId: 3 } }),
  );
  expect(tx.sablonGonderimi.createMany).toHaveBeenCalledWith({
    skipDuplicates: true,
    data: [
      expect.objectContaining({
        isletmeId: 3,
        olayAnahtari: event.key,
        alici: 'ayse@example.com',
        icerik: 'Merhaba Ayşe, S4',
        durum: 'pending',
      }),
    ],
  });
});
it('eski olaysız şablon ve kapalı bağlantı otomatik gönderim oluşturmaz', async () => {
  const { tx, settings } = fixture(undefined);
  // fixture varsayılan parametresini aşmak için eski kaydı doğrudan yaz.
  settings[1]!.values = {
    sablonlar: JSON.stringify([{ name: 'Sipariş', text: 'Merhaba', subject: 'Sipariş' }]),
  } as (typeof settings)[1]['values'];
  await enqueueOrderMessages(tx as unknown as Prisma.TransactionClient, event);
  expect(tx.sablonGonderimi.createMany).not.toHaveBeenCalled();
  settings[0]!.values.enabled = 'false';
  await enqueueOrderMessages(tx as unknown as Prisma.TransactionClient, event);
  expect(tx.siparis.findFirst).not.toHaveBeenCalled();
});
it('belirsiz gönderimi tekrar denemez ve atomik claim başarısızsa sağlayıcıya gitmez', async () => {
  const row = { id: 1, isletmeId: 3, durum: 'pending' };
  const update = vi.fn().mockResolvedValue({});
  const db = {
    sablonGonderimi: {
      updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([row]),
      update,
    },
  };
  const send = vi.fn().mockRejectedValue(new Error('timeout'));
  await processMessageQueue(db as unknown as PrismaClient, send);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ durum: 'uncertain' }) }),
  );
  db.sablonGonderimi.updateMany.mockResolvedValue({ count: 0 });
  await processMessageQueue(db as unknown as PrismaClient, send);
  expect(send).toHaveBeenCalledTimes(1);
});
