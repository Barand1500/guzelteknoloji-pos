import type { SelectOption } from '../../components/ui/SelectField';

/** Kullanıcının kendi ekleyip silebildiği listeler (seçim kutusundaki "Yeni ekle" satırı). */
export type OptionListKey = 'stockTypes' | 'vatDepartments' | 'stockKinds' | 'units' | 'priceLists';

/** Formdaki seçim listeleri (gerçekte sunucudan gelecek). */
export interface StockLookups {
  stockTypes: SelectOption[];
  vatDepartments: SelectOption[];
  brands: SelectOption[];
  stockKinds: SelectOption[];
  inventoryTracking: SelectOption[];
  otherTaxes: SelectOption[];
  units: SelectOption[];
  currencies: SelectOption[];
  priceLists: SelectOption[];
  vatRates: SelectOption[];
  barcodeTypes: SelectOption[];
}

export type WeightUnit = 'kg' | 'g';

/** Ana fiyata ek, açıklamalı fiyat (ör. kampanya, bayi fiyatı). */
export interface ExtraPrice {
  id: string;
  note: string;
  amount: string;
  discount: string;
  currency: string;
}

export interface BarcodeEntry {
  id: string;
  type: string;
  code: string;
}

/** Alış ya da satış tarafı: fiyat, para birimi, iskonto ve KDV. Sayılar metin tutulur (yazarken "1," olabilir). */
export interface PriceBlockData {
  amount: string;
  currency: string;
  discount: string;
  vatRate: string;
  vatIncluded: boolean;
  extras: ExtraPrice[];
}

/** Bir fiyat listesindeki (ör. "Perakende") bir birim satırı. */
export interface UnitRow {
  id: string;
  unit: string;
  multiplier: string;
  purchase: PriceBlockData;
  sale: PriceBlockData;
  barcodes: BarcodeEntry[];
  weight: string;
  /** Ağırlığın birimi: kg ya da g. Hacim her zaman desidir. */
  weightUnit: WeightUnit;
  volume: string;
  note: string;
  isMain: boolean;
  isDefault: boolean;
}

export interface StockCardDraft {
  // Temel bilgi
  stockType: string;
  code: string;
  name: string;
  brand: string;
  vatDepartment: string;
  stockKind: string;
  inventoryTracking: string;
  // Gelişmiş (varsayılan kapalı)
  lowerLimit: string;
  upperLimit: string;
  gtip: string;
  origin: string;
  otherTax: string;
  /** Fiyat listesi kimliği → o listenin birim satırları. */
  units: Record<string, UnitRow[]>;
}
