import { describe, expect, it } from 'vitest';
import { describeChange, newExclPrice, type BulkPriceChange } from './bulk-price';

const c = (over: Partial<BulkPriceChange>): BulkPriceChange => ({
  mod: 'yuzde_artir',
  value: 10,
  kdv: 'dahil',
  yuvarla: 'yok',
  ...over,
});

describe('Toplu fiyat önizleme hesabı (sunucuyla aynı kurallar)', () => {
  it('yüzde artırma KDV dayanağından bağımsızdır', () => {
    expect(newExclPrice(100, 20, c({ kdv: 'dahil' }))).toBeCloseTo(110, 6);
    expect(newExclPrice(100, 20, c({ kdv: 'haric' }))).toBeCloseTo(110, 6);
  });
  it('sabit tutar dayanağa göre değişir: dahil 120+12 → hariç 110; hariç 100+12 → 112', () => {
    expect(newExclPrice(100, 20, c({ mod: 'tutar_ekle', value: 12, kdv: 'dahil' }))).toBeCloseTo(
      110,
      6,
    );
    expect(newExclPrice(100, 20, c({ mod: 'tutar_ekle', value: 12, kdv: 'haric' }))).toBeCloseTo(
      112,
      6,
    );
  });
  it('yuvarlama adımları', () => {
    const r = (yuvarla: BulkPriceChange['yuvarla']) =>
      newExclPrice(100, 0, c({ value: 1.37, kdv: 'haric', yuvarla }));
    expect(r('yok')).toBeCloseTo(101.37, 6);
    expect(r('0.1')).toBeCloseTo(101.4, 6);
    expect(r('0.5')).toBeCloseTo(101.5, 6);
    expect(r('1')).toBeCloseTo(101, 6);
    expect(r('5')).toBeCloseTo(100, 6);
  });
  it('sıfırın altına düşen sonuç null döner', () => {
    expect(newExclPrice(10, 20, c({ mod: 'tutar_cikar', value: 500 }))).toBeNull();
  });
  it('özet metni', () => {
    expect(describeChange('yuzde_artir', '10')).toBe('%10 zam');
    expect(describeChange('tutar_cikar', '5')).toBe('5 ₺ indirim');
  });
});
