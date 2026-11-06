import { dealProductSeeds, dealSeeds } from '../../../mocks/deal.mock';
import type { Deal, DealDraft, DealProductRef } from '../types';

/**
 * Fırsat verisine erişimin TEK kapısı. Şimdilik bellekte tutulan sahte veri (sayfa yenilenince
 * başa döner); gerçek API gelince yalnızca bu dosya değişir, bileşenler aynı kalır.
 */
type Row = Omit<Deal, 'productCount'>;
let rows: Row[] = dealSeeds.map((d) => ({ ...d }));
let products: DealProductRef[] = dealProductSeeds.map((p) => ({ ...p, dealIds: [...p.dealIds] }));
let seq = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const withCount = (row: Row): Deal => ({
  ...row,
  productCount: products.filter((p) => p.dealIds.includes(row.id)).length,
});

export const demoDealService = {
  /** Yalnızca testler için: sahte veriyi başlangıç haline döndürür. */
  reset(): void {
    rows = dealSeeds.map((d) => ({ ...d }));
    products = dealProductSeeds.map((p) => ({ ...p, dealIds: [...p.dealIds] }));
  },

  /** Mağazadaki gösterim sırasıyla fırsatlar. */
  async list(): Promise<Deal[]> {
    await wait(60);
    return rows.map(withCount);
  },

  async create(draft: DealDraft): Promise<Deal> {
    await wait(0);
    const row: Row = { id: `yeni-${++seq}`, ...draft };
    rows = [...rows, row];
    return withCount(row);
  },

  async update(id: string, draft: DealDraft): Promise<Deal> {
    await wait(0);
    rows = rows.map((r) => (r.id === id ? { ...r, ...draft } : r));
    return withCount(rows.find((r) => r.id === id) as Row);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await wait(0);
    rows = rows.map((r) => (r.id === id ? { ...r, active } : r));
  },

  /** Fırsatı siler; ürünlerden de kalkar (ürünler silinmez). */
  async remove(id: string): Promise<void> {
    await wait(0);
    rows = rows.filter((r) => r.id !== id);
    products = products.map((p) => ({ ...p, dealIds: p.dealIds.filter((d) => d !== id) }));
  },

  /** Verilen kimlik sırasını kalıcı yapar. */
  async reorder(ids: string[]): Promise<void> {
    await wait(0);
    const byId = new Map(rows.map((r) => [r.id, r]));
    rows = ids.map((id) => byId.get(id)).filter((r): r is Row => Boolean(r));
  },

  async listProducts(): Promise<DealProductRef[]> {
    await wait(100);
    return products.map((p) => ({ ...p, dealIds: [...p.dealIds] }));
  },

  /** Ürünleri bu fırsattan çıkarır (ürünün diğer fırsatları kalır). */
  async unassignProducts(dealId: string, productIds: string[]): Promise<void> {
    await wait(0);
    const picked = new Set(productIds);
    products = products.map((p) =>
      picked.has(p.id) ? { ...p, dealIds: p.dealIds.filter((d) => d !== dealId) } : p,
    );
  },

  /** Seçili ürünlere fırsatı ekler (ürünün başka fırsatları da kalır). */
  async assignProducts(dealId: string, productIds: string[]): Promise<void> {
    await wait(0);
    const picked = new Set(productIds);
    products = products.map((p) =>
      picked.has(p.id) && !p.dealIds.includes(dealId)
        ? { ...p, dealIds: [...p.dealIds, dealId] }
        : p,
    );
  },
};
