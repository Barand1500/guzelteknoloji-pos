/** Ağaç düz liste olarak tutulur: üst kategorisi olmayan (parentId: null) kategori ana kategoridir. */
export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  /** Yüklenen görselin adresi; yoksa ad baş harfleriyle bir rozet gösterilir. */
  imageUrl: string | null;
  active: boolean;
  /** Gizli kategori mağazada listelenmez ama yönetimde görünür. */
  hidden: boolean;
  seoTitle: string;
  seoDescription: string;
  /** Doğrudan bu kategorideki ürün sayısı (sunucudan hesaplanır). */
  productCount: number;
  /** Doğrudan alt kategori sayısı (sunucudan hesaplanır). */
  childCount: number;
}

/** Kategori ekleme/düzenleme formunun değerleri. */
export interface CategoryDraft {
  parentId: string | null;
  name: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
  hidden: boolean;
  seoTitle: string;
  seoDescription: string;
}

/** "Ürünlere Tanımla" ekranında listelenen ürünün kısa özeti. */
export interface CategoryProductRef {
  id: string;
  code: string;
  name: string;
  barcode: string;
  categoryId: string | null;
  categoryIds?: string[];
}

export const emptyCategoryDraft = (parentId: string | null = null): CategoryDraft => ({
  parentId,
  name: '',
  description: '',
  imageUrl: null,
  active: true,
  hidden: false,
  seoTitle: '',
  seoDescription: '',
});
