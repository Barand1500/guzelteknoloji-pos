import { describe, expect, it } from 'vitest';
import { stockDraftSchema } from '@gt/shared';
import { stockFixture } from './stock.fixture';

describe('Stok doğrulama', () => {
  it('virgülleri dönüştürür, baştaki barkod sıfırlarını ve boş tutarları korur', () => {
    const d = stockFixture();
    d.units.fiyat![0]!.barcodes[0]!.code = '00123456';
    const parsed = stockDraftSchema.parse(d);
    expect(parsed.lowerLimit).toBe('1.25');
    expect(parsed.stockQuantity).toBe('5.5');
    expect(parsed.units.fiyat![0]!.purchase.amount).toBe('100.125');
    expect(parsed.units.fiyat![0]!.sale.discount).toBe('');
    expect(parsed.units.fiyat![0]!.barcodes[0]!.code).toBe('00123456');
  });
  it.each(['-1', 'NaN', '1e6', '1,2,3', '1.1234567', '1000000000000'])(
    'geçersiz tutarı reddeder: %s',
    (value) => {
      const d = stockFixture();
      d.units.fiyat![0]!.sale.amount = value;
      expect(stockDraftSchema.safeParse(d).success).toBe(false);
    },
  );
  it('oranları, çarpanı ve ana/varsayılan birim kurallarını denetler', () => {
    const d = stockFixture();
    d.units.fiyat![0]!.sale.discount = '101';
    expect(stockDraftSchema.safeParse(d).success).toBe(false);
    d.units.fiyat![0]!.sale.discount = '0';
    d.units.fiyat![0]!.multiplier = '0';
    expect(stockDraftSchema.safeParse(d).success).toBe(false);
    d.units.fiyat![0]!.multiplier = '1';
    d.units.fiyat![0]!.isMain = false;
    expect(stockDraftSchema.safeParse(d).success).toBe(false);
  });
  it('limitler ve raf ömrü tutarlılığını kontrol eder', () => {
    const d = stockFixture();
    d.lowerLimit = '100';
    expect(stockDraftSchema.safeParse(d).success).toBe(false);
    d.inventoryTracking = 'omur';
    d.shelfLifeDays = '10';
    d.riskDays = '11';
    expect(stockDraftSchema.safeParse(d).success).toBe(false);
  });
});
