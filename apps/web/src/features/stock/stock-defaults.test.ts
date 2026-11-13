import { expect, it } from 'vitest';
import { DEFAULT_STOCK_LOOKUPS } from '@gt/shared';
import { applyProductDefaults, resolveDefaultOption } from './stock-defaults';
import { createEmptyDraft } from './stock.rules';

it('eşleşen ürün varsayılanlarını yeni taslağa uygular, kategori ve markayı değiştirmez', () => {
  const draft = createEmptyDraft('fiyat');
  const result = applyProductDefaults(
    draft,
    {
      stockType: 'BASIT',
      unit: 'adet',
      purchaseCurrency: 'TRY',
      saleCurrency: 'USD',
      vatRate: '10',
      vatIncluded: true,
    },
    DEFAULT_STOCK_LOOKUPS,
  );

  expect(result.stockType).toBe('basit');
  expect(result.units.fiyat?.[0]?.unit).toBe('adet');
  expect(result.units.fiyat?.[0]?.purchase).toMatchObject({
    currency: 'TRY',
    vatRate: '10',
    vatIncluded: true,
  });
  expect(result.units.fiyat?.[0]?.sale).toMatchObject({
    currency: 'USD',
    vatRate: '10',
    vatIncluded: true,
  });
  expect(result.brand).toBe('');
});

it('tanınmayan/eski seçeneği taslağa yazmaz', () => {
  const draft = createEmptyDraft('fiyat');
  expect(resolveDefaultOption('9999', DEFAULT_STOCK_LOOKUPS.stockTypes)).toBeUndefined();
  const result = applyProductDefaults(
    draft,
    { stockType: 'silinmiş', unit: 'bozuk', vatRate: '999' },
    DEFAULT_STOCK_LOOKUPS,
  );
  expect(result.stockType).toBe('basit');
  expect(result.units.fiyat?.[0]?.unit).toBe('adet');
  expect(result.units.fiyat?.[0]?.purchase.vatRate).toBe('20');
});
