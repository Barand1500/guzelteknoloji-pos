import { describe, expect, it } from 'vitest';
import { createUnitRow, rebaseUnits } from './stock.rules';

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
