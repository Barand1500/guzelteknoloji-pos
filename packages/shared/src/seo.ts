import { z } from 'zod';

/** SEO Ayarları ekranının ortak sözleşmesi (API + ekran). Kayıtlar katalog tablolarında yaşar;
 * ekran yalnızca seo_basligi/seo_aciklamasi alanlarını günceller ve 301 yönlendirmelerini yönetir. */

export const SEO_KINDS = ['kategori', 'marka', 'firsat', 'urun', 'sabit-sayfa'] as const;
export type SeoKind = (typeof SEO_KINDS)[number];
export const seoKindSchema = z.enum(SEO_KINDS);

export const seoSaveSchema = z.strictObject({
  seoTitle: z.string().trim().max(250, 'Başlık en çok 250 karakter olmalı.'),
  seoDescription: z.string().trim().max(1000, 'Açıklama en çok 1000 karakter olmalı.'),
});
export type SeoSaveInput = z.infer<typeof seoSaveSchema>;

export const seoRedirectDraftSchema = z.strictObject({
  kind: seoKindSchema,
  /** Yönlendirmenin hedef sayfası; sabit sayfa kayıtları gelene kadar null kalabilir. */
  id: z
    .string()
    .regex(/^\d+$/, 'Geçersiz kayıt kimliği.')
    .nullable(),
  from: z
    .string()
    .trim()
    .min(1, 'Eski adres gerekli.')
    .max(300)
    .startsWith('/', 'Eski adres "/" ile başlamalı.'),
  seoTitle: z.string().trim().max(250),
  seoDescription: z.string().trim().max(1000),
});
export type SeoRedirectDraftInput = z.infer<typeof seoRedirectDraftSchema>;

export interface SeoRedirectDto {
  id: string;
  from: string;
  seoTitle: string;
  seoDescription: string;
}

export interface SeoRowDto {
  id: string;
  kind: SeoKind;
  /** Kayıt adı (kategori/marka/fırsat/ürün). */
  name: string;
  /** Vitrin adresi; vitrin henüz olmadığından türetilmiş gösterim değeridir. */
  address: string;
  seoTitle: string;
  seoDescription: string;
  redirects: SeoRedirectDto[];
}

export interface SeoListDto {
  total: number;
  items: SeoRowDto[];
}
