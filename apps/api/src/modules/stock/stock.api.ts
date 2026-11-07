import { z } from 'zod';
import { createStockSchema } from '@gt/shared';

export const recordId = z.number().int().min(1).max(2147483647);
export const recordKey = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .refine((value) => Number(value) <= 2147483647);
const filterId = z.union([z.literal(''), recordKey]).default('');
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

export const stockListQuery = z.object({
  arama: z.string().trim().max(250).default(''),
  sayfa: z.coerce.number().int().min(1).max(10000000).default(1),
  boyut: z.coerce.number().int().min(1).max(200).default(10),
  kategori: filterId,
  marka: filterId,
  kimlik: filterId,
  stok: z.enum(['', 'all', 'in', 'out', 'unlimited']).default('all'),
  satis: z.enum(['', 'all', 'open', 'closed']).default('all'),
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
}

export interface ProductListPage {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}
