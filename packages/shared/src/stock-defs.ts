import { z } from 'zod';

/** Tanımlamalar › Cari ve Stok Tanımları. */

export const NAME_LISTS = ['cari-tipleri', 'stok-tipleri', 'olcu-birimleri'] as const;
export type NameList = (typeof NAME_LISTS)[number];
export const nameListSchema = z.enum(NAME_LISTS);

export const nameDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Ad gerekli.').max(120),
  shortName: z.string().trim().max(20),
});
export type NameDraftInput = z.infer<typeof nameDraftSchema>;

export const PRICE_LIST_KINDS = ['general', 'special'] as const;
export type PriceListKind = (typeof PRICE_LIST_KINDS)[number];

const dateText = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı.')
  .nullable();

export const priceListDraftSchema = z
  .strictObject({
    name: z.string().trim().min(1, 'Liste adı gerekli.').max(80),
    kind: z.enum(PRICE_LIST_KINDS),
    start: dateText,
    end: dateText,
  })
  .superRefine((value, ctx) => {
    if (value.kind !== 'special') return;
    if (value.start && value.end && value.start > value.end)
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'Bitiş tarihi başlangıçtan önce olamaz.' });
  });
export type PriceListDraftInput = z.infer<typeof priceListDraftSchema>;

export interface NameItemDto {
  id: string;
  name: string;
  shortName: string;
}
export interface PriceListDto {
  id: string;
  name: string;
  kind: PriceListKind;
  start: string | null;
  end: string | null;
  isDefault: boolean;
}
