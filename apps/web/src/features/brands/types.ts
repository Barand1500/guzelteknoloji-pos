import type { BrandDraft } from '@gt/shared';
export type { Brand, BrandDraft, ProductRef } from '@gt/shared';

export const emptyBrandDraft: BrandDraft = {
  name: '',
  description: '',
  logoUrl: null,
  active: true,
  seoTitle: '',
  seoDescription: '',
};
