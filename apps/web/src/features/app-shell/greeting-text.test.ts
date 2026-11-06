import { describe, expect, it } from 'vitest';
import { firstNameOf, greetingFor } from './greeting-text';

describe('greetingFor', () => {
  it.each([
    [5, 'Günaydın'],
    [11, 'Günaydın'],
    [12, 'Tünaydın'],
    [17, 'Tünaydın'],
    [18, 'İyi Akşamlar'],
    [21, 'İyi Akşamlar'],
    [22, 'İyi Geceler'],
    [0, 'İyi Geceler'],
    [4, 'İyi Geceler'],
  ])('saat %i → %s', (hour, expected) => {
    expect(greetingFor(hour)).toBe(expected);
  });

  it('günün her saati bir selamlama verir', () => {
    for (let hour = 0; hour < 24; hour++) expect(greetingFor(hour)).not.toBe('');
  });
});

describe('firstNameOf', () => {
  it('görünen adın ilk sözcüğünü alır', () => {
    expect(firstNameOf({ displayName: 'Baran Demir' })).toBe('Baran');
    expect(firstNameOf({ displayName: '  Ayşe   Nur ' })).toBe('Ayşe');
  });

  it('görünen ad yoksa e-postanın harflerinden ad üretir (Türkçe büyük/küçük harfle)', () => {
    expect(firstNameOf({ displayName: null, email: 'mrbar@gmail.com' })).toBe('Mrbar');
    expect(firstNameOf({ displayName: '', email: 'ışık@example.com' })).toBe('Işık');
  });

  it('rakamla başlayan ya da çok kısa e-posta adıyla hitap edilmez', () => {
    expect(firstNameOf({ email: '21baran51@gmail.com' })).toBeNull();
    expect(firstNameOf({ email: 'ab@x.com' })).toBeNull();
    expect(firstNameOf({})).toBeNull();
    expect(firstNameOf(null)).toBeNull();
  });
});
