import { stockLookupsMock } from '../../../mocks/stock.mock';
import type { StockCardDraft, StockLookups } from '../types';

/**
 * Stok verisine erişimin TEK kapısı. Şimdilik sahte veri döner; gerçek API gelince yalnızca
 * bu dosya değişir (bileşenler aynı kalır).
 */
const fakeDelay = () => new Promise((resolve) => setTimeout(resolve, 250));

export const stockService = {
  async getLookups(): Promise<StockLookups> {
    await fakeDelay();
    return stockLookupsMock;
  },

  async save(draft: StockCardDraft): Promise<{ id: string }> {
    await fakeDelay();
    // Sahte kayıt: hiçbir yere yazılmaz.
    return { id: `mock-${draft.code || 'yeni'}` };
  },
};
