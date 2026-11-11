/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/customers/services içe aktarır.
 */
import type { OrderStatus, ReturnKind, ReturnStatus } from '../features/orders/types';
import type {
  CartRow,
  Customer,
  CustomerDetail,
  CustomerKind,
  ProductRow,
  Review,
} from '../features/customers/types';

const customer = (
  i: number,
  name: string,
  kind: CustomerKind,
  phone: string,
  email: string,
  priceList: string,
  debt: number,
  credit: number,
  lastLogin: string | null,
  taxId = '',
  code = '',
): Customer => ({
  id: `c${i}`,
  code,
  name,
  kind,
  taxId,
  phone,
  email,
  priceList,
  customerType: kind === 'corporate' ? 'Kurumsal' : 'Son Kullanıcı',
  payments: i % 3 === 0 ? ['Kredi Kartı/Banka Kartı', 'Havale/EFT', 'Mağazada Öde'] : [],
  cardDeal: '',
  active: lastLogin !== null || i % 4 !== 0,
  userCount: kind === 'corporate' ? 2 : 1,
  lastLogin,
  debt,
  credit,
});

export const customerSeeds: Customer[] = [
  customer(
    1,
    'Yunus Durgun',
    'real',
    '(541) 258 44 72',
    'durgunyunus4@gmail.com',
    'TOPTAN',
    0,
    0,
    '2026-09-03T15:08:00',
  ),
  customer(
    2,
    'Ercan Güzel',
    'real',
    '(543) 885 11 60',
    'sitebildirim@gmail.com',
    'TOPTAN',
    0,
    0,
    null,
  ),
  customer(
    3,
    'Süleyman Ilgın',
    'real',
    '(543) 556 67 79',
    'destek@rvyazilim.com',
    'TOPTAN',
    1250,
    0,
    null,
  ),
  customer(
    4,
    'Enes Ataol',
    'real',
    '536 010 44 17',
    'ataoleness@gmail.com',
    'TOPTAN',
    0,
    0,
    null,
    '12345678901',
    '0970262255',
  ),
  customer(
    5,
    'AYFANET BİLG.DAN.TUR.SAN.LTD.ŞTİ.',
    'corporate',
    '532 567 33 62',
    'aytekin@ayfanet.net',
    'PERAKENDE',
    46060,
    0,
    null,
    '1234567890',
    '1190538572',
  ),
  customer(
    6,
    'Yusuf Bayrak',
    'real',
    '544 349 57 77',
    'yusufbayrak88@hotmail.com',
    'TOPTAN',
    0,
    2376,
    null,
    '',
    '13382212114',
  ),
  customer(
    7,
    'NOKTA BİLGİSAYAR-MURAT KARABÖCEKOĞLU',
    'corporate',
    '555 600 44 30',
    'noktabilisim2003@yahoo.com',
    'PERAKENDE',
    23371.55,
    0,
    '2026-10-27T11:54:00',
    '9876543210',
    '13666960434',
  ),
  customer(
    8,
    'MURAT SARI',
    'real',
    '555 714 18 39',
    'murat@veribilgisayar.com',
    'PERAKENDE',
    0,
    0,
    '2026-08-04T19:16:00',
    '',
    '14425555618',
  ),
  customer(
    9,
    'FAHRİ AKKOR',
    'real',
    '543 659 92 81',
    'fahri_akkor@windowslive.com',
    'FİYAT',
    0,
    0,
    '2026-11-05T08:46:00',
    '',
    '14855641622',
  ),
  customer(
    10,
    'BELPOS YAZILIM BİLGİSAYAR GÜVENLİK SİSTEMLERİ İTH.İHR.SAN.VE TİC.LTD.ŞTİ.',
    'corporate',
    '530 434 60 44',
    'info@belpos.com',
    'FİYAT',
    0,
    8420,
    null,
    '1112223334',
    '1631049139',
  ),
  customer(
    11,
    'Aykut Kartal',
    'real',
    '552 100 20 30',
    'aykut@kartal.com',
    'TOPTAN',
    84797.63,
    0,
    '2026-10-12T10:11:00',
  ),
  customer(
    12,
    'Kasa Market',
    'corporate',
    '532 111 22 33',
    'muhasebe@kasamarket.com',
    'PERAKENDE',
    0,
    0,
    '2026-11-01T09:20:00',
    '5556667778',
  ),
];

const seeded = (id: string) => [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);

const PRODUCTS: [string, string, number][] = [
  ['200', 'Zhongji Z1 Kablosuz Numaratör', 230],
  ['65', 'ANYPAY A13 İ5-15.6" Dokunmatik POS', 450],
  ['69', 'ZHONGJI AO12K 27" Android Kiosk', 1400],
  ['160', 'ZYWELL Q822 Termal Fiş Yazıcı', 3250],
  ['96', 'SYBLE XB-D50BT-2D Barkod Okuyucu', 1980],
  ['194', 'ANYPAY LS10D-ACS Terazi POS', 12400],
];

const row = (k: number, n: number): ProductRow => {
  const [code, name, net] = PRODUCTS[(k + n) % PRODUCTS.length]!;
  return {
    id: `p${k}-${n}`,
    code,
    name,
    net,
    gross: Math.round(net * 1.2 * 100) / 100,
    stock: (k + n) % 3 === 0 ? 'Sınırsız' : `${(k + n) * 2} ADET`,
  };
};

const STATUSES: OrderStatus[] = [
  'delivered',
  'shipped',
  'preparing',
  'delivered',
  'pending',
  'cancelled',
];
const RSTAT: ReturnStatus[] = ['pending', 'approved', 'completed', 'rejected'];
const REVIEW_TEXT = [
  'Çok memnun kaldım, hızlı kargo.',
  'Ürün tarif edildiği gibi.',
  'Paketleme çok özenliydi.',
  'Fiyat performans ürünü.',
];

/** Müşteriye göre deterministik örnek ayrıntı verisi. */
export function detailSeed(c: Customer): CustomerDetail {
  const s = seeded(c.id);
  const many = c.kind === 'corporate' || s % 2 === 0;
  const orders = Array.from({ length: many ? 6 : 2 }, (_, i) => ({
    id: `${c.id}-o${i}`,
    no: String(2025000045 - ((s + i * 3) % 30)),
    date: `2026-10-${String(28 - i * 3).padStart(2, '0')}T1${i}:2${i}:00`,
    total: 1500 + ((s * (i + 3)) % 40) * 900,
    paid: i % 3 !== 1,
    status: STATUSES[(s + i) % STATUSES.length]!,
  }));
  const reviews: Review[] = Array.from({ length: many ? 3 : 1 }, (_, i) => ({
    id: `${c.id}-r${i}`,
    orderNo: orders[i]?.no ?? '2025000001',
    product: PRODUCTS[(s + i) % PRODUCTS.length]![1],
    rating: 4 + (i % 2),
    text: REVIEW_TEXT[(s + i) % REVIEW_TEXT.length]!,
    date: `2026-10-${String(20 - i * 2).padStart(2, '0')}T12:00:00`,
    approved: i !== 1,
  }));
  const ledger = Array.from({ length: many ? 5 : 2 }, (_, i) => ({
    id: `${c.id}-l${i}`,
    date: `2026-10-${String(26 - i * 4).padStart(2, '0')}T10:00:00`,
    ref: i % 2 === 0 ? `Sipariş #${orders[i % orders.length]!.no}` : `Tahsilat T-${1000 + s + i}`,
    debt: i % 2 === 0 ? orders[i % orders.length]!.total : 0,
    credit: i % 2 === 1 ? 1500 + i * 700 : 0,
  }));
  return {
    users:
      c.kind === 'corporate'
        ? [
            {
              id: `${c.id}-u1`,
              name: 'Yetkili Kullanıcı',
              email: c.email,
              active: c.active,
              lastLogin: c.lastLogin,
            },
            {
              id: `${c.id}-u2`,
              name: 'Muhasebe',
              email: `muhasebe.${c.email}`,
              active: false,
              lastLogin: null,
            },
          ]
        : [
            {
              id: `${c.id}-u1`,
              name: c.name,
              email: c.email,
              active: c.active,
              lastLogin: c.lastLogin,
            },
          ],
    addresses: [
      {
        id: `${c.id}-a1`,
        title: 'Ev / Merkez',
        address: 'Yılankale Mah 88055 Büyükmangıt, Ceyhan, Adana, Türkiye',
        isDefault: true,
      },
      ...(many
        ? [
            {
              id: `${c.id}-a2`,
              title: 'Depo',
              address: 'Organize Sanayi Bölgesi 3. Cad. No:14, Kadıköy / İstanbul',
              isDefault: false,
            },
          ]
        : []),
    ],
    ledger,
    orders,
    returns: many
      ? [0, 1].map((i) => ({
          id: `${c.id}-i${i}`,
          orderNo: orders[i]!.no,
          kind: (i % 2 === 0 ? 'return' : 'exchange') as ReturnKind,
          items: 1 + i,
          date: `2026-10-${String(24 - i * 5).padStart(2, '0')}T14:10:00`,
          status: RSTAT[(s + i) % RSTAT.length]!,
        }))
      : [],
    favorites: many ? [row(s, 1), row(s, 2), row(s, 3)] : [row(s, 1)],
    cart: many
      ? ([row(s, 4), row(s, 5)] as ProductRow[]).map((r, i): CartRow => ({ ...r, qty: 1 + i }))
      : [],
    savedCarts: many
      ? [{ id: `${c.id}-s1`, name: 'Kasa yenileme listesi', date: '2026-09-18T09:30:00', items: 3 }]
      : [],
    alerts: many
      ? [{ ...row(s, 2), alert: `${Math.round(row(s, 2).net * 0.9)} ₺ altına düşünce` }]
      : [],
    reviews,
    likedReviews: many ? [reviews[0]!] : [],
    messages: many
      ? [
          {
            id: `${c.id}-m1`,
            place: 'Web Sitesi',
            subject: 'Sipariş #' + orders[0]!.no,
            text: 'Kargom ne zaman çıkar?',
            date: '2026-10-29T16:40:00',
          },
          {
            id: `${c.id}-m2`,
            place: 'İletişim Formu',
            subject: 'Fiyat teklifi',
            text: 'Toplu alımda indirim var mı?',
            date: '2026-10-02T11:05:00',
          },
        ]
      : [],
  };
}
