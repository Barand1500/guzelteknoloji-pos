export type OrderStatus = 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export type OrderSource = 'web' | 'mobile' | 'marketplace' | 'manual';

export interface OrderLine {
  id: string;
  name: string;
  code: string;
  qty: number;
  /** KDV hariç birim fiyat (TL). */
  unitPrice: number;
}

/**
 * Sipariş (sunucu sözleşmesi): `GET /api/siparisler` → Order[] (en yeniden eskiye).
 * Durum değişimi: `POST /api/siparisler/:id/durum` gövde `{ status }`.
 */
export interface Order {
  id: string;
  no: string;
  /** ISO tarih-saat. */
  date: string;
  source: OrderSource;
  customer: string;
  /** Tutar KDV hariç ve KDV dahil (TL). */
  total: number;
  totalWithVat: number;
  paid: boolean;
  paymentMethod: string;
  status: OrderStatus;
  address: string;
  lines: OrderLine[];
}

export type ReturnKind = 'return' | 'exchange';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed';

/**
 * İade/değişim talebi: `GET /api/siparisler/iade` → ReturnRequest[].
 * Durum değişimi: `POST /api/siparisler/iade/:id/durum` gövde `{ status }`.
 */
export interface ReturnRequest {
  id: string;
  customer: string;
  orderNo: string;
  kind: ReturnKind;
  itemCount: number;
  date: string;
  status: ReturnStatus;
  reason: string;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Bekliyor',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
};
export const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];
/** Sıradaki adım (kargoya veriliş akışı); teslim ve iptalden sonrası yoktur. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered',
};

export const SOURCE_LABEL: Record<OrderSource, string> = {
  web: 'Web Sitesi',
  mobile: 'Mobil Uygulama',
  marketplace: 'Pazaryeri',
  manual: 'Elle Girilen',
};

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
};
export const RETURN_KIND_LABEL: Record<ReturnKind, string> = {
  return: 'İade',
  exchange: 'Değişim',
};
