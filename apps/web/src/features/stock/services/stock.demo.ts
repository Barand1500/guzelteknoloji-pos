import type { SelectOption } from '../../../components/ui/SelectField';
import { stockLookupsMock } from '../../../mocks/stock.mock';
import { demoBrandService } from '../../brands/services/brand.demo';
import { draftFromProduct, patchFromDraft } from '../../products/product.draft';
import { demoProductService as productService } from '../../products/services/product.demo';
import { demoCategoryService as categoryService } from '../../categories/services/category.demo';
import { demoDealService as dealService } from '../../deals/services/deal.demo';
import { demoAttributeService } from '../../attributes/services/attribute.demo';
import type {
  OptionListKey,
  StockCardDraft,
  StockExtraOptions,
  StockExtras,
  StockLookups,
} from '../types';
import type { StockService } from './stock.service';

/** GEÇİCİ: yalnızca test kullanıcısının deneme ekranı; gerçek API veya veritabanına yazmaz. */

/** Formda eklenen fiyat listeleri (deneme verisi, sayfa yenilenince sıfırlanır). */
let customPriceLists: SelectOption[] = [];
/** Yalnızca testler için. */
export const resetDemoStock = () => {
  customPriceLists = [];
};

const fakeDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoStockService: StockService = {
  async getLookups(): Promise<StockLookups> {
    await fakeDelay();
    const brands = (await demoBrandService.list())
      .filter((brand) => brand.active)
      .map((brand) => ({ value: brand.id, label: brand.name }));
    return {
      ...stockLookupsMock,
      brands,
      priceLists: [...stockLookupsMock.priceLists, ...customPriceLists],
    };
  },

  async addOption(list: OptionListKey, label: string): Promise<SelectOption> {
    await fakeDelay(0);
    const option = {
      value: `ozel-${Math.random().toString(36).slice(2, 9)}`,
      label,
      removable: true,
    };
    if (list === 'priceLists') customPriceLists = [...customPriceLists, option];
    return option;
  },

  async removeOption(list: OptionListKey, value: string): Promise<void> {
    await fakeDelay(0);
    if (list === 'priceLists') {
      customPriceLists = customPriceLists.filter((o) => o.value !== value);
      await productService.removePriceList(value);
    }
  },

  async save(
    draft: StockCardDraft,
    _requestId: string,
    extras?: StockExtras,
  ): Promise<{ id: string }> {
    await fakeDelay();
    // Deneme kartı ürün listesine de düşer (yalnızca bellekte).
    const id = await productService.applyCard(
      null,
      patchFromDraft(draft, await demoStockService.getLookups()),
    );
    if (extras) await productService.applyExtras(id, extras);
    return { id };
  },

  async get(id: string): Promise<StockCardDraft> {
    await fakeDelay();
    const product = await productService.get(id);
    if (!product) throw new Error('Ürün bulunamadı.');
    return draftFromProduct(product);
  },

  async update(
    id: string,
    draft: StockCardDraft,
    _requestId: string,
    extras?: StockExtras,
  ): Promise<{ id: string }> {
    await fakeDelay();
    await productService.applyCard(id, patchFromDraft(draft, await demoStockService.getLookups()));
    if (extras) await productService.applyExtras(id, extras);
    return { id };
  },

  async getExtraOptions(): Promise<StockExtraOptions | null> {
    const [categories, deals, attributes] = await Promise.all([
      categoryService.list(),
      dealService.list(),
      demoAttributeService.snapshot(),
    ]);
    return { categories, deals, attributes };
  },

  async getExtras(id: string): Promise<StockExtras> {
    const product = await productService.get(id);
    return product
      ? {
          categoryIds: [
            ...(product.categoryIds ?? (product.categoryId ? [product.categoryId] : [])),
          ],
          dealIds: [...product.dealIds],
        }
      : { categoryIds: [], dealIds: [] };
  },
};
