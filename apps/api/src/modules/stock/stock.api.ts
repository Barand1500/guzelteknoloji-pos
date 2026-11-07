import { z } from 'zod';
import { createStockSchema } from '@gt/shared';

export const recordId = z.number().int().min(1).max(2147483647);
export const recordKey = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .refine((value) => Number(value) <= 2147483647);
const filterId = z.union([z.literal(''), recordKey]).default('');
const filterIds = z
  .string()
  .default('')
  .transform((value, ctx) => {
    if (!value) return [];
    const parts = value.split(',');
    if (
      parts.length > 100 ||
      parts.some((id) => !recordKey.safeParse(id).success) ||
      new Set(parts).size !== parts.length
    ) {
      ctx.addIssue({ code: 'custom', message: 'Geçersiz filtre seçimi.' });
      return z.NEVER;
    }
    return parts.map(Number);
  });
const priceBound = z
  .string()
  .default('')
  .transform((value) => value.replace(',', '.'))
  .pipe(
    z.union([
      z.literal(''),
      z.string().regex(/^\d{1,12}(\.\d{1,6})?$/, 'Geçerli bir fiyat girin.'),
    ]),
  );
const selection = z
  .array(z.union([recordId, recordKey.transform(Number)]))
  .max(1000)
  .refine((ids) => new Set(ids).size === ids.length, 'Aynı kayıt iki kez seçilemez.');
export const stockSaveSchema = createStockSchema.extend({
  extras: z
    .strictObject({
      categoryIds: selection,
      dealIds: selection,
      attributeValueIds: selection.optional(),
    })
    .optional(),
});
export type StockSaveInput = z.infer<typeof stockSaveSchema>;

export const stockListQuery = z
  .object({
    arama: z.string().trim().max(250).default(''),
    sayfa: z.coerce.number().int().min(1).max(10000000).default(1),
    boyut: z.coerce.number().int().min(1).max(200).default(10),
    kategori: filterId,
    marka: filterId,
    kategoriler: filterIds,
    markalar: filterIds,
    firsat: z.enum(['all', 'with', 'without']).default('all'),
    en_az: priceBound,
    en_cok: priceBound,
    secenekler: z.enum(['0', '1']).default('1'),
    sayim: z.enum(['0', '1']).default('0'),
    kimlik: filterId,
    stok: z.enum(['', 'all', 'in', 'out', 'unlimited']).default('all'),
    satis: z.enum(['', 'all', 'open', 'closed']).default('all'),
  })
  .refine((q) => !q.en_az || !q.en_cok || Number(q.en_az) <= Number(q.en_cok), {
    message: 'En az fiyat, en çok fiyattan büyük olamaz.',
    path: ['en_cok'],
  });
export type StockListQuery = z.infer<typeof stockListQuery>;

export const stockBulkSchema = z.strictObject({
  ids: z
    .array(recordId)
    .min(1)
    .max(1000)
    .refine((ids) => new Set(ids).size === ids.length, 'Aynı ürün birden fazla seçilemez.'),
  islem: z.enum(['stok_ac', 'stok_kapat', 'satis_ac', 'satis_kapat', 'sil']),
});
export type StockBulkInput = z.infer<typeof stockBulkSchema>;

/**
 * Ürünün bir fiyat listesindeki (ör. FİYAT, PERAKENDE, BARAN) ana birim satış fiyatı. `net`: iskonto
 * uygulanmış KDV HARİÇ tutar; fiyat girilmemişse `null` ("—" gösterilir, 0 değildir).
 */
export interface ListPrice {
  /** Fiyat listesi seçeneğinin kimliği. */
  id: string;
  code: string;
  /** Kullanıcının verdiği ad (sekmedeki ad). */
  name: string;
  net: number | null;
  /** KDV dahil, ekranda ve fiyat süzgecinde kullanılan iki ondalıklı tutar. */
  gross?: number | null;
  vatRate: number;
  /** ISO para birimi kodu (TRY, USD, EUR). */
  currency: string;
}

export interface ProductListItem {
  id: string;
  code: string;
  name: string;
  stockType: string;
  brandId: string | null;
  brandName: string;
  categoryId: string | null;
  categoryName: string;
  categoryIds: string[];
  categoryNames: string[];
  imageUrl: string | null;
  imageUrls: string[];
  variantCount?: number;
  barcode: string;
  barcodes: string[];
  currency: string;
  vatRate: number;
  prices: [number, number, number];
  cost: number;
  stock: number;
  stockTracking: boolean;
  salesOpen: boolean;
  dealIds: string[];
  priceVatRates: [number, number, number];
  priceCurrencies: [string, string, string];
  costVatRate: number;
  costCurrency: string;
  /** Kullanıcının TÜM fiyat listeleri, kendi sırasıyla (eski prices/priceVatRates dizilerinin genel hâli). */
  listPrices: ListPrice[];
}

export interface ProductListPage {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  priceLists?: { id: string; name: string }[];
  filterOptions?: {
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
  };
}
