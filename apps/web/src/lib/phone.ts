/**
 * Türk telefon numarası biçimi: rakam dışı atılır, baştaki +90/90/0 düzenlenir,
 * `0XXX XXX XX XX` olarak yazılır. Alan içinde yazarken kullanılır (harf girilemez).
 */
export function formatTrPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2);
  if (digits && !digits.startsWith('0')) digits = `0${digits}`;
  digits = digits.slice(0, 11);
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)]
    .filter(Boolean)
    .join(' ');
}
