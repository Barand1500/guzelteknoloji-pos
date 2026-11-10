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

const bulkIds = z
  .array(recordId)
  .min(1)
  .max(1000)
  .refine((ids) => new Set(ids).size === ids.length, 'Aynı ürün birden fazla seçilemez.');
/** Toplu fiyat değişikliği: tutarlar KDV DAHİL gösterilen fiyat üzerinden hesaplanır. */
const bulkAmount = z
  .string()
  .trim()
  .transform((v) => v.replace(',', '.'))
  .refine((v) => /^\d{1,12}(\.\d{1,6})?$/.test(v), 'Geçerli bir tutar ya da oran girin.');
export const stockBulkSchema = z.discriminatedUnion('islem', [
  z.strictObject({
    ids: bulkIds,
    islem: z.enum(['stok_ac', 'stok_kapat', 'satis_ac', 'satis_kapat', 'sil']),
  }),
  z.strictObject({
    ids: bulkIds,
    islem: z.enum(['firsat_ekle', 'firsat_kaldir']),
    firsatId: recordId,
  }),
  z.strictObject({
    ids: bulkIds,
    islem: z.enum(['kategori_ekle', 'kategori_kaldir']),
    kategoriId: recordId,
  }),
  // markaId boşsa ürünler "markasız" olur.
  z.strictObject({ ids: bulkIds, islem: z.literal('marka_ata'), markaId: recordId.nullable() }),
  z.strictObject({
    ids: bulkIds,
    islem: z.literal('fiyat_guncelle'),
    listeId: recordId,
    yon: z.enum(['satis', 'alis']),
    mod: z.enum(['yuzde_artir', 'yuzde_azalt', 'tutar_ekle', 'tutar_cikar', 'ayarla']),
    deger: bulkAmount,
    /** Hesabın dayandığı fiyat: KDV dahil ya da hariç (yüzdede sonuç aynıdır, sabit tutarda fark eder). */
    kdv: z.enum(['dahil', 'haric']).default('dahil'),
    /** Sonucu en yakın adıma yuvarlar (TL): 0,10 · 0,50 · 1 · 5. */
    yuvarla: z.enum(['yok', '0.1', '0.5', '1', '5']).default('yok'),
    /** Varyantlı ürünlerde varyant fiyatları da aynı değişimle güncellensin mi. */
    varyantlar: z.boolean().default(false),
  }),
]);
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
