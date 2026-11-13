import { expect, it, vi } from 'vitest';
import { widgetDraftSchema } from '@gt/shared';
import { SiteRepository } from '../modules/site/site.repository';
import type { PrismaClient } from '../lib/prisma';

const base = {
  name: 'Ürünler',
  type: 'urun-raflari',
  title: '',
  visible: true,
  order: 0,
  imageId: null,
};
it('geçersiz düzen ve veri kimliklerini kabul etmez', () => {
  expect(widgetDraftSchema.safeParse({ ...base, settings: { duzen: 'bilinmeyen' } }).success).toBe(
    false,
  );
  expect(
    widgetDraftSchema.safeParse({
      ...base,
      settings: { veriTuru: 'urun', veriKimlikleri: '1,abc' },
    }).success,
  ).toBe(false);
});
it('başka işletmenin ürünü widgeta bağlanamaz', async () => {
  const create = vi.fn();
  const db = {
    isletme: { findUnique: vi.fn().mockResolvedValue({ ownerId: 7 }) },
    stokKarti: { count: vi.fn().mockResolvedValue(0) },
    siteWidgeti: { create },
  };
  await expect(
    new SiteRepository(db as unknown as PrismaClient).saveWidget(3, {
      ...base,
      type: 'urun-raflari',
      settings: { duzen: 'urun-izgara', veriTuru: 'urun', veriKimlikleri: '99' },
    }),
  ).rejects.toThrow('Seçilen ürün veya kategori bu işletmede bulunamadı.');
  expect(db.stokKarti.count).toHaveBeenCalledWith({
    where: { kullaniciKimligi: 7, kimlik: { in: [99] } },
  });
  expect(create).not.toHaveBeenCalled();
});
