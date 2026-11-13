import {
  MESSAGE_EVENTS,
  messageTemplatesSchema,
  renderMessage,
  templateVariables,
} from '@gt/shared';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client';
import { normalizePhone } from '../workspace/netgsm';
import type { OrderMessageHandler } from './order-message-event';

const object = (value: Prisma.JsonValue | undefined) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

/** Kuyruk satışla aynı transaction'da yazılır; dış servise burada bağlanılmaz. */
export const enqueueOrderMessages: OrderMessageHandler = async (tx, event) => {
  const settings = await tx.isletmeAyari.findMany({
    where: {
      businessId: event.businessId,
      section: { in: ['smtp', 'sms', 'site_eposta_sablonlari', 'site_sms_sablonlari'] },
    },
  });
  const values = (section: string) =>
    object(settings.find((row) => row.section === section)?.values);
  const candidates = (['email', 'sms'] as const).flatMap((channel) => {
    if (values(channel === 'email' ? 'smtp' : 'sms').enabled !== 'true') return [];
    const raw = values(
      channel === 'email' ? 'site_eposta_sablonlari' : 'site_sms_sablonlari',
    ).sablonlar;
    try {
      const parsed: unknown = JSON.parse(typeof raw === 'string' ? raw : '[]');
      if (!Array.isArray(parsed)) return [];
      const matching = parsed.filter(
        (row) => row && typeof row === 'object' && row.event === event.event,
      );
      // Hatalı/çakışan eski veriler müşteri mesajı oluşturmaz; satış engellenmez.
      const result = messageTemplatesSchema(channel).safeParse(matching);
      return result.success && result.data.length === 1
        ? [{ channel, template: result.data[0]! }]
        : [];
    } catch {
      return [];
    }
  });
  if (!candidates.length) return;
  const order = await tx.siparis.findFirst({
    where: { id: event.orderId, businessId: event.businessId },
    include: { musteri: true, business: true },
  });
  if (!order) return;
  const request = event.returnId
    ? await tx.iadeTalebi.findFirst({
        where: { id: event.returnId, businessId: event.businessId, siparisId: order.id },
      })
    : null;
  const definitions = await tx.siteSablonDegiskeni.findMany({
    where: { isletmeId: event.businessId, modul: { in: ['Siparişler', 'Sistem'] } },
    include: { alanlar: true },
  });
  const eventLabel = MESSAGE_EVENTS.find((item) => item.value === event.event)!.label;
  const base: Record<string, string> = {
    adsoyad: order.musteriAdi,
    siparisno: order.siparisNo,
    siparistutari: `${order.kdvDahilToplam.toFixed(2)} TL`,
    siparistarihi: order.tarih.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
    siparisdurumu: eventLabel,
    isletmeadi: order.business.name,
    ...(request ? { iadetutari: `${request.iadeTutari?.toFixed(2) ?? '0.00'} TL` } : {}),
  };
  for (const { channel, template } of candidates) {
    const customer =
      order.musteri?.businessId === event.businessId && order.musteri.durum ? order.musteri : null;
    const recipient =
      channel === 'email'
        ? (customer?.eposta.trim() ?? '')
        : (normalizePhone(customer?.telefon ?? '') ?? '');
    const validRecipient =
      channel === 'email' ? z.email().safeParse(recipient).success : !!recipient;
    let text = '',
      subject = '',
      status = validRecipient ? 'pending' : 'skipped',
      error: string | null = validRecipient ? null : 'ALICI_EKSIK';
    try {
      const fields = definitions
        .filter((row) => row.tur === (channel === 'email' ? 'E-Posta' : 'Sms'))
        .flatMap((row) =>
          row.alanlar.map((field) => ({ column: field.dbSutun, code: field.degisken })),
        );
      const variables = templateVariables(base, fields);
      text = renderMessage(template.text, variables);
      subject =
        channel === 'email'
          ? renderMessage(template.subject ?? '', variables).replace(/[\r\n]/g, ' ')
          : '';
      if (text.length > (channel === 'email' ? 128000 : 8000) || subject.length > 500)
        throw new Error('MESAJ_UZUN');
    } catch {
      status = 'failed';
      error = 'SABLON_DEGISKENI_VEYA_UZUNLUK';
    }
    await tx.sablonGonderimi.createMany({
      data: [
        {
          isletmeId: event.businessId,
          olayAnahtari: event.key,
          olay: event.event,
          kanal: channel,
          alici: recipient,
          konu: subject,
          icerik: text,
          durum: status,
          hataKodu: error,
        },
      ],
      skipDuplicates: true,
    });
  }
};
