import {
  SOURCE_LABEL,
  STATUS_LABEL,
  type Order,
  type OrderSource,
  type OrderStatus,
} from './types';

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

export type ExportColumnKey =
  | 'no'
  | 'date'
  | 'customer'
  | 'source'
  | 'total'
  | 'totalWithVat'
  | 'paymentMethod'
  | 'paid'
  | 'status'
  | 'lines';

const money = (n: number) => n.toFixed(2).replace('.', ',');

/** Dışa aktarılabilen sütunlar ("Neler olsun?" adımı). `lines`: her ürün satırı bir hücrede. */
export const EXPORT_COLUMNS: {
  key: ExportColumnKey;
  label: string;
  get: (o: Order) => string;
}[] = [
  { key: 'no', label: 'Sipariş No', get: (o) => o.no },
  { key: 'date', label: 'Tarih', get: (o) => o.date.slice(0, 16).replace('T', ' ') },
  { key: 'customer', label: 'Müşteri', get: (o) => o.customer },
  { key: 'source', label: 'Kaynak', get: (o) => SOURCE_LABEL[o.source] },
  { key: 'total', label: 'Tutar', get: (o) => money(o.total) },
  { key: 'totalWithVat', label: 'Tutar (KDV Dahil)', get: (o) => money(o.totalWithVat) },
  { key: 'paymentMethod', label: 'Ödeme', get: (o) => o.paymentMethod },
  { key: 'paid', label: 'Ödendi', get: (o) => (o.paid ? 'Evet' : 'Hayır') },
  { key: 'status', label: 'Durum', get: (o) => STATUS_LABEL[o.status] },
  {
    key: 'lines',
    label: 'Ürünler',
    get: (o) => o.lines.map((l) => `${l.qty}x ${l.name}`).join(' | '),
  },
];

export const DEFAULT_EXPORT_COLUMNS: ExportColumnKey[] = [
  'no',
  'date',
  'customer',
  'total',
  'totalWithVat',
  'paymentMethod',
  'paid',
  'status',
];

/** Excel'in açabildiği CSV (Türkçe yerel: noktalı virgül ayraç, BOM'lu). */
export function ordersToCsv(
  orders: Order[],
  keys: readonly ExportColumnKey[] = DEFAULT_EXPORT_COLUMNS,
): string {
  const cols = EXPORT_COLUMNS.filter((c) => keys.includes(c.key));
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = cols.map((c) => esc(c.label)).join(';');
  const rows = orders.map((o) => cols.map((c) => esc(c.get(o))).join(';'));
  return '\uFEFF' + [head, ...rows].join('\r\n');
}

/** "Ne indirilsin?" seçenekleri için siparişleri seçer. */
export type ExportScope =
  | { kind: 'list' }
  | { kind: 'all' }
  | { kind: 'product'; code: string }
  | { kind: 'status'; status: OrderStatus }
  | { kind: 'range'; from: string; to: string };

export function selectForExport(all: Order[], listed: Order[], scope: ExportScope): Order[] {
  switch (scope.kind) {
    case 'list':
      return listed;
    case 'all':
      return all;
    case 'product':
      return all.filter((o) => o.lines.some((l) => l.code === scope.code));
    case 'status':
      return all.filter((o) => o.status === scope.status);
    case 'range':
      return all.filter((o) => {
        const day = o.date.slice(0, 10);
        return (!scope.from || day >= scope.from) && (!scope.to || day <= scope.to);
      });
  }
}

/** Siparişlerdeki ürünlerin tekil listesi (belirli ürün seçimi için). */
export function distinctProducts(orders: Order[]): { code: string; name: string }[] {
  const map = new Map<string, string>();
  for (const o of orders) for (const l of o.lines) map.set(l.code, l.name);
  return [...map]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
