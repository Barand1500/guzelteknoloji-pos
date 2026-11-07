import { expect, it } from 'vitest';
import { reconcileVariants, type Variant } from './variant.rules';

const row = (valueIds: string[], code = 'A'): Variant => ({
  valueIds,
  code,
  barcode: '00123',
  price: '12,50',
  quantity: '7',
});
it('yeni boyut eklenince eski satırın kod, barkod, fiyat ve adedini bir kez korur', () => {
  const old = row(['1']);
  const next = reconcileVariants(
    [old],
    [
      ['1', '2'],
      ['1', '3'],
    ],
  );
  expect(next[0]).toEqual({ ...old, valueIds: ['1', '2'] });
  expect(next[1]).toEqual({
    valueIds: ['1', '3'],
    code: '',
    barcode: '',
    price: '0',
    quantity: '0',
  });
  expect(old.valueIds).toEqual(['1']);
  expect(
    reconcileVariants(next, [
      ['1', '2'],
      ['1', '3'],
    ]),
  ).toEqual(next);
});
it('tam eşleşen satırı başka eski satıra vermez; uyumsuz satır verisini sessizce silmez', () => {
  const a = row(['1']);
  const b = row(['1', '2'], 'B');
  const c = row(['9'], 'C');
  expect(
    reconcileVariants(
      [a, b, c],
      [
        ['1', '2'],
        ['1', '3'],
      ],
    ),
  ).toEqual([{ ...a, valueIds: ['1', '3'] }, b, c]);
});
