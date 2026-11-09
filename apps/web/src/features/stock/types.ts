import type { Category } from '../categories/types';
import type { Deal } from '../deals/types';
import type { AttributeSnapshot } from '../attributes/services/attribute.demo';
export type {
  OptionListKey,
  StockLookups,
  WeightUnit,
  ExtraPrice,
  BarcodeEntry,
  PriceBlockData,
  UnitRow,
  StockCardDraft,
  OtherTaxEntry,
} from '@gt/shared';

/** Stok kartıyla birlikte seçilen, kart gövdesinin (StockCardDraft) dışındaki ek bilgiler. */
export interface StockExtras {
  categoryIds: string[];
  dealIds: string[];
  attributeValueIds?: string[];
}

export const emptyExtras = (): StockExtras => ({
  categoryIds: [],
  dealIds: [],
  attributeValueIds: [],
});

/** Kategori ve fırsat kutularının seçenekleri. */
export interface StockExtraOptions {
  categories: Category[];
  deals: Deal[];
  attributes?: AttributeSnapshot;
}
