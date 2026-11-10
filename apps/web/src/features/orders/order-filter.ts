import type { Order, OrderSource, OrderStatus } from './types';

export interface OrderFilters {
  status: OrderStatus | 'all';
  source: OrderSource | 'all';
  paid: 'all' | 'paid' | 'unpaid';
  /** yyyy-mm-dd (boş = sınırsız) */
  from: string;
  to: string;
  /** KDV dahil tutar alt/üst sınırı (boş = sınırsız). */
  min: string;
  max: string;
  query: string;
}

export const emptyOrderFilters: OrderFilters = {
  status: 'all',
  source: 'all',
  paid: 'all',
  from: '',
  to: '',
  min: '',
  max: '',
  query: '',
};

export type OrderSortKey = 'no' | 'date' | 'customer' | 'total' | 'totalWithVat' | 'status';
export interface OrderSort {
  key: OrderSortKey;
  dir: 'asc' | 'desc';
}

const fold = (s: string) => s.toLocaleLowerCase('tr');
const num = (s: string) => Number(s.replace(',', '.'));

/** Süzgeçte açık olan (durum ve arama dışındaki) ayar sayısı: "Filtreler (2)" rozeti için. */
export function activeFilterCount(f: OrderFilters): number {
  return [f.source !== 'all', f.paid !== 'all', f.from, f.to, f.min, f.max].filter(Boolean).length;
}

/** `ignoreStatus`: durum sayaçları için (durum dışındaki süzgeçlerle sayılır). */
export function filterOrders(orders: Order[], f: OrderFilters, ignoreStatus = false): Order[] {
  const q = fold(f.query.trim());
  const min = f.min.trim() === '' ? null : num(f.min);
  const max = f.max.trim() === '' ? null : num(f.max);
  return orders.filter((o) => {
    if (!ignoreStatus && f.status !== 'all' && o.status !== f.status) return false;
    if (f.source !== 'all' && o.source !== f.source) return false;
    if (f.paid === 'paid' && !o.paid) return false;
    if (f.paid === 'unpaid' && o.paid) return false;
    const day = o.date.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (min !== null && o.totalWithVat < min) return false;
    if (max !== null && o.totalWithVat > max) return false;
    if (q && !fold(o.no).includes(q) && !fold(o.customer).includes(q)) return false;
    return true;
  });
}

export function sortOrders(orders: Order[], sort: OrderSort): Order[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...orders].sort((a, b) => {
    const x = a[sort.key];
    const y = b[sort.key];
    const cmp =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'tr', { numeric: true });
    return cmp * dir;
  });
}

/** Excel'in açabildiği CSV (Türkçe yerel: noktalı virgül ayraç, BOM'lu). */
export function ordersToCsv(orders: Order[]): string {
  const head = [
    'Sipariş No',
    'Tarih',
    'Müşteri',
    'Tutar',
    'Tutar (KDV Dahil)',
    'Ödeme',
    'Ödendi',
    'Durum',
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [
      o.no,
      o.date.slice(0, 16).replace('T', ' '),
      o.customer,
      o.total.toFixed(2).replace('.', ','),
      o.totalWithVat.toFixed(2).replace('.', ','),
      o.paymentMethod,
      o.paid ? 'Evet' : 'Hayır',
      o.status,
    ]
      .map(esc)
      .join(';'),
  );
  return '﻿' + [head.map(esc).join(';'), ...rows].join('\r\n');
}
