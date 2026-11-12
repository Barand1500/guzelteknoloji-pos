import { z } from 'zod';

/** Tanımlamalar › Para Birimleri ve Kargo için ortak sözleşme (API + ekran). */

export const RATE_TYPES = ['dovizAlis', 'dovizSatis', 'efektifAlis', 'efektifSatis'] as const;
export type RateType = (typeof RATE_TYPES)[number];

export const currencyDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Para birimi adı gerekli.').max(60),
  shortName: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Kısa ad 2–5 harf olmalı (ör. USD).'),
  symbol: z.string().trim().min(1, 'Sembol gerekli.').max(8),
  rateType: z.enum(RATE_TYPES),
  auto: z.boolean(),
  rate: z.number().finite().min(0).max(1_000_000_000),
  apiUrl: z.string().trim().max(300),
});
export type CurrencyDraftInput = z.infer<typeof currencyDraftSchema>;

export const currencyActiveSchema = z.strictObject({ active: z.boolean() });

export const tierSchema = z.strictObject({
  to: z.number().int().min(0).max(1_000_000).nullable(),
  price: z.number().finite().min(0).max(1_000_000),
  perUnit: z.boolean(),
});

export const priceTableSchema = z
  .strictObject({
    vat: z.number().int().min(0).max(100),
    desi: z.array(tierSchema).min(1).max(50),
    weight: z.array(tierSchema).min(1).max(50),
  })
  .superRefine((value, ctx) => {
    for (const key of ['desi', 'weight'] as const) {
      const tiers = value[key];
      let previous = -1;
      tiers.forEach((tier, index) => {
        const last = index === tiers.length - 1;
        if (last && tier.to !== null)
          ctx.addIssue({ code: 'custom', path: [key, index], message: 'Son basamak açık olmalı.' });
        if (!last && (tier.to === null || tier.to <= previous))
          ctx.addIssue({
            code: 'custom',
            path: [key, index],
            message: 'Basamak bitişleri artan olmalı.',
          });
        if (!last && tier.perUnit)
          ctx.addIssue({
            code: 'custom',
            path: [key, index],
            message: 'Birim başı fiyat yalnızca son basamakta olur.',
          });
        if (tier.to !== null) previous = tier.to;
      });
    }
  });
export type PriceTableInput = z.infer<typeof priceTableSchema>;

export const carrierDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Firma adı gerekli.').max(120),
  shortName: z.string().trim().min(1, 'Kısa ad gerekli.').max(12),
  apiUrl: z.string().trim().max(300),
});
export type CarrierDraftInput = z.infer<typeof carrierDraftSchema>;

export const locationDraftSchema = z.strictObject({
  parentId: z.string().trim().regex(/^\d+$/).nullable(),
  name: z.string().trim().min(1, 'Konum adı gerekli.').max(120),
});
export const locationRenameSchema = z.strictObject({
  name: z.string().trim().min(1, 'Konum adı gerekli.').max(120),
});

export const LIST_KEYS = [
  'gonderi-tipleri',
  'kargo-tipleri',
  'alim-sekilleri',
  'teslimat-sekilleri',
  'teslimat-modelleri',
  'ulastirma-turleri',
  'yasak-kargolar',
] as const;
export type ListKeyInput = (typeof LIST_KEYS)[number];
export const listKeySchema = z.enum(LIST_KEYS);

export const definitionDraftSchema = z.strictObject({
  title: z.string().trim().min(1, 'Başlık gerekli.').max(120),
  short: z.string().trim().max(60),
  text: z.string().trim().max(1000),
});
export type DefinitionDraftInput = z.infer<typeof definitionDraftSchema>;

export interface CurrencyDto {
  id: string;
  name: string;
  shortName: string;
  symbol: string;
  base: boolean;
  rateType: RateType;
  auto: boolean;
  rate: number;
  apiUrl: string;
  active: boolean;
}

export interface TierDto {
  to: number | null;
  price: number;
  perUnit: boolean;
}
export interface CarrierDto {
  id: string;
  name: string;
  shortName: string;
  apiUrl: string;
  prices: { vat: number; desi: TierDto[]; weight: TierDto[] };
}
export interface LocationDto {
  id: string;
  parentId: string | null;
  name: string;
  level: number;
}
export interface DefinitionDto {
  id: string;
  title: string;
  short: string;
  text: string;
}
