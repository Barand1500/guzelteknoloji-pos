import type { Category } from '../categories/types';
import type { Deal } from '../deals/types';
export type {
  OptionListKey,
  StockLookups,
  WeightUnit,
  ExtraPrice,
  BarcodeEntry,
  PriceBlockData,
  UnitRow,
  StockCardDraft,
} from '@gt/shared';

/** Stok kartıyla birlikte seçilen, kart gövdesinin (StockCardDraft) dışındaki ek bilgiler. */
export interface StockExtras {
  categoryIds: string[];
  dealIds: string[];
}

export const emptyExtras = (): StockExtras => ({ categoryIds: [], dealIds: [] });

/** Kategori ve fırsat kutularının seçenekleri. */
export interface StockExtraOptions {
  categories: Category[];
  deals: Deal[];
}
