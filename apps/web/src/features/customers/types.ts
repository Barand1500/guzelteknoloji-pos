import type { OrderStatus, ReturnKind, ReturnStatus } from '../orders/types';

export type CustomerKind = 'real' | 'corporate';

export const KIND_LABEL: Record<CustomerKind, string> = {
  real: 'Gerçek Kişi',
  corporate: 'Tüzel Kişi',
};

export const CUSTOMER_TYPES = ['Son Kullanıcı', 'Bayi', 'Kurumsal'] as const;
export const PRICE_LISTS = ['FİYAT', 'PERAKENDE', 'TOPTAN'] as const;
export const PAYMENT_OPTIONS = [
  'Kredi Kartı/Banka Kartı',
  'Havale/EFT',
  'Mağazada Öde',
  'Açık Hesap',
] as const;

/**
 * Müşteri (sunucu sözleşmesi): `GET /api/musteriler` → Customer[]; kaydetme `POST /api/musteriler`
 * (yeni) ve `POST /api/musteriler/:id` (güncelle) gövde CustomerDraft; silme `POST /api/musteriler/:id/sil`;
 * müşterinin tüm kullanıcılarını aç/kapat `POST /api/musteriler/:id/giris` gövde `{ active }`.
 */
export interface Customer {
  id: string;
  /** Müşteri kodu (boş olabilir). */
  code: string;
  name: string;
  kind: CustomerKind;
  /** TC Kimlik No (gerçek) ya da Vergi No (tüzel). */
  taxId: string;
  phone: string;
  email: string;
  /** Müşterinin gördüğü fiyat listesi (FİYAT / PERAKENDE / TOPTAN …). */
  priceList: string;
  customerType: string;
  /** Boşsa aktif ödeme şekillerinin hepsi kullanılır. */
  payments: string[];
  cardDeal: string;
  /** En az bir kullanıcısı girişe açık mı. */
  active: boolean;
  userCount: number;
  /** ISO tarih-saat ya da null. */
  lastLogin: string | null;
  /** Müşterinin bize borcu ve bizim ona borcumuz (TL). Bakiye = debt − credit. */
  debt: number;
  credit: number;
}

export type CustomerDraft = Pick<
  Customer,
  | 'code'
  | 'name'
  | 'kind'
  | 'taxId'
  | 'phone'
  | 'email'
  | 'priceList'
  | 'customerType'
  | 'payments'
  | 'cardDeal'
>;

export const emptyCustomerDraft = (): CustomerDraft => ({
  code: '',
  name: '',
  kind: 'real',
  taxId: '',
  phone: '',
  email: '',
  priceList: PRICE_LISTS[0],
  customerType: CUSTOMER_TYPES[0],
  payments: [],
  cardDeal: '',
});

export const balanceOf = (c: Pick<Customer, 'debt' | 'credit'>) => c.debt - c.credit;

/** `GET /api/musteriler/:id/detay` → CustomerDetail (sekmelerin verisi, sekme açılınca yüklenir). */
export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLogin: string | null;
}
export interface CustomerAddress {
  id: string;
  title: string;
  address: string;
  isDefault: boolean;
}
export interface LedgerEntry {
  id: string;
  date: string;
  ref: string;
  debt: number;
  credit: number;
}
export interface CustomerOrder {
  id: string;
  no: string;
  date: string;
  total: number;
  paid: boolean;
  status: OrderStatus;
}
export interface CustomerReturn {
  id: string;
  orderNo: string;
  kind: ReturnKind;
  items: number;
  date: string;
  status: ReturnStatus;
}
export interface ProductRow {
  id: string;
  code: string;
  name: string;
  net: number;
  gross: number;
  stock: string;
}
export interface CartRow extends ProductRow {
  qty: number;
}
export interface SavedCart {
  id: string;
  name: string;
  date: string;
  items: number;
}
export interface PriceAlertRow extends ProductRow {
  alert: string;
}
export interface Review {
  id: string;
  orderNo: string;
  product: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
}
export interface Message {
  id: string;
  place: string;
  subject: string;
  text: string;
  date: string;
}
export interface CustomerDetail {
  users: CustomerUser[];
  addresses: CustomerAddress[];
  ledger: LedgerEntry[];
  orders: CustomerOrder[];
  returns: CustomerReturn[];
  favorites: ProductRow[];
  cart: CartRow[];
  savedCarts: SavedCart[];
  alerts: PriceAlertRow[];
  reviews: Review[];
  likedReviews: Review[];
  messages: Message[];
}
