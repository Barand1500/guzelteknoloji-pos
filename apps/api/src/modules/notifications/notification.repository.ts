import type { MobileNotificationDto, NotificationDraftInput, NotificationStatus } from '@gt/shared';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

/** Türkiye yerel duvar saatini YYYY-MM-DDTHH:mm olarak verir (anlık gönderimler için). */
function istanbulStamp(now = new Date()) {
  return now
    .toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul', hour12: false })
    .slice(0, 16)
    .replace(' ', 'T');
}

function toDto(row: {
  id: number;
  baslik: string;
  metin: string;
  gonderimZamani: Date;
  durum: string;
  otomatik: boolean;
  tumMusteriler: boolean;
  _count: { alicilar: number };
}): MobileNotificationDto {
  return {
    id: String(row.id),
    title: row.baslik,
    text: row.metin,
    // Yerel damga olarak girilir ve aynı biçimde geri okunur (YYYY-MM-DDTHH:mm).
    at: row.gonderimZamani.toISOString().slice(0, 16),
    status: row.durum as NotificationStatus,
    auto: row.otomatik,
    audience: row.tumMusteriler ? null : row._count.alicilar,
  };
}

/** Mobil bildirimler: işletme kapsamlı kayıt, planlama ve iptal. Teslim (FCM) ayrı katmandır. */
export class NotificationRepository {
  constructor(private db: PrismaClient) {}

  async list(businessId: number): Promise<MobileNotificationDto[]> {
    const rows = await this.db.bildirim.findMany({
      where: { isletmeId: businessId },
      include: { _count: { select: { alicilar: true } } },
      orderBy: [{ gonderimZamani: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toDto);
  }

  async create(businessId: number, input: NotificationDraftInput): Promise<MobileNotificationDto> {
    const ids = [...new Set(input.customerIds.map(Number))];
    if (ids.length > 0) {
      const valid = await this.db.musteri.count({
        where: { id: { in: ids }, businessId },
      });
      if (valid !== ids.length)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Seçilen müşterilerden biri bulunamadı.');
    }
    const all = ids.length === 0;
    // Damga yerel duvar saatidir; aynı metin geri okunabilsin diye UTC etiketiyle saklanır.
    const at = input.sendAt
      ? new Date(`${input.sendAt}:00.000Z`)
      : new Date(`${istanbulStamp()}:00.000Z`);
    const created = await this.db.bildirim.create({
      data: {
        isletmeId: businessId,
        baslik: input.title,
        metin: input.text,
        gonderimZamani: at,
        durum: input.sendAt ? 'scheduled' : 'sent',
        otomatik: false,
        tumMusteriler: all,
        alicilar: all
          ? undefined
          : { createMany: { data: ids.map((musteriId) => ({ musteriId })) } },
      },
      include: { _count: { select: { alicilar: true } } },
    });
    return toDto(created);
  }

  async cancel(businessId: number, id: number): Promise<MobileNotificationDto> {
    const row = await this.db.bildirim.findFirst({
      where: { id, isletmeId: businessId },
      include: { _count: { select: { alicilar: true } } },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Bildirim bulunamadı.');
    if (row.durum !== 'scheduled')
      throw new HttpError(400, 'VALIDATION_ERROR', 'Yalnızca planlanmış bildirim iptal edilebilir.');
    const updated = await this.db.bildirim.update({
      where: { id },
      data: { durum: 'cancelled' },
      include: { _count: { select: { alicilar: true } } },
    });
    return toDto(updated);
  }
}
