/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/home/services/home.demo.ts içe aktarır.
 */
import type {
  HomeData,
  HomePeriod,
  PaymentMethod,
  RankedProduct,
  RecentOrder,
  RevenuePoint,
} from '../features/home/types';

const wave = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => 55 + ((i * 37 + seed * 11) % 45) + Math.sin(i + seed) * 12);

const LABELS: Record<HomePeriod, string[]> = {
  today: ['09', '11', '13', '15', '17', '19'],
  week: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  month: ['1. Hf', '2. Hf', '3. Hf', '4. Hf'],
  year: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  all: ['2021', '2022', '2023', '2024', '2025', '2026'],
};
const SALES: Record<HomePeriod, number> = {
  today: 18450,
  week: 96300,
  month: 312800,
  year: 748187,
  all: 910211,
};
const PREVIOUS: Record<HomePeriod, number> = {
  today: 21400,
  week: 81250,
  month: 295100,
  year: 602400,
  all: 0,
};
/** [sipariş, müşteri, ürün] */
const COUNTS: Record<HomePeriod, [number, number, number]> = {
  today: [3, 3, 2],
  week: [9, 8, 7],
  month: [27, 22, 18],
  year: [38, 36, 31],
  all: [43, 36, 228],
};

function revenue(period: HomePeriod): RevenuePoint[] {
  const labels = LABELS[period];
  const weights = wave(labels.length, labels.length);
  const sum = weights.reduce((a, b) => a + b, 0);
  return labels.map((label, i) => {
    const sales = Math.round(((SALES[period] * weights[i]!) / sum) * 100) / 100;
    return { label, sales, cost: Math.round(sales * (0.72 + ((i * 7) % 9) / 100)) };
  });
}

const product = (id: string, name: string, code: string, count: number): RankedProduct => ({
  id,
  name,
  code,
  count,
});

const order = (
  no: string,
  date: string,
  customer: string,
  amount: number,
  status: RecentOrder['status'],
): RecentOrder => ({ id: `o${no}`, no, date, customer, amount, status });

const recentOrders: RecentOrder[] = [
  order('2025000045', '2026-10-31T11:22:00', 'NOKTA BİLGİSAYAR', 23371.55, 'delivered'),
  order('2025000044', '2026-10-23T14:45:00', 'Murat Kaygısız', 12823.27, 'delivered'),
  order('2025000043', '2026-09-25T17:11:00', 'Murat Kaygısız', 30927.49, 'pending'),
  order('2025000042', '2026-09-22T10:27:00', 'Murat Sarı', 9090.58, 'delivered'),
  order('2025000041', '2026-09-16T16:48:00', 'Murat Sarı', 9357.77, 'cancelled'),
  order('2025000040', '2026-09-11T10:11:00', 'Aykut Kartal', 84797.63, 'delivered'),
];

const payments: PaymentMethod[] = [
  { id: 'acik', label: 'Açık Hesap', orderCount: 14, amount: 529259.95 },
  { id: 'kart', label: 'Kredi Kartı', orderCount: 26, amount: 313868.79 },
  { id: 'havale', label: 'Havale / EFT', orderCount: 9, amount: 120450 },
];

export function homeSeed(period: HomePeriod): HomeData {
  const [orders, customers, products] = COUNTS[period];
  const delivered = Math.max(1, Math.round(orders * 0.88));
  const cancelled = Math.max(0, Math.round(orders * 0.09));
  return {
    period,
    salesAmount: SALES[period],
    previousSalesAmount: PREVIOUS[period],
    trend: wave(14, period.length),
    stats: { orders, customers, products, totalSales: 910210.76 },
    revenue: revenue(period),
    orders: { delivered, cancelled, pending: Math.max(0, orders - delivered - cancelled) },
    recentOrders,
    payments,
    productRanks: {
      carts: [
        product('p1', 'PLUS Silver Kağıt Para Sayma Makinesi', 'PLUS.SILVER', 5),
        product('p2', 'INPOS M530 ECR Yeni Nesil Yazarkasa POS', '127', 3),
        product('p3', 'ZYWELL Q822 Termal Fiş Yazıcı', '160', 3),
        product('p4', 'FLEXYPOS FP-503 İ3 Dokunmatik POS', 'FLEXYPOS.FP-503', 2),
        product('p5', 'SYBLE XB-D50BT-2D El Tipi Barkod Okuyucu', '96', 2),
      ],
      favorites: [
        product('p1', 'PLUS Silver Kağıt Para Sayma Makinesi', 'PLUS.SILVER', 2),
        product('p6', 'PAVO N96 Smart Android Mobil POS', 'PAVO.N96', 2),
        product('p7', 'ANYPAY LS10D-ACS Terazi POS', '194', 2),
        product('p8', 'ANYPAY TS9D-ACS Terazi POS', '195', 2),
        product('p4', 'FLEXYPOS FP-503 İ3 Dokunmatik POS', 'FLEXYPOS.FP-503', 1),
      ],
      alarms: [
        product('p7', 'ANYPAY LS10D-ACS Terazi POS', '194', 2),
        product('p1', 'PLUS Silver Kağıt Para Sayma Makinesi', 'PLUS.SILVER', 1),
      ],
    },
  };
}
