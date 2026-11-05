import type { SelectOption } from '../../../components/ui/SelectField';
import { stockLookupsMock } from '../../../mocks/stock.mock';
import type { OptionListKey, StockCardDraft, StockLookups } from '../types';
import type { StockService } from './stock.service';

/** GEÇİCİ: yalnızca test kullanıcısının deneme ekranı; gerçek API veya veritabanına yazmaz. */

const fakeDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoStockService: StockService = {
  async getLookups(): Promise<StockLookups> {
    await fakeDelay();
    return stockLookupsMock;
  },

  async addOption(_list: OptionListKey, label: string): Promise<SelectOption> {
    await fakeDelay(0);
    return { value: `ozel-${Math.random().toString(36).slice(2, 9)}`, label, removable: true };
  },

  async removeOption(_list: OptionListKey, _value: string): Promise<void> {
    await fakeDelay(0);
  },

  async save(draft: StockCardDraft): Promise<{ id: string }> {
    await fakeDelay();

    return { id: `mock-${draft.code || 'yeni'}` };
  },
};
