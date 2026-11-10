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

/** Dosya adından (uzantısız) markayı bulur; "apple-logo", "Logo_Apple" gibi adlar da eşleşir. */
export function matchBrandByFile(fileName: string, brands: Brand[]): Brand | null {
  const base = fileName.replace(/\.[^.]+$/, '');
  const key = brandKey(base);
  if (!key) return null;
  const exact = brands.find((b) => brandKey(b.name) === key);
  if (exact) return exact;
  const trimmed = key.replace(/^logo/, '').replace(/logo$/, '');
  if (!trimmed || trimmed === key) return null;
  return brands.find((b) => brandKey(b.name) === trimmed) ?? null;
}
