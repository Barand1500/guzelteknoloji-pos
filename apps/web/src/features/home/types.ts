/** Anasayfa özet dönemi. */
export type HomePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export const PERIODS: { value: HomePeriod; label: string }[] = [
  { value: 'today', label: 'Bugün' },
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'year', label: 'Bu Yıl' },
  { value: 'all', label: 'Tümü' },
];

export type OrderStatus = 'delivered' | 'cancelled' | 'pending';

export interface RankedProduct {
  id: string;
  name: string;
  code: string;
  /** Sepette bekleyen / favoriye alan / fiyat alarmı kuran kişi sayısı. */
  count: number;
}

export interface RevenuePoint {
  /** Eksen etiketi (saat, gün, ay ya da yıl). */
  label: string;
  /** Satış ve maliyet (kâr = satış − maliyet). Tutarlar TL. */
  sales: number;
  cost: number;
  costUnknown?: boolean;
}

export interface RecentOrder {
  id: string;
  no: string;
  /** ISO tarih-saat. */
  date: string;
  customer: string;
  amount: number;
  status: OrderStatus;
}

export interface PaymentMethod {
  id: string;
  label: string;
  orderCount: number;
  amount: number;
}

/**
 * Anasayfa verisi (sunucu sözleşmesi): `GET /api/anasayfa?donem=today|week|month|year|all`.
 * Tutarlar TL; kâr istemcide (satış − maliyet) hesaplanır.
 */
export interface HomeData {
  period: HomePeriod;
  /** true: sunucu henüz hazır değil, ekrandaki sayılar örnek veridir. */
  sample?: boolean;
  /** Dönemin cirosu ve bir önceki dönemin cirosu (değişim yüzdesi için; 0 ise gösterilmez). */
  salesAmount: number;
  previousSalesAmount: number;
  /** Ciro eğrisi (küçük grafik), en az 2 nokta. */
  trend: number[];
  stats: { orders: number; customers: number; products: number; totalSales: number };
  revenue: RevenuePoint[];
  orders: { delivered: number; cancelled: number; pending: number };
  recentOrders: RecentOrder[];
  payments: PaymentMethod[];
  productRanks: { carts: RankedProduct[]; favorites: RankedProduct[]; alarms: RankedProduct[] };
}
