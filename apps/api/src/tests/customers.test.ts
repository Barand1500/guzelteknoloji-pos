import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../lib/logger';
import { errorHandler } from '../middleware/error-handler';
import type { AccessContext } from '../modules/workspace/workspace.access';
import { createCustomerRouter } from '../modules/customers/customer.routes';
import type { CustomerStore } from '../modules/customers/customer.store';
import type {
  AddressDraft,
  AddressRecord,
  CustomerDetailRecord,
  CustomerDraft,
  CustomerRecord,
} from '../modules/customers/customer.types';

const context: AccessContext = {
  business: { id: 7, name: 'Deneme İşletmesi' },
  user: { id: 3, name: 'Test Kullanıcı', email: 'test@example.com' },
  owner: true,
  ownerId: 3,
  permissions: [],
};

const draft: CustomerDraft = {
  code: 'M-1',
  name: 'Ayşe Demir',
  kind: 'real',
  taxId: '12345678901',
  phone: '05551234567',
  email: 'ayse@example.com',
  priceList: 'FİYAT',
  customerType: 'Son Kullanıcı',
  payments: ['Havale/EFT'],
  cardDeal: '',
};

const customer: CustomerRecord = {
  ...draft,
  id: 1,
  active: true,
  userCount: 1,
  lastLogin: null,
  debt: 100,
  credit: 20,
};

const detail: CustomerDetailRecord = {
  users: [
    {
      id: 10,
      name: 'Ayşe Demir',
      email: 'ayse@example.com',
      active: true,
      lastLogin: null,
    },
  ],
  addresses: [{ id: 11, title: 'Ev', address: 'Atatürk Cad. No:1, Kadıköy', isDefault: true }],
  ledger: [
    {
      id: 12,
      date: new Date('2026-11-01T10:00:00.000Z'),
      ref: 'Açılış',
      debt: 100,
      credit: 20,
    },
  ],
  orders: [
    {
      id: 13,
      no: '1001',
      date: new Date('2026-11-02T10:00:00.000Z'),
      total: 1200,
      paid: true,
      status: 'delivered',
    },
  ],
  returns: [
    {
      id: 14,
      orderNo: '1001',
      kind: 'return',
      items: 1,
      date: new Date('2026-11-03T10:00:00.000Z'),
      status: 'pending',
    },
  ],
};

class FakeStore implements CustomerStore {
  businessCalls: number[] = [];
  customers = [customer];
  loginCalls: { customerId: number; active: boolean }[] = [];
  addressCalls: { addressId?: number; draft: AddressDraft }[] = [];

  async list(businessId: number): Promise<CustomerRecord[]> {
    this.businessCalls.push(businessId);
    return this.customers;
  }

  async detail(businessId: number, id: number): Promise<CustomerDetailRecord | null> {
    this.businessCalls.push(businessId);
    return id === 1 ? detail : null;
  }

  async create(_businessId: number, input: CustomerDraft): Promise<CustomerRecord | null> {
    return { ...input, id: 2, active: true, userCount: 1, lastLogin: null, debt: 0, credit: 0 };
  }

  async update(
    _businessId: number,
    id: number,
    input: CustomerDraft,
  ): Promise<CustomerRecord | null> {
    if (id !== 1) return null;
    return { ...customer, ...input };
  }

  async remove(_businessId: number, id: number): Promise<boolean> {
    return id === 1;
  }

  async setLogin(_businessId: number, id: number, active: boolean): Promise<boolean> {
    if (id !== 1) return false;
    this.loginCalls.push({ customerId: id, active });
    return true;
  }

  async saveAddress(
    _businessId: number,
    id: number,
    input: AddressDraft,
    addressId?: number,
  ): Promise<AddressRecord | null> {
    if (id !== 1) return null;
    this.addressCalls.push({ ...(addressId ? { addressId } : {}), draft: input });
    return { id: addressId ?? 20, ...input };
  }

  async setUserLogin(
    _businessId: number,
    id: number,
    userId: number,
    _active: boolean,
  ): Promise<boolean> {
    return id === 1 && userId === 10;
  }

  async codeExists(_businessId: number, code: string): Promise<boolean> {
    return code === 'DUP';
  }
}

function buildApp(store: CustomerStore) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.workspace = context;
    next();
  });
  app.use('/api/musteriler', createCustomerRouter(store));
  app.use(errorHandler(createLogger('silent')));
  return app;
}

describe('müşteri listesi ve kaydı', () => {
  it('listeyi işletme kapsamında ve frontend alanlarıyla döndürür', async () => {
    const store = new FakeStore();
    const app = buildApp(store);
    const res = await request(app).get('/api/musteriler');
    expect(res.status).toBe(200);
    expect(store.businessCalls).toEqual([7]);
    expect(res.body[0]).toMatchObject({
      id: '1',
      code: 'M-1',
      name: 'Ayşe Demir',
      kind: 'real',
      active: true,
      userCount: 1,
      debt: 100,
      credit: 20,
    });
    expect(res.body[0].lastLogin).toBeNull();
  });

  it('yeni müşteri kaydeder; aynı kodu ve geçersiz alanları reddeder', async () => {
    const app = buildApp(new FakeStore());
    const created = await request(app).post('/api/musteriler').send(draft);
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ id: '2', name: 'Ayşe Demir', active: true });

    const duplicate = await request(app)
      .post('/api/musteriler')
      .send({ ...draft, code: 'DUP' });
    expect(duplicate.status).toBe(409);

    const invalidPhone = await request(app)
      .post('/api/musteriler')
      .send({ ...draft, phone: '123' });
    expect(invalidPhone.status).toBe(400);
    expect(invalidPhone.body.error.message).toBe('Geçerli bir telefon numarası yazın.');

    const invalidEmail = await request(app)
      .post('/api/musteriler')
      .send({ ...draft, email: 'bozuk' });
    expect(invalidEmail.status).toBe(400);
  });

  it('müşteriyi günceller, olmayan kaydı 404 döndürür', async () => {
    const app = buildApp(new FakeStore());
    const res = await request(app)
      .post('/api/musteriler/1')
      .send({ ...draft, name: 'Ayşe Yılmaz' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ayşe Yılmaz');
    const missing = await request(app).post('/api/musteriler/99').send(draft);
    expect(missing.status).toBe(404);
  });

  it('detay sekmelerini ve boş mağaza alanlarını döndürür', async () => {
    const app = buildApp(new FakeStore());
    const res = await request(app).get('/api/musteriler/1/detay');
    expect(res.status).toBe(200);
    expect(res.body.users[0]).toMatchObject({ id: '10', name: 'Ayşe Demir', active: true });
    expect(res.body.addresses[0]).toMatchObject({ id: '11', isDefault: true });
    expect(res.body.ledger[0]).toMatchObject({ ref: 'Açılış', debt: 100, credit: 20 });
    expect(res.body.orders[0]).toMatchObject({ no: '1001', total: 1200, status: 'delivered' });
    expect(res.body.returns[0]).toMatchObject({ orderNo: '1001', kind: 'return' });
    expect(res.body.favorites).toEqual([]);
    expect(res.body.cart).toEqual([]);
    expect(res.body.messages).toEqual([]);
  });
});

describe('müşteri işlemleri', () => {
  it('adres kaydeder ve varsayılan bilgisini korur', async () => {
    const store = new FakeStore();
    const app = buildApp(store);
    const res = await request(app)
      .post('/api/musteriler/1/adresler')
      .send({ title: 'Depo', address: 'Sanayi Cad. No:5, Ümraniye', isDefault: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Depo', isDefault: true });
    expect(store.addressCalls).toHaveLength(1);
  });

  it('tüm girişleri ve tek kullanıcı girişini açıp kapatır', async () => {
    const store = new FakeStore();
    const app = buildApp(store);
    const all = await request(app).post('/api/musteriler/1/giris').send({ active: false });
    expect(all.status).toBe(204);
    expect(store.loginCalls).toEqual([{ customerId: 1, active: false }]);

    const one = await request(app)
      .post('/api/musteriler/1/kullanicilar/10/giris')
      .send({ active: false });
    expect(one.status).toBe(204);
  });

  it('müşteriyi siler; olmayan kayıtta 404 döndürür', async () => {
    const app = buildApp(new FakeStore());
    expect((await request(app).post('/api/musteriler/1/sil')).status).toBe(204);
    expect((await request(app).post('/api/musteriler/99/sil')).status).toBe(404);
  });
});
