import type { Brand } from './types';

/**
 * Marka adlarını karşılaştırmak için sadeleştirir: büyük/küçük harf, Türkçe harfler, boşluk ve
 * noktalama yok sayılır ("Apple", "APPLE", "A.p.p.l.e " aynı çıkar).
 */
export function brandKey(name: string): string {
  return name
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Yazılan ada benzeyen (sadeleştirilince aynı) başka bir marka. */
export function findSimilarBrand(name: string, brands: Brand[], exceptId?: string): Brand | null {
  const key = brandKey(name);
  if (!key) return null;
  return brands.find((b) => b.id !== exceptId && brandKey(b.name) === key) ?? null;
}

const stripExt = (fileName: string) => fileName.replace(/\.[^.]+$/, '');
const ORDER_SUFFIX = /(?:_([0-9]+)| \(([0-9]+)\))$/;

/** Aynı markanın birden çok dosyası: `apple_2.png`, `apple (2).png` → sıra 2 (yoksa 1). */
export function fileOrder(fileName: string): number {
  const m = ORDER_SUFFIX.exec(stripExt(fileName));
  return m ? Number(m[1] ?? m[2]) : 1;
}

function matchStem(base: string, brands: Brand[]): Brand | null {
  const key = brandKey(base);
  if (!key) return null;
  const exact = brands.find((b) => brandKey(b.name) === key);
  if (exact) return exact;
  const trimmed = key.replace(/^logo/, '').replace(/logo$/, '');
  if (!trimmed || trimmed === key) return null;
  return brands.find((b) => brandKey(b.name) === trimmed) ?? null;
}

/** Dosya adından markayı bulur; "apple-logo", "Logo_Apple", "apple_2" gibi adlar da eşleşir. */
export function matchBrandByFile(fileName: string, brands: Brand[]): Brand | null {
  const base = stripExt(fileName);
  return matchStem(base, brands) ?? matchStem(base.replace(ORDER_SUFFIX, ''), brands);
}
