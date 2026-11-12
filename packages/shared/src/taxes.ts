import { z } from 'zod';

/** Tanımlamalar › Vergiler: tür + oranlar ve vergi daireleri. */

export const taxTypeDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Vergi adı gerekli.').max(60),
  shortName: z.string().trim().min(1, 'Kısa ad gerekli.').max(12),
});
export type TaxTypeDraftInput = z.infer<typeof taxTypeDraftSchema>;

export const taxRateSchema = z.strictObject({
  rate: z.number().finite().min(0, 'Oran 0–100 arasında olmalı.').max(100),
});
export type TaxRateInput = z.infer<typeof taxRateSchema>;

export const taxOfficeDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Vergi dairesi adı gerekli.').max(120),
});
export type TaxOfficeDraftInput = z.infer<typeof taxOfficeDraftSchema>;

export interface TaxTypeDto {
  id: string;
  name: string;
  shortName: string;
  rates: number[];
}
export interface TaxOfficeDto {
  id: string;
  name: string;
  builtin: boolean;
}

export const BUILTIN_TAX_OFFICE = 'Belirtilmemiş';
