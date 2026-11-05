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

/** Ana birim değişirken oranlar korunur: 1 KOLİ = 12 ADET ise yeni ana KOLİ'de ADET 1/12 olur. */
export function rebaseUnits(rows: UnitRow[], mainId: string): UnitRow[] | null {
  const base = Number(rows.find((row) => row.id === mainId)?.multiplier.replace(',', '.'));
  if (!Number.isFinite(base) || base <= 0) return null;
  const next = rows.map((row) => {
    const value = Number(row.multiplier.replace(',', '.')) / base;
    return {
      ...row,
      isMain: row.id === mainId,
      multiplier: value.toFixed(6).replace(/\.?0+$/, ''),
    };
  });
  return next.every(
    (row) =>
      Number.isFinite(Number(row.multiplier)) &&
      Number(row.multiplier) > 0 &&
      Number(row.multiplier) < 1e12,
  )
    ? next
    : null;
}

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
    serialRequired: false,
    serialPrefix: '',
    lotRequired: false,
    expiryTracking: false,
    lotPrefix: '',
    expiryRequired: false,
    shelfLifeDays: '',
    riskDays: '',
    gtip: '',
    origin: '',
    otherTax: '',
    units: { [firstPriceListId]: [createUnitRow(true)] },
  };
}

/** Envanter takibi türüne göre gösterilecek alanlar. Anahtar = envanter takibi seçeneğinin değeri. */
export type InventoryField =
  | {
      kind: 'yesno';
      key: 'serialRequired' | 'lotRequired' | 'expiryTracking' | 'expiryRequired';
      label: string;
    }
  | {
      kind: 'decimal' | 'integer' | 'text';
      key:
        'lowerLimit' | 'upperLimit' | 'serialPrefix' | 'lotPrefix' | 'shelfLifeDays' | 'riskDays';
      label: string;
    };

export const INVENTORY_FIELDS: Record<string, InventoryField[]> = {
  yok: [],
  normal: [
    { kind: 'decimal', key: 'lowerLimit', label: 'Alt Limit' },
    { kind: 'decimal', key: 'upperLimit', label: 'Üst Limit' },
  ],
  seri: [
    { kind: 'yesno', key: 'serialRequired', label: 'Seri No Zorunlu' },
    { kind: 'text', key: 'serialPrefix', label: 'Seri No Öneki' },
  ],
  lot: [
    { kind: 'yesno', key: 'lotRequired', label: 'LOT Zorunlu' },
    { kind: 'yesno', key: 'expiryTracking', label: 'SKT Takibi' },
    { kind: 'text', key: 'lotPrefix', label: 'LOT Öneki' },
  ],
  omur: [
    { kind: 'yesno', key: 'expiryRequired', label: 'SKT Zorunlu' },
    { kind: 'integer', key: 'shelfLifeDays', label: 'Raf Ömrü (Gün)' },
    { kind: 'integer', key: 'riskDays', label: 'Risk (Gün)' },
  ],
};
