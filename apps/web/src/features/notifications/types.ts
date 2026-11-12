/**
 * Bildirimler › Mobil Bildirimler (müşterilerin mobil uygulamasına giden anlık bildirimler).
 *
 * Sunucu sözleşmesi (uç yoksa 404 → ekranda örnek veri; gönderim yalnızca ekranda):
 *  - GET  /api/bildirimler/mobil                 → MobileNotification[] (yeniden eskiye)
 *  - POST /api/bildirimler/mobil                 gövde NotificationDraft → MobileNotification
 *                                                 (sendAt boşsa 1 dakika içinde gönderilir, doluysa o zamana planlanır)
 *  - POST /api/bildirimler/mobil/:id/iptal       planlanmış bildirimi iptal eder
 * `auto: true`: sistemin sipariş olaylarında kendiliğinden gönderdikleri (ödeme bekleniyor, iptal, teslim…).
 */
export type NotificationStatus = 'sent' | 'scheduled' | 'failed' | 'cancelled';

export interface MobileNotification {
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

export interface NotificationDraft {
  title: string;
  text: string;
  /** Boş: tüm müşteriler. */
  customerIds: string[];
  /** Boş (null): hemen. */
  sendAt: string | null;
}

export const STATUS_LABEL: Record<NotificationStatus, string> = {
  sent: 'Gönderildi',
  scheduled: 'Planlandı',
  failed: 'Gönderilemedi',
  cancelled: 'İptal edildi',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel zamanı YYYY-MM-DDTHH:mm yapar. */
export const localStamp = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 16.06.2026 12:19 */
export function formatStamp(at: string): { date: string; time: string } {
  const [d = '', t = ''] = at.split('T');
  const [y, m, day] = d.split('-');
  return { date: `${day}.${m}.${y}`, time: t };
}

/** Planlama kısayolları (şu ana göre): "Bugün 18:00", "Yarın 09:00", "Cumartesi 10:00". */
export function quickSlots(now: Date): { label: string; at: string }[] {
  const at = (days: number, h: number, min = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, min);
    return localStamp(d);
  };
  const out: { label: string; at: string }[] = [];
  if (now.getHours() < 17) out.push({ label: 'Bugün 18:00', at: at(0, 18) });
  out.push({ label: 'Yarın 09:00', at: at(1, 9) });
  const toSat = (6 - now.getDay() + 7) % 7 || 7;
  out.push({ label: 'Cumartesi 10:00', at: at(toSat, 10) });
  return out;
}

export function isPast(at: string, now: Date): boolean {
  return at <= localStamp(now);
}
