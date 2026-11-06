import { z } from 'zod';

export interface BrandDraft {
  name: string;
  description: string;
  logoUrl: string | null;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
}
export interface Brand extends BrandDraft {
  id: string;
  productCount: number;
}
export interface ProductRef {
  id: string;
  code: string;
  name: string;
  barcode: string;
  brandId: string | null;
}

export const brandKeySchema = z
  .string()
  .min(1)
  .regex(/^[1-9][0-9]{0,9}$/, 'Geçersiz marka kimliği.')
  .refine((id) => Number(id) <= 2147483647, 'Geçersiz marka kimliği.');
export const brandDraftSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Marka adı gerekli.')
      .max(120, 'Marka adı en çok 120 karakter olabilir.'),
    description: z.string().trim().max(10000, 'Açıklama en çok 10000 karakter olabilir.'),
    logoUrl: z.string().max(2800000, 'Logo en çok 2 MB olabilir.').nullable(),
    active: z.boolean(),
    seoTitle: z.string().trim().max(250, 'SEO başlığı en çok 250 karakter olabilir.'),
    seoDescription: z.string().trim().max(1000, 'SEO açıklaması en çok 1000 karakter olabilir.'),
  })
  .strict();
export const reorderBrandsSchema = z.object({ ids: z.array(brandKeySchema).max(10000) }).strict();
export const brandProductsSchema = z
  .object({
    productIds: z
      .array(
        z
          .string()
          .regex(/^[1-9][0-9]{0,9}$/)
          .refine((id) => Number(id) <= 2147483647),
      )
      .min(1, 'En az bir ürün seçin.')
      .max(1000, 'Bir işlemde en çok 1000 ürün seçebilirsiniz.'),
  })
  .strict();
