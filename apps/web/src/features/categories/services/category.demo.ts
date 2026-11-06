import { categoryProductSeeds, categorySeeds } from '../../../mocks/category.mock';
import type { Category, CategoryDraft, CategoryProductRef } from '../types';

/**
 * Kategori verisine erişimin TEK kapısı. Şimdilik bellekte tutulan sahte veri (sayfa yenilenince
 * başa döner); gerçek API gelince yalnızca bu dosya değişir, bileşenler aynı kalır.
 */
type Row = Omit<Category, 'productCount' | 'childCount'>;
let rows: Row[] = categorySeeds.map((c) => ({ ...c }));
let products: CategoryProductRef[] = categoryProductSeeds.map((p) => ({ ...p }));
let seq = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const withCounts = (row: Row): Category => ({
  ...row,
  productCount: products.filter((p) => p.categoryId === row.id).length,
  childCount: rows.filter((r) => r.parentId === row.id).length,
});

/** Bir kategori ve tüm alt dalları. */
function branchOf(id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.parentId && ids.has(r.parentId) && !ids.has(r.id)) {
        ids.add(r.id);
        grew = true;
      }
    }
  }
  return ids;
}

export const demoCategoryService = {
  /** Yalnızca testler için: sahte veriyi başlangıç haline döndürür. */
  reset(): void {
    rows = categorySeeds.map((c) => ({ ...c }));
    products = categoryProductSeeds.map((p) => ({ ...p }));
  },

  /** Tüm kategoriler (düz liste); kardeşlerin sırası listedeki sırasıdır. */
  async list(): Promise<Category[]> {
    await wait(60);
    return rows.map(withCounts);
  },

  async create(draft: CategoryDraft): Promise<Category> {
    await wait(0);
    const row: Row = { id: `yeni-${++seq}`, ...draft };
    rows = [...rows, row];
    return withCounts(row);
  },

  /** Üst kategori değişirse kategori yeni üstünün sonuna taşınır; kendi dalına taşınamaz. */
  async update(id: string, draft: CategoryDraft): Promise<Category> {
    await wait(0);
    const current = rows.find((r) => r.id === id);
    if (!current) throw new Error('Kategori bulunamadı.');
    if (draft.parentId && branchOf(id).has(draft.parentId))
      throw new Error('Kategori kendi alt kategorisine taşınamaz.');
    const moved = current.parentId !== draft.parentId;
    const next: Row = { ...current, ...draft };
    rows = moved
      ? [...rows.filter((r) => r.id !== id), next]
      : rows.map((r) => (r.id === id ? next : r));
    return withCounts(next);
  },

  /** Kategoriyi (alt dallarıyla birlikte) başka bir üst kategorinin altına, sonuna taşır. */
  async move(id: string, parentId: string | null): Promise<void> {
    await wait(0);
    const current = rows.find((r) => r.id === id);
    if (!current) throw new Error('Kategori bulunamadı.');
    if (parentId && branchOf(id).has(parentId))
      throw new Error('Kategori kendi alt kategorisine taşınamaz.');
    if (current.parentId === parentId) return;
    rows = [...rows.filter((r) => r.id !== id), { ...current, parentId }];
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await wait(0);
    rows = rows.map((r) => (r.id === id ? { ...r, active } : r));
  },

  /** Kategoriyi ve tüm alt kategorilerini siler; bu dalın ürünlerinin kategorisi boş kalır. */
  async remove(id: string): Promise<void> {
    await wait(0);
    const gone = branchOf(id);
    rows = rows.filter((r) => !gone.has(r.id));
    products = products.map((p) =>
      p.categoryId && gone.has(p.categoryId) ? { ...p, categoryId: null } : p,
    );
  },

  /** Aynı üst kategorinin altındaki kardeşlerin yeni sırasını kalıcı yapar. */
  async reorder(parentId: string | null, ids: string[]): Promise<void> {
    await wait(0);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const queue = ids.map((id) => byId.get(id)).filter((r): r is Row => Boolean(r));
    let i = 0;
    // Kardeşlerin kapladığı yerlere yeni sırayla yerleştirilir; diğer kategoriler yerinde kalır.
    rows = rows.map((r) => (r.parentId === parentId ? (queue[i++] ?? r) : r));
  },

  async listProducts(): Promise<CategoryProductRef[]> {
    await wait(100);
    return products.map((p) => ({ ...p }));
  },

  /** Ürünleri bu kategoriden çıkarır (ürünün kategorisi boş kalır). */
  async unassignProducts(categoryId: string, productIds: string[]): Promise<void> {
    await wait(0);
    const picked = new Set(productIds);
    products = products.map((p) =>
      picked.has(p.id) && p.categoryId === categoryId ? { ...p, categoryId: null } : p,
    );
  },

  /** Seçili ürünleri kategoriye atar (başka kategorideyse taşınır). */
  async assignProducts(categoryId: string, productIds: string[]): Promise<void> {
    await wait(0);
    const picked = new Set(productIds);
    products = products.map((p) => (picked.has(p.id) ? { ...p, categoryId } : p));
  },
};
