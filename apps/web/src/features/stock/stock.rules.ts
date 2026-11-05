import type { StockCardDraft } from './types';

/**
 * Zorunlu alanlar. Şimdilik BOŞ: hangi alanların zorunlu olacağını ürün sahibi sonra bildirecek.
 * Eklemek için alan adını yazmak yeterli, ör. ['code', 'name'] — form otomatik denetler.
 */
export const REQUIRED_FIELDS: readonly (keyof StockCardDraft)[] = [];

export const REQUIRED_MESSAGE = 'Bu alan zorunlu.';

/** Boş bırakılmış zorunlu alanları döndürür: { alan: mesaj }. */
export function validateRequired(
  draft: StockCardDraft,
): Partial<Record<keyof StockCardDraft, string>> {
  const errors: Partial<Record<keyof StockCardDraft, string>> = {};
  for (const field of REQUIRED_FIELDS) {
    const value = draft[field];
    if (typeof value === 'string' && value.trim() === '') errors[field] = REQUIRED_MESSAGE;
  }
  return errors;
}

export const emptyDraft: StockCardDraft = {
  stockType: 'basit',
  code: '',
  name: '',
  vatDepartment: '',
  brand: '',
  stockKind: 'resmi',
  inventoryTracking: 'normal',
  lowerLimit: '',
  upperLimit: '',
  gtip: '',
  origin: '',
  priceList: 'fiyat',
  unit: 'adet',
  multiplier: '1',
  purchasePrice: '',
  salePrice: '',
  currency: 'TRY',
  discount: '',
  vatRate: '20',
  vatIncluded: false,
  barcode: '',
  weight: '',
  volume: '',
  unitNote: '',
  isMainUnit: true,
  isDefaultUnit: true,
};
