export type NumericKind = 'decimal' | 'integer';

/**
 * Sayı alanlarına yalnızca rakam yazılmasını sağlar.
 * - integer: sadece rakam (ör. gün sayısı)
 * - decimal: rakam + en fazla bir ondalık ayracı (virgül ya da nokta; ör. 12,5)
 */
export function sanitizeNumeric(value: string, kind: NumericKind): string {
  if (kind === 'integer') return value.replace(/\D/g, '');
  let out = '';
  let hasSeparator = false;
  for (const ch of value) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if ((ch === ',' || ch === '.') && !hasSeparator) {
      out += ch;
      hasSeparator = true;
    }
  }
  return out;
}
