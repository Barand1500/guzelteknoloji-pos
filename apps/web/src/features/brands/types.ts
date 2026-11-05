export interface Brand {
  id: string;
  name: string;
  description: string;
  /** Yüklenen logonun adresi; yoksa ad baş harfleriyle bir rozet gösterilir. */
  logoUrl: string | null;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
  /** Bu markayı kullanan ürün sayısı (sunucudan hesaplanır). */
  productCount: number;
}

/** Marka ekleme/düzenleme formunun değerleri. */
export interface BrandDraft {
  name: string;
  description: string;
  logoUrl: string | null;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
}

/** "Ürünlere Tanımla" ekranında listelenen ürünün kısa özeti. */
export interface ProductRef {
  id: string;
  code: string;
  name: string;
  barcode: string;
  brandId: string | null;
}

export const emptyBrandDraft: BrandDraft = {
  name: '',
  description: '',
  logoUrl: null,
  active: true,
  seoTitle: '',
  seoDescription: '',
};
