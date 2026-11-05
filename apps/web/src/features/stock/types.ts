import type { SelectOption } from '../../components/ui/SelectField';

/** Formdaki seçim listeleri (gerçekte sunucudan gelecek). */
export interface StockLookups {
  stockTypes: SelectOption[];
  vatDepartments: SelectOption[];
  brands: SelectOption[];
  stockKinds: SelectOption[];
  inventoryTracking: SelectOption[];
  units: SelectOption[];
  currencies: SelectOption[];
  priceLists: SelectOption[];
  vatRates: SelectOption[];
}

/**
 * Stok kartı taslağı. Sayısal alanlar da metin olarak tutulur (kullanıcı yazarken "1," gibi
 * yarım değerler olabilir); kaydederken sayıya çevrilir.
 */
export interface StockCardDraft {
  // Temel bilgi
  stockType: string;
  code: string;
  name: string;
  vatDepartment: string;
  brand: string;
  // Gelişmiş (varsayılan kapalı)
  stockKind: string;
  inventoryTracking: string;
  lowerLimit: string;
  upperLimit: string;
  gtip: string;
  origin: string;
  // Fiyat
  priceList: string;
  unit: string;
  multiplier: string;
  purchasePrice: string;
  salePrice: string;
  currency: string;
  discount: string;
  vatRate: string;
  vatIncluded: boolean;
  // Barkod ve ölçü
  barcode: string;
  weight: string;
  volume: string;
  unitNote: string;
  isMainUnit: boolean;
  isDefaultUnit: boolean;
}
