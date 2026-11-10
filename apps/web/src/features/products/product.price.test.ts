import { describe, it, expect } from 'vitest';
import { productItemSeeds } from '../../mocks/product.mock';
import { grossOf, netOf, currencyOf, type ProductItem } from './types';

describe('fiyat listesi ve yönü', () => {
  const product: ProductItem = {
    ...productItemSeeds[0]!,
    listPrices: [
      {
        id: 'retail',
        code: 'retail',
        name: 'Perakende',
        net: 100,
        vatRate: 20,
        currency: 'TRY',
        purchase: { net: 60, vatRate: 10, currency: 'TRY' },
      },
      {
        id: 'custom',
        code: 'custom',
        name: 'Özel Liste',
        net: 200,
        vatRate: 20,
        currency: 'USD',
        purchase: { net: 80, vatRate: 20, currency: 'EUR' },
      },
      {
        id: 'empty',
        code: 'empty',
        name: 'Boş Liste',
        net: null,
        vatRate: 20,
        currency: 'TRY',
        purchase: { net: null, vatRate: 20, currency: 'TRY' },
      },
    ],
  };
  it('her listenin kendi alış ve satış tutarı, para birimi ve KDV oranını kullanır', () => {
    expect(grossOf(product, 'retail')).toBe(120);
    expect(grossOf(product, 'cost:retail')).toBe(66);
    expect(netOf(product, 'cost:custom')).toBe(80);
    expect(grossOf(product, 'cost:custom')).toBe(96);
    expect(currencyOf(product, 'cost:custom')).toBe('€');
    expect(grossOf(product, 'custom')).toBe(240);
    expect(grossOf(product, 'cost:empty')).toBeNull();
  });
});
