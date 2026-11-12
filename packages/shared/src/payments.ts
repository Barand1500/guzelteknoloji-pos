import { z } from 'zod';

/** Tanımlamalar › Ödeme Şekilleri sözleşmesi (arayüz: features/payments/types.ts). */

export const PAYMENT_ICON_KEYS = [
  'card',
  'bank',
  'store',
  'file',
  'delivery',
  'wallet',
  'cash',
  'qr',
] as const;
export type PaymentIconKey = (typeof PAYMENT_ICON_KEYS)[number];

export const paymentDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Ödeme şekli adı gerekli.').max(120),
  icon: z.enum(PAYMENT_ICON_KEYS).nullable(),
  /** Yüklenen görsel: data URL (en çok ~2 MB) ya da kayıtlı görselin adresi. */
  iconUrl: z.string().max(3_000_000).nullable(),
  isDefault: z.boolean(),
  priceList: z.string().trim().max(120),
  noShipping: z.boolean(),
  allowAdjust: z.boolean(),
});
export type PaymentDraftInput = z.infer<typeof paymentDraftSchema>;

export const paymentActiveSchema = z.strictObject({ active: z.boolean() });

export interface PaymentMethodDto {
  id: string;
  name: string;
  icon: PaymentIconKey | null;
  iconUrl: string | null;
  active: boolean;
  isDefault: boolean;
  /** Fiyat seçimi: boş = müşterinin kendi fiyat listesi. */
  priceList: string;
  noShipping: boolean;
  allowAdjust: boolean;
}
