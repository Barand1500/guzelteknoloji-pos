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
