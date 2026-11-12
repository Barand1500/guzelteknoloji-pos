import type { SeoKind, SeoListDto, SeoRedirectDto, SeoRowDto, SeoSaveInput } from '@gt/shared';

export type { SeoKind, SeoListDto, SeoRedirectDto, SeoRowDto, SeoSaveInput };

/** SEO Ayarları'nın sekmeleri; her sekme bir kayıt türüdür (sabit sayfa kayıtları henüz yoktur). */
export interface SeoTab {
  id: SeoKind;
  label: string;
  /** Sayfalama ve boş durum metinlerinde kullanılan ad. */
  noun: string;
}

export const SEO_TABS: readonly SeoTab[] = [
  { id: 'kategori', label: 'Kategori', noun: 'kategori' },
  { id: 'marka', label: 'Marka', noun: 'marka' },
  { id: 'firsat', label: 'Fırsat', noun: 'fırsat' },
  { id: 'urun', label: 'Ürün', noun: 'ürün' },
  { id: 'sabit-sayfa', label: 'Sabit Sayfa', noun: 'sabit sayfa' },
];

export const seoTab = (kind: string | null): SeoTab =>
  SEO_TABS.find((t) => t.id === kind) ?? SEO_TABS[0]!;

/** Yönlendirme ekleme formunun verisi (hedef satır, ekranda seçilidir). */
export interface SeoRedirectDraft {
  from: string;
  seoTitle: string;
  seoDescription: string;
}
