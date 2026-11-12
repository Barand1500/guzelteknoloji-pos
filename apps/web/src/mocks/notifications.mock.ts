/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/notifications/services içe aktarır.
 */
import { localStamp, type MobileNotification } from '../features/notifications/types';

const DAY = 86400000;

/** Bugüne göre göreli tarihli örnek bildirimler (hep "taze" görünür). */
export function notificationSeeds(): MobileNotification[] {
  const now = Date.now();
  const at = (daysAgo: number, h = 14, m = 20) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(h, m, 0, 0);
    return localStamp(d);
  };
  const future = (days: number, h: number) => {
    const d = new Date(now + days * DAY);
    d.setHours(h, 0, 0, 0);
    return localStamp(d);
  };
  const auto = (id: number, title: string, text: string, daysAgo: number, status: MobileNotification['status'] = 'sent'): MobileNotification => ({
    id: `n${id}`,
    title,
    text,
    at: at(daysAgo, 9 + (id % 12), (id * 7) % 60),
    status,
    auto: true,
    audience: 1,
  });
  const names = ['BEYDE SÜT SANAYİ A.Ş', 'Arif Erkmen', 'Meryem VEHBİ', 'Aykut KARTAL', 'MURAT KAYGISIZ', 'NOKTA BİLGİSAYAR'];
  const rows: MobileNotification[] = [
    {
      id: 'p1',
      title: 'Yılsonu kampanyası başladı',
      text: 'Tüm POS ürünlerinde 31 Aralık’a kadar %10 indirim. Fırsatları kaçırmayın!',
      at: future(2, 10),
      status: 'scheduled',
      auto: false,
      audience: null,
    },
    {
      id: 'p2',
      title: 'Bayi toplantısı hatırlatma',
      text: 'Cuma günü saat 15:00’te bayi toplantımız var. Katılımınızı bekleriz.',
      at: future(5, 9),
      status: 'scheduled',
      auto: false,
      audience: 4,
    },
    {
      id: 'm1',
      title: 'Yeni ürünler geldi',
      text: 'Kablosuz barkod okuyucu ve termal yazıcı serisi stoklarımızda. Hemen inceleyin.',
      at: at(3, 11, 5),
      status: 'sent',
      auto: false,
      audience: null,
    },
    {
      id: 'm2',
      title: 'Hafta sonu kargo ücretsiz',
      text: 'Cumartesi ve Pazar günü verilen tüm siparişlerde kargo ücretsiz.',
      at: at(9, 10, 0),
      status: 'sent',
      auto: false,
      audience: null,
    },
    {
      id: 'm3',
      title: 'Fiyat listemiz güncellendi',
      text: 'Toptan fiyat listemiz yenilendi. Güncel fiyatları uygulamadan görebilirsiniz.',
      at: at(14, 16, 30),
      status: 'failed',
      auto: false,
      audience: 12,
    },
  ];
  names.forEach((n, i) => {
    rows.push(
      auto(
        10 + i,
        'Ödeme bekleniyor',
        `Merhaba ${n}; 20250000${30 - i} numaralı siparişinizi aldık. Aşağıdaki iban bilgilerine lütfen ${(10399 + i * 5120).toLocaleString('tr-TR')},00 TL ödeme göndermenizi bekliyoruz.`,
        4 + i * 6,
      ),
    );
    rows.push(
      auto(
        30 + i,
        'Siparişiniz teslim edildi!',
        `Sayın ${n}, 20250000${10 + i} numaralı siparişiniz teslim edilmiştir. Bizi tercih ettiğiniz için teşekkür ederiz!`,
        2 + i * 9,
      ),
    );
    if (i % 2 === 0)
      rows.push(
        auto(
          50 + i,
          'Siparişiniz iptal edildi!',
          `Sayın ${n}; 20250000${i + 3} numaralı siparişiniz iptal edilmiştir.`,
          7 + i * 11,
        ),
      );
  });
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
