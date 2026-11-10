/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/orders/services içe aktarır.
 */
import type {
  Order,
  OrderLine,
  OrderSource,
  OrderStatus,
  ReturnKind,
  ReturnRequest,
  ReturnStatus,
} from '../features/orders/types';

const CUSTOMERS = [
  'NOKTA BİLGİSAYAR',
  'Murat Kaygısız',
  'Murat Sarı',
  'Aykut Kartal',
  'Ayşe Demir',
  'Kasa Market',
  'Ege Teknoloji',
  'Bora Ticaret',
  'Deniz Büfe',
  'Mavi Kırtasiye',
];
const PRODUCTS: [string, string, number][] = [
  ['FLEXYPOS FP-503 İ3 Dokunmatik POS', 'FLEXYPOS.FP-503', 18500],
  ['ANYPAY LS10D-ACS Terazi POS', '194', 12400],
  ['ZYWELL Q822 Termal Fiş Yazıcı', '160', 3250],
  ['SYBLE XB-D50BT-2D Barkod Okuyucu', '96', 1980],
  ['PLUS Silver Kağıt Para Sayma Makinesi', 'PLUS.SILVER', 6700],
  ['INPOS M530 ECR Yazarkasa POS', '127', 9900],
];
const SOURCES: OrderSource[] = ['web', 'mobile', 'marketplace', 'manual', 'web', 'web'];
const PAYMENTS = ['Kredi Kartı', 'Havale / EFT', 'Açık Hesap', 'Kapıda Ödeme'];
const STATUSES: OrderStatus[] = [
  'delivered',
  'delivered',
  'shipped',
  'pending',
  'delivered',
  'preparing',
  'cancelled',
  'delivered',
];

function line(i: number, k: number): OrderLine {
  const [name, code, unitPrice] = PRODUCTS[(i + k * 2) % PRODUCTS.length]!;
  return { id: `l${i}-${k}`, name, code, qty: 1 + ((i + k) % 3), unitPrice };
}

function makeOrder(i: number): Order {
  const lines = Array.from({ length: 1 + (i % 3) }, (_, k) => line(i, k));
  const total = Math.round(lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) * 100) / 100;
  const status = STATUSES[i % STATUSES.length]!;
  const day = 28 - ((i * 3) % 27);
  const month = 10 - Math.floor(i / 9);
  return {
    id: `o${i}`,
    no: String(2025000045 - i),
    date: `2026-${String(Math.max(1, month)).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(9 + (i % 9)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`,
    source: SOURCES[i % SOURCES.length]!,
    customer: CUSTOMERS[i % CUSTOMERS.length]!,
    total,
    totalWithVat: Math.round(total * 1.2 * 100) / 100,
    paid: status === 'delivered' || (status === 'shipped' && i % 2 === 0),
    paymentMethod: PAYMENTS[i % PAYMENTS.length]!,
    status,
    address: `${CUSTOMERS[i % CUSTOMERS.length]} · Atatürk Cad. No:${10 + i}, ${['Kadıköy / İstanbul', 'Çankaya / Ankara', 'Konak / İzmir'][i % 3]}`,
    lines,
  };
}

export const orderSeeds: Order[] = Array.from({ length: 38 }, (_, i) => makeOrder(i));

const REASONS = [
  'Ürün beklentimi karşılamadı',
  'Kutu hasarlı geldi',
  'Yanlış model gönderilmiş',
  'Garanti kapsamında değişim',
  'Vazgeçtim',
];
const RETURN_STATUSES: ReturnStatus[] = ['pending', 'approved', 'completed', 'rejected', 'pending'];

export const returnSeeds: ReturnRequest[] = Array.from({ length: 13 }, (_, i) => {
  const kind: ReturnKind = i % 3 === 1 ? 'exchange' : 'return';
  return {
    id: `r${i}`,
    customer: CUSTOMERS[(i * 3) % CUSTOMERS.length]!,
    orderNo: String(2025000040 - i * 2),
    kind,
    itemCount: 1 + (i % 3),
    date: `2026-10-${String(30 - i * 2).padStart(2, '0')}T14:${String(10 + i).padStart(2, '0')}:00`,
    status: RETURN_STATUSES[i % RETURN_STATUSES.length]!,
    reason: REASONS[i % REASONS.length]!,
  };
});
