import type {
  HomeDataDto,
  HomePeriod,
  OrderRecord,
  ReturnRecord,
  RankedProductDto,
  CompletedRefund,
} from './order.types';

/** Türkiye yaz saati uygulamadığı için sabit +03:00 kullanılır; dönem sınırları yerel güne göre. */
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const MONTH_LABELS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
] as const;
const WEEK_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

const round2 = (value: number) => Math.round(value * 100) / 100;

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  weekday: number;
}

/** Bir anı İstanbul duvar saatine çevirir (UTC alanları duvar saatini taşır). */
function wallTime(date: Date): WallTime {
  const shifted = new Date(date.getTime() + ISTANBUL_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    weekday: shifted.getUTCDay(),
  };
}

/** İstanbul duvar saatindeki tarihi gerçek UTC anına çevirir; ay/gün taşmaları normalleşir. */
function fromWall(year: number, month: number, day: number, hour = 0): Date {
  return new Date(Date.UTC(year, month, day, hour) - ISTANBUL_OFFSET_MS);
}

function startOfPeriod(period: HomePeriod, now: Date): Date | null {
  if (period === 'all') return null;
  const w = wallTime(now);
  if (period === 'today') return fromWall(w.year, w.month, w.day);
  if (period === 'week') return fromWall(w.year, w.month, w.day - ((w.weekday + 6) % 7));
  if (period === 'month') return fromWall(w.year, w.month, 1);
  return fromWall(w.year, 0, 1);
}

/** Karşılaştırma için bir önceki tam dönem (bugün → dün, ay → geçen ay). */
function previousRange(period: HomePeriod, start: Date | null): { start: Date; end: Date } | null {
  if (!start || period === 'all') return null;
  const w = wallTime(start);
  if (period === 'today') return { start: fromWall(w.year, w.month, w.day - 1), end: start };
  if (period === 'week') return { start: fromWall(w.year, w.month, w.day - 7), end: start };
  if (period === 'month') return { start: fromWall(w.year, w.month - 1, 1), end: start };
  return { start: fromWall(w.year - 1, 0, 1), end: start };
}

function inRange(date: Date, start: Date | null, end: Date): boolean {
  return (!start || date >= start) && date <= end;
}

function lineCost(order: OrderRecord): number {
  return order.lines.reduce((sum, line) => sum + line.qty * (line.unitCost ?? 0), 0);
}

interface Buckets {
  labels: string[];
  index: (date: Date) => number;
}

/** Grafik kovaları: bugün saatlik, hafta günlük, ay günlük, yıl aylık, tümü yıllık. */
function buildBuckets(period: HomePeriod, now: Date, orders: OrderRecord[]): Buckets {
  const current = wallTime(now);
  if (period === 'today') {
    return {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      index: (date) => Math.min(5, Math.floor(wallTime(date).hour / 4)),
    };
  }
  if (period === 'week') {
    return {
      labels: [...WEEK_LABELS],
      index: (date) => (wallTime(date).weekday + 6) % 7,
    };
  }
  if (period === 'month') {
    const lastDay = new Date(Date.UTC(current.year, current.month + 1, 0)).getUTCDate();
    const weeks = Math.ceil(lastDay / 7);
    return {
      labels: Array.from({ length: weeks }, (_, i) => `${i + 1}. Hf`),
      index: (date) => Math.floor((wallTime(date).day - 1) / 7),
    };
  }
  if (period === 'year') {
    return {
      labels: [...MONTH_LABELS],
      index: (date) => wallTime(date).month,
    };
  }
  const years = orders
    .filter((order) => order.status !== 'cancelled')
    .map((order) => wallTime(order.date).year);
  const first = Math.min(current.year - 1, ...years);
  const last = Math.max(current.year, ...years);
  return {
    labels: Array.from({ length: last - first + 1 }, (_, i) => String(first + i)),
    index: (date) => wallTime(date).year - first,
  };
}

const homeStatus = (status: OrderRecord['status']): 'delivered' | 'cancelled' | 'pending' =>
  status === 'delivered' ? 'delivered' : status === 'cancelled' ? 'cancelled' : 'pending';

/**
 * Siparişlerden anasayfa sözleşmesini üretir. Ciro KDV dahil toplamdır; maliyet satırlardaki
 * `unitCost` alanından gelir. Ürün sıralamasında "Sepette" sekmesi, satılan ürünlerin
 * adet sıralamasıdır; favori/fiyat alarmı olayları bu sürümde yoktur.
 */
export function buildHomeData(
  orders: OrderRecord[],
  productCount: number,
  customerCount: number,
  period: HomePeriod,
  now: Date,
  refunds: CompletedRefund[] = [],
): HomeDataDto {
  const ordersById = new Map(
    orders.filter((order) => order.status !== 'cancelled').map((order) => [order.id, order]),
  );
  const validRefunds = refunds.filter(
    (refund) => ordersById.has(refund.orderId) && refund.date <= now,
  );
  const start = startOfPeriod(period, now);
  const periodOrders = orders
    .filter((order) => inRange(order.date, start, now))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const sold = periodOrders.filter((order) => order.status !== 'cancelled');
  const salesAmount = round2(
    sold.reduce((sum, order) => sum + order.totalWithVat, 0) -
      validRefunds
        .filter((refund) => inRange(refund.date, start, now))
        .reduce((sum, refund) => sum + refund.amount, 0),
  );
  const totalSales = round2(
    orders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalWithVat, 0) -
      validRefunds.reduce((sum, refund) => sum + refund.amount, 0),
  );

  const previous = previousRange(period, start);
  const previousSalesAmount = previous
    ? round2(
        orders
          .filter(
            (order) =>
              order.status !== 'cancelled' &&
              inRange(order.date, previous.start, previous.end) &&
              order.date < previous.end,
          )
          .reduce((sum, order) => sum + order.totalWithVat, 0) -
          validRefunds
            .filter((refund) => refund.date >= previous.start && refund.date < previous.end)
            .reduce((sum, refund) => sum + refund.amount, 0),
      )
    : 0;

  const buckets = buildBuckets(period, now, orders);
  const revenue = buckets.labels.map((label) => ({ label, sales: 0, cost: 0, costUnknown: false }));
  for (const order of sold) {
    const index = buckets.index(order.date);
    const bucket = revenue[index];
    if (!bucket) continue;
    bucket.sales += order.totalWithVat;
    bucket.cost += lineCost(order);
    if (order.lines.some((line) => line.unitCost === null)) bucket.costUnknown = true;
  }
  for (const refund of validRefunds.filter((item) => inRange(item.date, start, now))) {
    const bucket = revenue[buckets.index(refund.date)];
    const order = ordersById.get(refund.orderId)!;
    if (!bucket) continue;
    bucket.sales -= refund.amount;
    for (const item of refund.lines) {
      const line = order.lines.find((candidate) => candidate.id === item.lineId);
      if (!line || line.unitCost === null) bucket.costUnknown = true;
      else bucket.cost -= item.qty * line.unitCost;
    }
    if (!refund.lines.length) bucket.costUnknown = true;
  }
  for (const point of revenue) {
    point.sales = round2(point.sales);
    point.cost = round2(point.cost);
  }

  const delivered = periodOrders.filter((order) => order.status === 'delivered').length;
  const cancelled = periodOrders.filter((order) => order.status === 'cancelled').length;
  const pending = periodOrders.filter((order) =>
    ['pending', 'preparing', 'shipped'].includes(order.status),
  ).length;
  const payments = new Map<string, { orderCount: number; amount: number }>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const entry = payments.get(order.paymentMethod) ?? { orderCount: 0, amount: 0 };
    entry.orderCount += 1;
    entry.amount += order.totalWithVat;
    payments.set(order.paymentMethod, entry);
  }
  for (const refund of validRefunds) {
    const order = ordersById.get(refund.orderId)!;
    const entry = payments.get(order.paymentMethod);
    if (entry) entry.amount -= refund.amount;
  }

  const ranked = new Map<string, RankedProductDto>();
  for (const order of sold) {
    for (const line of order.lines) {
      const key = line.code.trim() || line.name.trim();
      if (!key) continue;
      const entry = ranked.get(key) ?? {
        id: key,
        name: line.name,
        code: line.code,
        count: 0,
      };
      entry.count += line.qty;
      ranked.set(key, entry);
    }
  }
  const topProducts = [...ranked.values()]
    .map((product) => ({ ...product, count: Math.round(product.count) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'))
    .slice(0, 6);

  return {
    period,
    salesAmount,
    previousSalesAmount,
    trend: revenue.map((point) => point.sales),
    stats: {
      orders: periodOrders.length,
      customers: customerCount,
      products: productCount,
      totalSales,
    },
    revenue,
    orders: { delivered, cancelled, pending },
    recentOrders: [...orders]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 12)
      .map((order) => ({
        id: String(order.id),
        no: order.no,
        date: order.date.toISOString(),
        customer: order.customer,
        amount: round2(order.totalWithVat),
        status: homeStatus(order.status),
      })),
    payments: [...payments.entries()]
      .map(([label, value]) => ({
        id: label,
        label,
        orderCount: value.orderCount,
        amount: round2(value.amount),
      }))
      .sort((a, b) => b.amount - a.amount),
    productRanks: { carts: topProducts, favorites: [], alarms: [] },
  };
}

/** Frontend'in beklediği sipariş JSON'u; maliyet alanı dışarı verilmez. */
export function toOrderDto(order: OrderRecord) {
  return {
    id: String(order.id),
    no: order.no,
    date: order.date.toISOString(),
    source: order.source,
    customer: order.customer,
    total: round2(order.total),
    totalWithVat: round2(order.totalWithVat),
    paid: order.paid,
    paymentMethod: order.paymentMethod,
    status: order.status,
    address: order.address,
    managed: order.managed ?? false,
    shippingTotal: order.shippingTotal ?? 0,
    discountTotal: order.discountTotal ?? 0,
    lines: order.lines.map((line) => ({
      id: String(line.id),
      name: line.name,
      code: line.code,
      qty: line.qty,
      unitPrice: round2(line.unitPrice),
      ...(line.lineTotal !== undefined ? { lineTotal: line.lineTotal } : {}),
    })),
  };
}

export function toReturnDto(row: ReturnRecord) {
  return {
    id: String(row.id),
    customer: row.customer,
    orderNo: row.orderNo,
    kind: row.kind,
    itemCount: row.itemCount,
    date: row.date.toISOString(),
    status: row.status,
    reason: row.reason,
    ...(row.orderId ? { orderId: String(row.orderId) } : {}),
  };
}
