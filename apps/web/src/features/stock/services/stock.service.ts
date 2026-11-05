import type { SelectOption } from '../../../components/ui/SelectField';
import { stockLookupsMock } from '../../../mocks/stock.mock';
import { brandService } from '../../brands/services/brand.service';
import type { OptionListKey, StockCardDraft, StockLookups } from '../types';

/**
 * Stok verisine erişimin TEK kapısı. Şimdilik sahte veri döner; gerçek API gelince yalnızca
 * bu dosya değişir (bileşenler aynı kalır).
 */
const fakeDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const stockService = {
  async getLookups(): Promise<StockLookups> {
    await fakeDelay();
    // Marka seçenekleri Markalar ekranındaki aktif markalardır (aynı sırada).
    const brands = (await brandService.list())
      .filter((b) => b.active)
      .map((b) => ({ value: b.id, label: b.name }));
    return { ...stockLookupsMock, brands };
  },

  /** Listeye yeni seçenek ekler (ör. yeni birim "PALET"). Sahte: sunucuya yazılmaz. */
  async addOption(_list: OptionListKey, label: string): Promise<SelectOption> {
    await fakeDelay(0);
    return { value: `ozel-${Math.random().toString(36).slice(2, 9)}`, label, removable: true };
  },

  /** Listeden seçenek siler. Sahte: sunucuya yazılmaz. */
  async removeOption(_list: OptionListKey, _value: string): Promise<void> {
    await fakeDelay(0);
  },

  async save(draft: StockCardDraft): Promise<{ id: string }> {
    await fakeDelay();
    // Sahte kayıt: hiçbir yere yazılmaz.
    return { id: `mock-${draft.code || 'yeni'}` };
  },
};
