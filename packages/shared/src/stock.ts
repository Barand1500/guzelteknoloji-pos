import { z } from 'zod';
export interface SelectOption {
  value: string;
  label: string;
  removable?: boolean;
}

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
  /** Eski istemci sözleşmesi için; ek fiyat kaydı artık oluşturulmaz. */
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
  /** Eski istemci sözleşmesi için; veritabanına kaydedilmez. */
  vatDepartment: string;
  stockKind: string;
  inventoryTracking: string;
  // Gelişmiş (varsayılan kapalı)
  // Envanter takibine göre görünen alanlar (yalnızca seçili takip türünün alanları gösterilir)
  /** Eldeki adet (yalnızca "Normal" envanter takibinde girilir; boş = 0). */
  stockQuantity: string; // Normal
  lowerLimit: string; // Normal
  upperLimit: string; // Normal
  gtip: string;
  origin: string;
  otherTax: string;
  /** Fiyat listesi kimliği → o listenin birim satırları. */
  units: Record<string, UnitRow[]>;
}

// Formun ondalık metinleri sunucuda da doğrulanır; boş değer sıfırla karıştırılmaz.
const text = (max: number) => z.string().trim().max(max, `En fazla ${max} karakter girilebilir.`);
const decimal = z
  .string()
  .trim()
  .transform((v) => v.replace(',', '.'))
  .refine(
    (v) => v === '' || /^\d{1,12}(\.\d{1,6})?$/.test(v),
    'Pozitif bir sayı girin; en fazla 12 tam ve 6 ondalık basamak kullanılabilir.',
  );
const percentage = decimal.refine(
  (v) => v === '' || Number(v) <= 100,
  'Oran 0–100 arasında olmalı.',
);
const currency = z.enum(['TRY', 'USD', 'EUR'], { error: 'Geçerli bir para birimi seçin.' });
const extraPriceSchema = z.strictObject({
  id: text(100),
  note: text(250),
  amount: decimal,
  discount: percentage,
  currency,
});
const priceSchema = z.strictObject({
  amount: decimal,
  currency,
  discount: percentage,
  vatRate: percentage,
  vatIncluded: z.boolean(),
  extras: z.array(extraPriceSchema).max(30, 'En fazla 30 ek fiyat eklenebilir.'),
});
const unitSchema = z
  .strictObject({
    id: text(100),
    unit: text(100).min(1, 'Birim seçin.'),
    multiplier: decimal.refine((v) => Number(v) > 0, 'Birim çarpanı sıfırdan büyük olmalı.'),
    purchase: priceSchema,
    sale: priceSchema,
    barcodes: z
      .array(
        z.strictObject({
          id: text(100),
          type: z.enum(['EAN8', 'EAN13', 'UPC', 'CODE39', 'CODE93', 'CODE128', 'GRAMAJ', 'ADET']),
          code: text(128).min(1, 'Barkod boş olamaz.'),
        }),
      )
      .max(50, 'Bir birime en fazla 50 barkod eklenebilir.'),
    weight: decimal,
    weightUnit: z.enum(['kg', 'g']),
    volume: decimal,
    note: text(1000),
    isMain: z.boolean(),
    isDefault: z.boolean(),
  })
  .superRefine((row, ctx) => {
    if (row.isMain && Number(row.multiplier) !== 1)
      ctx.addIssue({ code: 'custom', message: 'Ana birimin çarpanı 1 olmalı.' });
    const codes = row.barcodes.map((b) => b.code.toLocaleLowerCase('en-US'));
    if (new Set(codes).size !== codes.length)
      ctx.addIssue({ code: 'custom', message: 'Aynı birimde bir barkod iki kez kullanılamaz.' });
  });
export const stockDraftSchema = z
  .strictObject({
    stockType: text(100).min(1),
    code: text(100),
    name: text(250),
    brand: text(100),
    vatDepartment: text(100),
    stockKind: text(100),
    inventoryTracking: z.enum(['yok', 'normal']),
    // Eski istemciler göndermezse boş sayılır.
    stockQuantity: z
      .string()
      .trim()
      .transform((v) => v.replace(',', '.'))
      .refine(
        (v) => v === '' || /^-?\d{1,12}(\.\d{1,6})?$/.test(v),
        'Geçerli bir stok miktarı girin; en fazla 12 tam ve 6 ondalık basamak kullanılabilir.',
      )
      .default(''),
    lowerLimit: decimal,
    upperLimit: decimal,
    gtip: text(32),
    origin: text(40),
    otherTax: text(100),
    units: z.record(
      text(100).min(1),
      z.array(unitSchema).min(1, 'Fiyat listesinde en az bir birim olmalı.').max(30),
    ),
  })
  .superRefine((draft, ctx) => {
    const lists = Object.values(draft.units);
    if (lists.reduce((count, rows) => count + rows.length, 0) > 100)
      ctx.addIssue({
        code: 'custom',
        message: 'Bir stok kartında en fazla 100 birim satırı kullanılabilir.',
      });
    if (lists.length < 1 || lists.length > 20)
      ctx.addIssue({ code: 'custom', message: '1–20 fiyat listesi kullanılabilir.' });
    for (const rows of lists) {
      if (
        rows.filter((r) => r.isMain).length !== 1 ||
        rows.filter((r) => r.isDefault).length !== 1
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Her fiyat listesinde bir ana ve bir varsayılan birim seçin.',
        });
      }
    }
    if (
      draft.inventoryTracking === 'normal' &&
      draft.lowerLimit !== '' &&
      draft.upperLimit !== '' &&
      Number(draft.lowerLimit) > Number(draft.upperLimit)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['upperLimit'],
        message: 'Üst limit alt limitten küçük olamaz.',
      });
    }
  });
export const createStockSchema = z.strictObject({ requestId: z.uuid(), draft: stockDraftSchema });
export type CreateStockInput = z.infer<typeof createStockSchema>;
export const editableListSchema = z.enum([
  'stockTypes',
  'vatDepartments',
  'stockKinds',
  'units',
  'priceLists',
]);
export const addStockOptionSchema = z.strictObject({
  list: editableListSchema,
  label: text(120).min(1, 'Seçenek adı girin.'),
});
export const removeStockOptionSchema = z.strictObject({
  list: editableListSchema,
  value: text(100).min(1),
});

export function stockValidationMessage(error: z.ZodError): string {
  const message = error.issues[0]?.message;
  return !message || /^(Invalid|Too|Unrecognized)/.test(message)
    ? 'Stok bilgileri eksik veya geçersiz. Alanları kontrol edin.'
    : message;
}
