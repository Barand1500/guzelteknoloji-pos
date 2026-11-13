import { z } from 'zod';

export const MESSAGE_EVENTS = [
  { value: 'order.created', label: 'Sipariş Alındı' },
  { value: 'order.preparing', label: 'Hazırlanıyor' },
  { value: 'order.shipped', label: 'Kargoya Verildi' },
  { value: 'order.delivered', label: 'Teslim Edildi' },
  { value: 'order.cancelled', label: 'Sipariş İptal Edildi' },
  { value: 'payment.collected', label: 'Ödeme Alındı' },
  { value: 'return.created', label: 'İade Talebi Alındı' },
  { value: 'return.approved', label: 'İade Kabul Edildi' },
  { value: 'return.rejected', label: 'İade Reddedildi' },
  { value: 'return.completed', label: 'İade Tamamlandı' },
  { value: 'exchange.approved', label: 'Değişim Kabul Edildi' },
  { value: 'exchange.rejected', label: 'Değişim Reddedildi' },
] as const;
export type MessageEvent = (typeof MESSAGE_EVENTS)[number]['value'];
export const MESSAGE_VARIABLES = [
  { key: 'adsoyad', label: 'Müşteri adı', aliases: ['ad', 'musteriAdi', 'musteri.ad'] },
  { key: 'siparisno', label: 'Sipariş numarası', aliases: ['siparisNo', 'siparis.siparisNo'] },
  {
    key: 'siparistutari',
    label: 'Sipariş tutarı',
    aliases: ['kdvDahilToplam', 'siparis.kdvDahilToplam'],
  },
  { key: 'siparistarihi', label: 'Sipariş tarihi', aliases: ['tarih', 'siparis.tarih'] },
  { key: 'siparisdurumu', label: 'Sipariş durumu', aliases: ['durum', 'siparis.durum'] },
  { key: 'isletmeadi', label: 'İşletme adı', aliases: ['isletme.name'] },
  { key: 'iadetutari', label: 'İade tutarı', aliases: ['iadeTutari', 'iade.iadeTutari'] },
] as const;
export const EMAIL_TEMPLATE_LIMIT = 250000;
export const SMS_TEMPLATE_LIMIT = 20000;
export const messageTemplatesSchema = (channel: 'sms' | 'email') =>
  z
    .array(
      z
        .object({
          id: z.union([z.string().min(1).max(100), z.number()]).optional(),
          name: z.string().trim().min(1).max(120),
          text: z
            .string()
            .min(1)
            .max(channel === 'email' ? 64000 : 4000),
          subject: channel === 'email' ? z.string().trim().min(1).max(250) : z.string().optional(),
          event: z
            .union([z.enum(MESSAGE_EVENTS.map((event) => event.value)), z.literal('')])
            .optional(),
        })
        .passthrough(),
    )
    .max(100)
    .superRefine((rows, ctx) => {
      const events = rows.map((row) => row.event).filter(Boolean);
      if (new Set(events).size !== events.length)
        ctx.addIssue({
          code: 'custom',
          message: 'Aynı gönderim olayı için yalnızca bir şablon seçin.',
        });
    });
export function templateVariables(
  values: Record<string, string>,
  fields: readonly { column: string; code: string }[] = [],
) {
  const result: Record<string, string> = Object.create(null);
  for (const variable of MESSAGE_VARIABLES)
    if (Object.hasOwn(values, variable.key)) result[variable.key] = values[variable.key]!;
  for (const field of fields) {
    const source = MESSAGE_VARIABLES.find(
      (variable) =>
        variable.key === field.column.replace(/^#|#$/g, '') ||
        (variable.aliases as readonly string[]).includes(field.column),
    );
    const code = field.code.replace(/^#|#$/g, '');
    if (
      source &&
      /^[\p{L}\p{N}_-]+$/u.test(code) &&
      !Object.hasOwn(result, code) &&
      Object.hasOwn(values, source.key)
    )
      result[code] = values[source.key]!;
  }
  return result;
}
export function renderMessage(text: string, variables: Record<string, string>): string {
  return text.replace(/#([\p{L}\p{N}_-]+)#/gu, (_match, code: string) => {
    if (!Object.hasOwn(variables, code)) throw new Error(`Desteklenmeyen değişken: #${code}#`);
    return variables[code]!;
  });
}
