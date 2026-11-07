import { describe, expect, it } from 'vitest';
import { sanitizeNumeric } from './numeric';

describe('sanitizeNumeric', () => {
  it('stok miktarında baştaki eksi işaretini korur; diğer sayı alanlarını değiştirmez', () => {
    expect(sanitizeNumeric('-5,25', 'signed-decimal')).toBe('-5,25');
    expect(sanitizeNumeric('-', 'signed-decimal')).toBe('-');
    expect(sanitizeNumeric('--5.2.3', 'signed-decimal')).toBe('-5.23');
  });
  it('tam sayıda yalnızca rakam bırakır', () => {
    expect(sanitizeNumeric('12 gün', 'integer')).toBe('12');
    expect(sanitizeNumeric('1,5', 'integer')).toBe('15');
    expect(sanitizeNumeric('abc', 'integer')).toBe('');
  });

  it('ondalıkta rakam ve en çok bir ayraç bırakır', () => {
    expect(sanitizeNumeric('12,5', 'decimal')).toBe('12,5');
    expect(sanitizeNumeric('1.2.3', 'decimal')).toBe('1.23');
    expect(sanitizeNumeric('₺ 45a,50', 'decimal')).toBe('45,50');
    expect(sanitizeNumeric('-5', 'decimal')).toBe('5');
  });
});
