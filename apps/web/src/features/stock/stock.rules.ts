import type { PriceBlockData, StockCardDraft, UnitRow } from './types';

/**
 * Zorunlu alanlar. Şimdilik BOŞ: hangi alanların zorunlu olacağını ürün sahibi sonra bildirecek.
 * Eklemek için alan adını yazmak yeterli, ör. ['code', 'name'] — form otomatik denetler.
 */
export const REQUIRED_FIELDS: readonly (keyof StockCardDraft)[] = [];

export const REQUIRED_MESSAGE = 'Bu alan zorunlu.';

export type DraftErrors = Partial<Record<keyof StockCardDraft, string>>;

/** Boş bırakılmış zorunlu alanları döndürür: { alan: mesaj }. */
export function validateRequired(draft: StockCardDraft): DraftErrors {
  const errors: DraftErrors = {};
  for (const field of REQUIRED_FIELDS) {
    const value = draft[field];
    if (typeof value === 'string' && value.trim() === '') errors[field] = REQUIRED_MESSAGE;
  }
  return errors;
}

let seq = 0;
/** Ekranda anahtar olarak kullanılan, sunucuya gitmeyen geçici kimlik. */
export const uid = (): string => `t${++seq}`;

const emptyBlock = (): PriceBlockData => ({
  amount: '',
  currency: 'TRY',
  discount: '',
  vatRate: '20',
  vatIncluded: false,
  extras: [],
});

/**
 * Yeni birim satırı. İlk satır ana/varsayılan birimdir ve çarpanı 1'dir;
 * sonraki satırlarda çarpanı kullanıcı girer (ör. 1 KOLİ = 12 ADET).
 */
export function createUnitRow(first: boolean, unit = 'adet'): UnitRow {
  return {
    id: uid(),
    unit,
    multiplier: first ? '1' : '',
    purchase: emptyBlock(),
    sale: emptyBlock(),
    barcodes: [],
    weight: '',
    weightUnit: 'kg',
    volume: '',
    note: '',
    isMain: first,
    isDefault: first,
  };
}

export function createEmptyDraft(firstPriceListId: string): StockCardDraft {
  return {
    stockType: 'basit',
    code: '',
    name: '',
    brand: '',
    vatDepartment: '',
    stockKind: 'resmi',
    inventoryTracking: 'normal',
    lowerLimit: '',
    upperLimit: '',
    gtip: '',
    origin: '',
    otherTax: '',
    units: { [firstPriceListId]: [createUnitRow(true)] },
  };
}
