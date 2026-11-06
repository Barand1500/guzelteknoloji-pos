import { describe, expect, it } from 'vitest';
import { createUnitRow, rebaseUnits, syncUnits } from './stock.rules';

describe('Birim dönüşümü', () => {
  it('ana birim değişince çarpan oranlarını korur', () => {
    const first = createUnitRow(true);
    const second = { ...createUnitRow(false, 'koli'), multiplier: '12' };
    const result = rebaseUnits([first, second], second.id)!;
    expect(result[0]?.multiplier).toBe('0.083333');
    expect(result[1]?.multiplier).toBe('1');
    expect(result[1]?.isMain).toBe(true);
  });
  it('boş veya gösterilemeyecek çarpanla dönüşüm yapmaz', () => {
    expect(rebaseUnits([createUnitRow(true), createUnitRow(false)], 'missing')).toBeNull();
  });
});

describe('Ortak birim/barkod (syncUnits)', () => {
  const priced = (amount: string) => {
    const row = createUnitRow(true);
    row.sale = { ...row.sale, amount };
    return row;
  };

  it('birim yapısı tüm listelere kopyalanır, her listenin kendi fiyatı korunur', () => {
    const fiyat = { ...priced('10'), barcodes: [{ id: 'b1', type: 'EAN13', code: '869' }] };
    const toptan = { ...priced('8'), id: fiyat.id };
    const result = syncUnits({ fiyat: [{ ...fiyat, weight: '2' }], toptan: [toptan] }, 'fiyat');
    expect(result.toptan?.[0]?.weight).toBe('2');
    expect(result.toptan?.[0]?.barcodes).toEqual(fiyat.barcodes);
    expect(result.toptan?.[0]?.sale.amount).toBe('8'); // toptan fiyatı değişmedi
    expect(result.fiyat?.[0]?.sale.amount).toBe('10');
  });

  it('yeni birim diğer listelere boş fiyatla eklenir; silinen birim her yerden gider', () => {
    const a = priced('10');
    const b = { ...createUnitRow(false, 'koli'), multiplier: '12' };
    const withTwo = syncUnits({ fiyat: [a, b], toptan: [{ ...priced('8'), id: a.id }] }, 'fiyat');
    expect(withTwo.toptan).toHaveLength(2);
    expect(withTwo.toptan?.[1]?.id).toBe(b.id);
    expect(withTwo.toptan?.[1]?.sale.amount).toBe('');

    const removed = syncUnits({ ...withTwo, fiyat: [a] }, 'fiyat');
    expect(removed.toptan).toHaveLength(1);
    expect(removed.toptan?.[0]?.sale.amount).toBe('8');
  });

  it('sunucudan gelen kart sıraya göre eşlenir ve kimlikler ortaklaşır', () => {
    const fiyat = [priced('10')];
    const toptan = [priced('8')]; // farklı kimlik
    expect(fiyat[0]?.id).not.toBe(toptan[0]?.id);
    const result = syncUnits({ fiyat, toptan }, 'fiyat', 'index');
    expect(result.toptan?.[0]?.id).toBe(fiyat[0]?.id);
    expect(result.toptan?.[0]?.sale.amount).toBe('8');
  });

  it('kaynak liste yoksa dokunmaz', () => {
    const units = { fiyat: [priced('1')] };
    expect(syncUnits(units, 'yok')).toBe(units);
  });
});
