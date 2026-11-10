import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import { stockBulkSchema } from '../modules/stock/stock.api';
import { bulkPriceEntered, bulkPriceExcl } from '../modules/stock/stock.repository';

const D = (v: string) => new Prisma.Decimal(v);
const row = (over: Partial<Parameters<typeof bulkPriceEntered>[0]> = {}) => ({
  girilenFiyat: D('100'),
  kdvOrani: D('20'),
  iskontoOrani: null,
  kdvDahilGirildi: false,
  ...over,
});
const change = (
  mod: Parameters<typeof bulkPriceExcl>[2]['mod'],
  value: string,
  kdv: 'dahil' | 'haric' = 'dahil',
  yuvarla: Parameters<typeof bulkPriceExcl>[2]['yuvarla'] = 'yok',
) => ({ mod, value: D(value), kdv, yuvarla });

describe('Toplu fiyat hesabı', () => {
  it('yüzde artırma KDV dayanağından bağımsız aynı sonucu verir', () => {
    expect(bulkPriceEntered(row(), change('yuzde_artir', '10', 'dahil'))?.toString()).toBe('110');
    expect(bulkPriceEntered(row(), change('yuzde_artir', '10', 'haric'))?.toString()).toBe('110');
  });
  it('sabit tutar KDV DAHİL fiyata eklenir: 120 + 12 = 132 → girilen (hariç) 110', () => {
    expect(bulkPriceEntered(row(), change('tutar_ekle', '12', 'dahil'))?.toString()).toBe('110');
  });
  it('sabit tutar KDV HARİÇ fiyata eklenir: 100 + 12 = 112', () => {
    expect(bulkPriceEntered(row(), change('tutar_ekle', '12', 'haric'))?.toString()).toBe('112');
  });
  it('KDV dahil girilmiş satırda dahil dayanak doğrudan girilen tutardır', () => {
    const r = row({ kdvDahilGirildi: true });
    expect(bulkPriceEntered(r, change('tutar_cikar', '10', 'dahil'))?.toString()).toBe('90');
  });
  it('iskonto korunur: %50 iskontolu, KDV dahil girilen 100 (gösterilen 50); +10 dahil → gösterilen 60 → girilen 120', () => {
    const r = row({ kdvDahilGirildi: true, iskontoOrani: D('50') });
    expect(bulkPriceEntered(r, change('tutar_ekle', '10', 'dahil'))?.toString()).toBe('120');
  });
  it('yuvarlama seçilen adıma yapılır (0,10 · 0,50 · 1 · 5)', () => {
    const e = (round: Parameters<typeof change>[3]) =>
      bulkPriceExcl(D('100'), D('0'), change('yuzde_artir', '1.37', 'haric', round)).toString();
    expect(e('yok')).toBe('101.37');
    expect(e('0.1')).toBe('101.4');
    expect(e('0.5')).toBe('101.5');
    expect(e('1')).toBe('101');
    expect(e('5')).toBe('100');
  });
  it('sıfırın altına düşen sonuç reddedilir; girilmemiş fiyat atlanır', () => {
    expect(() => bulkPriceEntered(row(), change('tutar_cikar', '500'))).toThrow(/sıfırın altına/);
    expect(bulkPriceEntered(row({ girilenFiyat: null }), change('yuzde_artir', '10'))).toBeNull();
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
      kdv: 'haric',
      yuvarla: '0.5',
      varyantlar: true,
    });
    expect(price.islem === 'fiyat_guncelle' && price.deger).toBe('12.5');
    expect(price.islem === 'fiyat_guncelle' && price.kdv).toBe('haric');
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
