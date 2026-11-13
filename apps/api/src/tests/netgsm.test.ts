import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../modules/workspace/netgsm';

describe('Netgsm numara biçimi', () => {
  it('boşluk, tire, baştaki 0 ve +90 temizlenir', () => {
    expect(normalizePhone('0532 123 45 67')).toBe('5321234567');
    expect(normalizePhone('+90 (532) 123-45-67')).toBe('5321234567');
    expect(normalizePhone('905321234567')).toBe('5321234567');
    expect(normalizePhone('5321234567')).toBe('5321234567');
  });

  it('geçersiz numarayı reddeder', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('0212 123 45 67')).toBeNull();
    expect(normalizePhone('532 123 45 6')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});
