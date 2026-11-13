import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../lib/logger';
import { errorHandler } from '../middleware/error-handler';
import type { AccessContext } from '../modules/workspace/workspace.access';
import { createHomeRouter, createOrderRouter } from '../modules/orders/order.routes';
import type { OrderStore } from '../modules/orders/order.store';
import { buildHomeData, toOrderDto } from '../modules/orders/order.service';
import type {
  OrderRecord,
  OrderStatus,
  ReturnRecord,
  ReturnStatus,
} from '../modules/orders/order.types';

const NOW = new Date('2026-11-11T06:00:00.000Z'); // İstanbul 09:00
const context: AccessContext = {
  business: { id: 7, name: 'Deneme İşletmesi' },
  user: { id: 3, name: 'Test Kullanıcı', email: 'test@example.com' },
  owner: true,
  ownerId: 3,
  permissions: [],
};

const order = (
  id: number,
  date: string,
  status: OrderStatus,
  customer: string,
  amount: number,
  paymentMethod = 'Kredi Kartı',
): OrderRecord => ({
  id,
  no: String(1000 + id),
  date: new Date(date),
  source: 'web',
  customer,
  total: Math.round((amount / 1.2) * 100) / 100,
  totalWithVat: amount,
  paid: status === 'delivered',
  paymentMethod,
  status,
  address: 'Atatürk Cad. No:1, Kadıköy / İstanbul',
  lines: [
    { id: id * 10, name: `Ürün ${id}`, code: `P-${id}`, qty: 1, unitPrice: amount, unitCost: 0 },
  ],
});

const orders: OrderRecord[] = [
  order(1, '2026-11-11T05:00:00.000Z', 'delivered', 'Ayşe Demir', 1200),
  order(2, '2026-11-10T07:00:00.000Z', 'pending', 'Murat Sarı', 600, 'Havale / EFT'),
  order(3, '2026-10-15T07:00:00.000Z', 'delivered', 'Ayşe Demir', 2400),
  order(4, '2026-11-11T04:00:00.000Z', 'cancelled', 'Ege Teknoloji', 5000),
  order(5, '2025-12-01T07:00:00.000Z', 'delivered', 'Bora Ticaret', 3000),
  order(6, '2026-11-01T07:00:00.000Z', 'shipped', 'Kasa Market', 800, 'Açık Hesap'),
];
// Ürün sıralaması için adetleri farklılaştır.
orders[0]!.lines = [
  { id: 10, name: 'POS Cihazı', code: 'POS-1', qty: 2, unitPrice: 500, unitCost: 300 },
  { id: 11, name: 'Barkod Okuyucu', code: 'BAR-1', qty: 1, unitPrice: 200, unitCost: 100 },
];
orders[1]!.lines = [
  { id: 20, name: 'POS Cihazı', code: 'POS-1', qty: 1, unitPrice: 500, unitCost: 300 },
];

const returns: ReturnRecord[] = [
  {
    id: 1,
    customer: 'Ayşe Demir',
    orderNo: '1001',
    kind: 'return',
    itemCount: 1,
    date: new Date('2026-11-09T10:00:00.000Z'),
    status: 'pending',
    reason: 'Kutu hasarlı geldi',
  },
];

class FakeStore implements OrderStore {
  statusCalls: { businessId: number; id: number; status: OrderStatus }[] = [];
  customerCountCalls: number[] = [];

  async listOrders(): Promise<OrderRecord[]> {
    return orders;
  }

  async updateOrderStatus(businessId: number, id: number, status: OrderStatus): Promise<boolean> {
    this.statusCalls.push({ businessId, id, status });
    return orders.some((row) => row.id === id);
  }

  async listReturns(): Promise<ReturnRecord[]> {
    return returns;
  }

  async updateReturnStatus(
    _businessId: number,
    id: number,
    _status: ReturnStatus,
  ): Promise<boolean> {
    return returns.some((row) => row.id === id);
  }

  async countProducts(): Promise<number> {
    return 18;
  }

  async countCustomers(businessId: number): Promise<number> {
    this.customerCountCalls.push(businessId);
    return 42;
  }
}

function buildApp(store: OrderStore) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.workspace = context;
    next();
  });
  app.use('/api/siparisler', createOrderRouter(store));
  app.use(
    '/api/anasayfa',
    createHomeRouter(store, () => NOW),
  );
  app.use(errorHandler(createLogger('silent')));
  return app;
}

describe('sipariş listesi', () => {
  it('frontend sözleşmesine uygun siparişleri döndürür', async () => {
    const app = buildApp(new FakeStore());
    const res = await request(app).get('/api/siparisler');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(orders.length);
    expect(res.body[0]).toMatchObject({
      id: expect.any(String),
      no: expect.any(String),
      date: expect.any(String),
      source: 'web',
      customer: expect.any(String),
      totalWithVat: expect.any(Number),
      status: expect.any(String),
      lines: expect.any(Array),
    });
    expect(res.body[0].lines[0]).not.toHaveProperty('unitCost');
  });

  it('durum değişikliğini işletme kapsamında kaydeder', async () => {
    const store = new FakeStore();
    const app = buildApp(store);
    const res = await request(app).post('/api/siparisler/2/durum').send({ status: 'preparing' });
    expect(res.status).toBe(204);
    expect(store.statusCalls).toEqual([{ businessId: 7, id: 2, status: 'preparing' }]);
  });

  it('olmayan siparişi ve geçersiz durumu reddeder', async () => {
    const app = buildApp(new FakeStore());
    const missing = await request(app)
      .post('/api/siparisler/99/durum')
      .send({ status: 'preparing' });
    expect(missing.status).toBe(404);
    const invalid = await request(app).post('/api/siparisler/2/durum').send({ status: 'gecersiz' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.message).toBe('Geçersiz sipariş durumu.');
  });

  it('iade taleplerini listeler ve durumunu günceller', async () => {
    const app = buildApp(new FakeStore());
    const list = await request(app).get('/api/siparisler/iade');
    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({ id: '1', kind: 'return', status: 'pending' });
    const update = await request(app)
      .post('/api/siparisler/iade/1/durum')
      .send({ status: 'approved' });
    expect(update.status).toBe(204);
  });
});

describe('anasayfa özeti', () => {
  it('aylık ciroyu, önceki ayı ve sipariş durumlarını hesaplar', () => {
    const data = buildHomeData(orders, 18, 42, 'month', NOW);
    // Kasım: 1200 + 600 + 800 (iptal hariç); Ekim: 2400
    expect(data.salesAmount).toBe(2600);
    expect(data.previousSalesAmount).toBe(2400);
    expect(data.stats).toEqual({ orders: 4, customers: 42, products: 18, totalSales: 8000 });
    expect(data.orders).toEqual({ delivered: 1, cancelled: 1, pending: 2 });
    expect(data.recentOrders[0]?.id).toBe('1');
    expect(data.payments.find((p) => p.label === 'Kredi Kartı')?.amount).toBe(6600);
    expect(data.productRanks.carts[0]).toMatchObject({ code: 'POS-1', count: 3 });
    expect(data.productRanks.favorites).toEqual([]);
  });

  it('bugün ve tüm zamanlar dönemlerini ayrı hesaplar', () => {
    const today = buildHomeData(orders, 18, 42, 'today', NOW);
    expect(today.salesAmount).toBe(1200);
    expect(today.stats.orders).toBe(2);
    expect(today.orders).toEqual({ delivered: 1, cancelled: 1, pending: 0 });

    const all = buildHomeData(orders, 18, 42, 'all', NOW);
    expect(all.salesAmount).toBe(8000);
    expect(all.previousSalesAmount).toBe(0);
    expect(all.revenue.length).toBeGreaterThanOrEqual(2);
  });

  it('uç noktası dönem parametresini kabul eder, bilinmeyen dönemde aya döner', async () => {
    const store = new FakeStore();
    const app = buildApp(store);
    const month = await request(app).get('/api/anasayfa?donem=month');
    expect(month.status).toBe(200);
    expect(month.body).toMatchObject({ period: 'month', salesAmount: 2600 });
    expect(month.body.stats.customers).toBe(42);
    expect(store.customerCountCalls).toEqual([context.business.id]);
    const fallback = await request(app).get('/api/anasayfa?donem=bilinmeyen');
    expect(fallback.status).toBe(200);
    expect(fallback.body.period).toBe('month');
  });

  it('sipariş JSON tarihini ISO ve kimliği metin olarak verir', () => {
    const dto = toOrderDto(orders[0]!);
    expect(dto.id).toBe('1');
    expect(dto.date).toBe('2026-11-11T05:00:00.000Z');
  });
});
