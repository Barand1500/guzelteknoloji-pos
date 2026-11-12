import { z } from 'zod';

/**
 * Mobil Bildirimler ekranının ortak sözleşmesi (API + ekran). Bildirimler işletme kapsamında
 * `bildirimler` tablosunda tutulur; ekran gönderim/planlama/iptal yapar, teslim altyapısı
 * (FCM vb.) ayrı bir katmandır.
 */

export const NOTIFICATION_STATUSES = ['sent', 'scheduled', 'failed', 'cancelled'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export const notificationStatusSchema = z.enum(NOTIFICATION_STATUSES);

/** Yerel duvar saati biçimi: 2026-11-12T18:00 (saniye yok). */
export const localStampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Zaman biçimi geçersiz.');

export const notificationDraftSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, 'Bildirim başlığı gerekli.')
    .max(60, 'Başlık en çok 60 karakter olmalı.'),
  text: z.string().trim().max(240, 'Metin en çok 240 karakter olmalı.'),
  /** Boş dizi: tüm müşterilere gider. */
  customerIds: z
    .array(z.string().regex(/^\d+$/, 'Geçersiz müşteri kimliği.'))
    .max(1000, 'En çok 1000 müşteri seçilebilir.'),
  /** Boş (null): hemen gönderilir (sunucu 1 dakika içinde kuyruğa alır). */
  sendAt: localStampSchema.nullable(),
});
export type NotificationDraftInput = z.infer<typeof notificationDraftSchema>;

export interface MobileNotificationDto {
  id: string;
  title: string;
  text: string;
  /** Gönderim (ya da planlanan) zamanı: YYYY-MM-DDTHH:mm (yerel). */
  at: string;
  status: NotificationStatus;
  auto: boolean;
  /** null: tüm müşteriler; sayı: seçilen müşteri sayısı. */
  audience: number | null;
}
