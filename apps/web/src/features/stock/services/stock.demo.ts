import type { SelectOption } from '../../../components/ui/SelectField';
import { stockLookupsMock } from '../../../mocks/stock.mock';
import { demoBrandService } from '../../brands/services/brand.demo';
import { draftFromProduct, patchFromDraft } from '../../products/product.draft';
import { productService } from '../../products/services/product.service';
import type { OptionListKey, StockCardDraft, StockLookups } from '../types';
import type { StockService } from './stock.service';

/** GEÇİCİ: yalnızca test kullanıcısının deneme ekranı; gerçek API veya veritabanına yazmaz. */

const fakeDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoStockService: StockService = {
  async getLookups(): Promise<StockLookups> {
    await fakeDelay();
    const brands = (await demoBrandService.list())
      .filter((brand) => brand.active)
      .map((brand) => ({ value: brand.id, label: brand.name }));
    return { ...stockLookupsMock, brands };
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
    // Deneme kartı ürün listesine de düşer (yalnızca bellekte).
    const id = await productService.applyCard(
      null,
      patchFromDraft(draft, await demoStockService.getLookups()),
    );
    return { id };
  },

  async get(id: string): Promise<StockCardDraft> {
    await fakeDelay();
    const product = await productService.get(id);
    if (!product) throw new Error('Ürün bulunamadı.');
    return draftFromProduct(product);
  },

  async update(id: string, draft: StockCardDraft): Promise<{ id: string }> {
    await fakeDelay();
    await productService.applyCard(id, patchFromDraft(draft, await demoStockService.getLookups()));
    return { id };
  },
};
