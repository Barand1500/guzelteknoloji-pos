import { z } from 'zod';

/** Tanımlamalar › Resmi Tatil Günleri sözleşmesi (arayüz: features/holidays/types.ts). */

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    // Takvimde olmayan gün (ör. 31 Şubat) sessizce kaymasın: geri yazım aynı olmalı.
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Geçerli bir tarih girin.');

export const customHolidayDraftSchema = z
  .strictObject({
    name: z.string().trim().min(1, 'Tatil adı gerekli.').max(120),
    start: isoDay,
    end: isoDay,
  })
  .refine((value) => value.end >= value.start, {
    message: 'Bitiş tarihi başlangıçtan önce olamaz.',
  });
export type CustomHolidayDraftInput = z.infer<typeof customHolidayDraftSchema>;

export interface OfficialDayDto {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  /** Tarihi henüz kesin değil (dinî bayramlarda ilerideki yıllar için). */
  tentative: boolean;
}

export interface CustomHolidayDto {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface HolidaysDto {
  official: OfficialDayDto[];
  custom: CustomHolidayDto[];
  /** Resmî günler dış servisten alınamadı; eldeki yedek liste döndürüldü. */
  offline: boolean;
}
