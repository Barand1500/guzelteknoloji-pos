import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import { stockBulkSchema } from '../modules/stock/stock.api';
import { bulkPriceEntered } from '../modules/stock/stock.repository';

const D = (v: string) => new Prisma.Decimal(v);
const row = (over: Partial<Parameters<typeof bulkPriceEntered>[0]> = {}) => ({
  girilenFiyat: D('100'),
  kdvOrani: D('20'),
  iskontoOrani: null,
  kdvDahilGirildi: false,
  ...over,
});

describe('Toplu fiyat hesabı (KDV dahil gösterilen fiyat üzerinden)', () => {
  it('yüzde artırma girilen tutarı da aynı oranda artırır (KDV hariç girilmiş)', () => {
    expect(bulkPriceEntered(row(), 'yuzde_artir', D('10'), 'yok')?.toString()).toBe('110');
  });
  it('tutar ekleme KDV dahil fiyata eklenir: 120 + 12 = 132 → girilen 110', () => {
    expect(bulkPriceEntered(row(), 'tutar_ekle', D('12'), 'yok')?.toString()).toBe('110');
  });
  it('yeni fiyat KDV dahil verilir: 240 → girilen 200 (KDV %20)', () => {
    expect(bulkPriceEntered(row(), 'ayarla', D('240'), 'yok')?.toString()).toBe('200');
  });
  it('KDV dahil girilmişse girilen tutar doğrudan hedeftir', () => {
    expect(
      bulkPriceEntered(row({ kdvDahilGirildi: true }), 'ayarla', D('150'), 'yok')?.toString(),
    ).toBe('150');
  });
  it('iskonto hesaba katılır: %50 iskontolu 100 TL (KDV dahil) → 50 gösterilir, 100 hedef → girilen 200', () => {
    const r = row({ kdvDahilGirildi: true, iskontoOrani: D('50') });
    expect(bulkPriceEntered(r, 'ayarla', D('100'), 'yok')?.toString()).toBe('200');
  });
  it('tam sayıya yuvarlar', () => {
    expect(bulkPriceEntered(row(), 'yuzde_artir', D('1.5'), 'tam')?.toString()).toBe('101.666667');
  });
  it('sıfırın altına düşen sonuç reddedilir; girilmemiş fiyat atlanır', () => {
    expect(() => bulkPriceEntered(row(), 'tutar_cikar', D('500'), 'yok')).toThrow(/sıfırın altına/);
    expect(bulkPriceEntered(row({ girilenFiyat: null }), 'yuzde_artir', D('10'), 'yok')).toBeNull();
  });
});

describe('Toplu işlem şeması', () => {
  it('yeni işlemleri kabul eder, eksik parametreyi reddeder', () => {
    expect(stockBulkSchema.safeParse({ ids: [1], islem: 'firsat_ekle', firsatId: 2 }).success).toBe(
      true,
    );
    expect(stockBulkSchema.safeParse({ ids: [1], islem: 'firsat_ekle' }).success).toBe(false);
    expect(
      stockBulkSchema.safeParse({ ids: [1, 2], islem: 'marka_ata', markaId: null }).success,
    ).toBe(true);
    expect(
      stockBulkSchema.safeParse({ ids: [1], islem: 'kategori_kaldir', kategoriId: 3 }).success,
    ).toBe(true);
    const price = stockBulkSchema.parse({
      ids: [1],
      islem: 'fiyat_guncelle',
      listeId: 4,
      yon: 'satis',
      mod: 'yuzde_artir',
      deger: '12,5',
    });
    expect(price.islem === 'fiyat_guncelle' && price.deger).toBe('12.5');
    expect(
      stockBulkSchema.safeParse({
        ids: [1],
        islem: 'fiyat_guncelle',
        listeId: 4,
        yon: 'satis',
        mod: 'ayarla',
        deger: 'abc',
      }).success,
    ).toBe(false);
    expect(stockBulkSchema.safeParse({ ids: [1, 1], islem: 'sil' }).success).toBe(false);
  });
});
