import { brandSeeds, productSeeds } from '../../../mocks/brand.mock';
import type { Brand, BrandDraft, ProductRef } from '../types';

/**
 * Marka verisine erişimin TEK kapısı. Şimdilik bellekte tutulan sahte veri (sayfa yenilenince
 * başa döner); gerçek API gelince yalnızca bu dosya değişir, bileşenler aynı kalır.
 */
type Row = Omit<Brand, 'productCount'>;
let rows: Row[] = brandSeeds.map((b) => ({ ...b }));
let products: ProductRef[] = productSeeds.map((p) => ({ ...p }));
let seq = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const withCount = (row: Row): Brand => ({
  ...row,
  productCount: products.filter((p) => p.brandId === row.id).length,
});

export const demoBrandService = {
  /** Yalnızca testler için: sahte veriyi başlangıç haline döndürür. */
  reset(): void {
    rows = brandSeeds.map((b) => ({ ...b }));
    products = productSeeds.map((p) => ({ ...p }));
  },

  /** Mağazadaki gösterim sırasıyla markalar. */
  async list(): Promise<Brand[]> {
    await wait(60);
    return rows.map(withCount);
  },

  async create(draft: BrandDraft): Promise<Brand> {
    await wait(0);
    const row: Row = { id: `yeni-${++seq}`, ...draft };
    rows = [...rows, row];
    return withCount(row);
  },

  async update(id: string, draft: BrandDraft): Promise<Brand> {
    await wait(0);
    rows = rows.map((r) => (r.id === id ? { ...r, ...draft } : r));
    return withCount(rows.find((r) => r.id === id) as Row);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await wait(0);
    rows = rows.map((r) => (r.id === id ? { ...r, active } : r));
  },

  /** Markayı siler; markayı kullanan ürünlerin markası boş kalır. */
  async remove(id: string): Promise<void> {
    await wait(0);
    rows = rows.filter((r) => r.id !== id);
    products = products.map((p) => (p.brandId === id ? { ...p, brandId: null } : p));
  },

  /** Markayı hedefin içine birleştirir: ürünleri hedefe geçer, kaynak silinir. */
  async merge(id: string, targetId: string): Promise<void> {
    await wait(0);
    if (id === targetId) throw new Error('Bir marka kendisiyle birleştirilemez.');
    if (!rows.some((r) => r.id === id) || !rows.some((r) => r.id === targetId))
      throw new Error('Marka bulunamadı.');
    rows = rows.filter((r) => r.id !== id);
    products = products.map((p) => (p.brandId === id ? { ...p, brandId: targetId } : p));
  },

  /** Verilen kimlik sırasını kalıcı yapar. */
  async reorder(ids: string[]): Promise<void> {
    await wait(0);
    const byId = new Map(rows.map((r) => [r.id, r]));
    rows = ids.map((id) => byId.get(id)).filter((r): r is Row => Boolean(r));
  },

  async listProducts(): Promise<ProductRef[]> {
    await wait(100);
    return products.map((p) => ({ ...p }));
  },

  /** Ürünleri bu markadan çıkarır (ürünün markası boş kalır). */
  async unassignProducts(brandId: string, productIds: string[]): Promise<void> {
    await wait(0);
    const picked = new Set(productIds);
    products = products.map((p) =>
      picked.has(p.id) && p.brandId === brandId ? { ...p, brandId: null } : p,
    );
  },

  /** Seçili ürünleri markaya atar (başka markadaysa taşınır). */
  async assignProducts(brandId: string, productIds: string[]): Promise<void> {
    await wait(0);
    const picked = new Set(productIds);
    products = products.map((p) => (picked.has(p.id) ? { ...p, brandId } : p));
  },
};
