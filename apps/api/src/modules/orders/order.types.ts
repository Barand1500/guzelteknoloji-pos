/** Sipariş listesi, iade talepleri ve anasayfa özeti için sunucu tipleri (frontend sözleşmesi). */

export const ORDER_STATUSES = [
  'pending',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SOURCES = ['web', 'mobile', 'marketplace', 'manual'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const RETURN_KINDS = ['return', 'exchange'] as const;
export type ReturnKind = (typeof RETURN_KINDS)[number];

export const RETURN_STATUSES = ['pending', 'approved', 'rejected', 'completed'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const HOME_PERIODS = ['today', 'week', 'month', 'year', 'all'] as const;
export type HomePeriod = (typeof HOME_PERIODS)[number];

export interface OrderLineRecord {
  id: number;
  name: string;
  code: string;
  qty: number;
  unitPrice: number;
  /** Satış anındaki birim maliyet; bilinmiyorsa null. */
  unitCost: number | null;
  lineTotal?: number;
}

export interface OrderRecord {
  id: number;
  no: string;
  date: Date;
  source: OrderSource;
  customer: string;
  total: number;
  totalWithVat: number;
  paid: boolean;
  paymentMethod: string;
  status: OrderStatus;
  address: string;
  lines: OrderLineRecord[];
  managed?: boolean;
  shippingTotal?: number;
  discountTotal?: number;
}

export interface ReturnRecord {
  id: number;
  customer: string;
  orderNo: string;
  kind: ReturnKind;
  itemCount: number;
  date: Date;
  status: ReturnStatus;
  reason: string;
  orderId?: number;
}

export interface CompletedRefund {
  orderId: number;
  date: Date;
  amount: number;
  lines: { lineId: number; qty: number }[];
}

export interface RankedProductDto {
  id: string;
  name: string;
  code: string;
  count: number;
}

export interface HomeDataDto {
  period: HomePeriod;
  salesAmount: number;
  previousSalesAmount: number;
  trend: number[];
  stats: { orders: number; customers: number; products: number; totalSales: number };
  revenue: { label: string; sales: number; cost: number; costUnknown: boolean }[];
  orders: { delivered: number; cancelled: number; pending: number };
  recentOrders: {
    id: string;
    no: string;
    date: string;
    customer: string;
    amount: number;
    status: 'delivered' | 'cancelled' | 'pending';
  }[];
  payments: { id: string; label: string; orderCount: number; amount: number }[];
  productRanks: {
    carts: RankedProductDto[];
    favorites: RankedProductDto[];
    alarms: RankedProductDto[];
  };
}
