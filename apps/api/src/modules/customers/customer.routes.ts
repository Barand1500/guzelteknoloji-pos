import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/http-error';
import type { AccessContext } from '../workspace/workspace.access';
import type { CustomerStore } from './customer.store';
import type {
  AddressDraft,
  AddressRecord,
  CustomerDetailRecord,
  CustomerRecord,
  CustomerUserRecord,
} from './customer.types';

const idSchema = z.coerce.number().int().positive().max(2147483647);
const kindSchema = z.enum(['real', 'corporate']);

const draftSchema = z
  .strictObject({
    code: z.string().trim().max(40, 'Müşteri kodu en çok 40 karakter olabilir.'),
    name: z.string().trim().min(1, 'Ad soyad veya ünvan gerekli.').max(160),
    kind: kindSchema,
    taxId: z.string().trim().max(20),
    phone: z.string().trim().min(1, 'Telefon gerekli.').max(30),
    email: z.email({ error: 'Geçerli bir e-posta adresi girin.' }).max(254),
    priceList: z.string().trim().min(1, 'Fiyat listesi gerekli.').max(40),
    customerType: z.string().trim().min(1, 'Cari tipi gerekli.').max(40),
    payments: z.array(z.string().trim().min(1).max(60)).max(10),
    cardDeal: z.string().trim().max(80),
  })
  .superRefine((value, ctx) => {
    const digits = value.phone.replace(/\D/g, '');
    if (digits.length < 10)
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Geçerli bir telefon numarası yazın.',
      });
    if (value.taxId) {
      const expected = value.kind === 'corporate' ? 10 : 11;
      if (value.taxId.replace(/\D/g, '').length !== expected)
        ctx.addIssue({
          code: 'custom',
          path: ['taxId'],
          message:
            value.kind === 'corporate'
              ? 'Vergi no 10 haneli olmalı.'
              : 'TC kimlik no 11 haneli olmalı.',
        });
    }
  });

const addressSchema = z.strictObject({
  title: z.string().trim().min(1, 'Adres başlığı gerekli.').max(60),
  address: z.string().trim().min(10, 'Adresi eksiksiz yazın.').max(300),
  isDefault: z.boolean(),
});
const activeSchema = z.strictObject({ active: z.boolean() });

function contextOf(res: Response): AccessContext {
  const context = res.locals.workspace as AccessContext | undefined;
  if (!context) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
  return context;
}

function toCustomerDto(record: CustomerRecord) {
  return {
    id: String(record.id),
    code: record.code,
    name: record.name,
    kind: record.kind,
    taxId: record.taxId,
    phone: record.phone,
    email: record.email,
    priceList: record.priceList,
    customerType: record.customerType,
    payments: record.payments,
    cardDeal: record.cardDeal,
    active: record.active,
    userCount: record.userCount,
    lastLogin: record.lastLogin ? record.lastLogin.toISOString() : null,
    debt: record.debt,
    credit: record.credit,
  };
}

function toUserDto(user: CustomerUserRecord) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    active: user.active,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
  };
}

function toAddressDto(address: AddressRecord) {
  return {
    id: String(address.id),
    title: address.title,
    address: address.address,
    isDefault: address.isDefault,
  };
}

/**
 * Müşteri uçları. Frontend `features/customers/types.ts` sözleşmesine birebir uyar:
 *   GET  /api/musteriler                       → Customer[]
 *   GET  /api/musteriler/:id/detay             → CustomerDetail
 *   POST /api/musteriler                       → Customer
 *   POST /api/musteriler/:id                   → Customer
 *   POST /api/musteriler/:id/sil               → 204
 *   POST /api/musteriler/:id/giris             → 204
 *   POST /api/musteriler/:id/adresler[/:adres] → CustomerAddress
 *   POST /api/musteriler/:id/kullanicilar/:kullanici/giris → 204
 */
export function createCustomerRouter(store: CustomerStore) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const context = contextOf(res);
    const customers = await store.list(context.business.id);
    res.json(customers.map(toCustomerDto));
  });

  router.get('/:id/detay', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const detail = await store.detail(context.business.id, id);
    if (!detail) throw new HttpError(404, 'NOT_FOUND', 'Müşteri bulunamadı.');
    res.json(toDetailDto(detail));
  });

  router.post('/', async (req, res) => {
    const context = contextOf(res);
    const draft = draftSchema.parse(req.body);
    if (await store.codeExists(context.business.id, draft.code))
      throw new HttpError(409, 'CONFLICT', 'Bu müşteri kodu zaten kullanılıyor.');
    const saved = await store.create(context.business.id, draft);
    if (!saved) throw new HttpError(500, 'INTERNAL_ERROR', 'Müşteri kaydedilemedi.');
    res.json(toCustomerDto(saved));
  });

  router.post('/:id', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const draft = draftSchema.parse(req.body);
    if (await store.codeExists(context.business.id, draft.code, id))
      throw new HttpError(409, 'CONFLICT', 'Bu müşteri kodu zaten kullanılıyor.');
    const saved = await store.update(context.business.id, id, draft);
    if (!saved) throw new HttpError(404, 'NOT_FOUND', 'Müşteri bulunamadı.');
    res.json(toCustomerDto(saved));
  });

  router.post('/:id/sil', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const removed = await store.remove(context.business.id, id);
    if (!removed) throw new HttpError(404, 'NOT_FOUND', 'Müşteri bulunamadı.');
    res.status(204).end();
  });

  router.post('/:id/giris', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const { active } = activeSchema.parse(req.body);
    const updated = await store.setLogin(context.business.id, id, active);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Müşteri bulunamadı.');
    res.status(204).end();
  });

  const saveAddress = async (req: Request, res: Response) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const addressId = req.params.adresId ? idSchema.parse(req.params.adresId) : undefined;
    const saved = await store.saveAddress(
      context.business.id,
      id,
      addressSchema.parse(req.body) as AddressDraft,
      addressId,
    );
    if (!saved) throw new HttpError(404, 'NOT_FOUND', 'Müşteri veya adres bulunamadı.');
    res.json(toAddressDto(saved));
  };
  router.post('/:id/adresler', saveAddress);
  router.post('/:id/adresler/:adresId', saveAddress);

  router.post('/:id/kullanicilar/:kullaniciId/giris', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const userId = idSchema.parse(req.params.kullaniciId);
    const { active } = activeSchema.parse(req.body);
    const updated = await store.setUserLogin(context.business.id, id, userId, active);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Müşteri veya kullanıcı bulunamadı.');
    res.status(204).end();
  });

  return router;
}

function toDetailDto(detail: CustomerDetailRecord) {
  return {
    users: detail.users.map(toUserDto),
    addresses: detail.addresses.map(toAddressDto),
    ledger: detail.ledger.map((entry) => ({
      id: String(entry.id),
      date: entry.date.toISOString(),
      ref: entry.ref,
      debt: entry.debt,
      credit: entry.credit,
    })),
    orders: detail.orders.map((order) => ({
      id: String(order.id),
      no: order.no,
      date: order.date.toISOString(),
      total: order.total,
      paid: order.paid,
      status: order.status,
    })),
    returns: detail.returns.map((item) => ({
      id: String(item.id),
      orderNo: item.orderNo,
      kind: item.kind,
      items: item.items,
      date: item.date.toISOString(),
      status: item.status,
    })),
    // Mağaza tarafı henüz yok: favori, sepet, alarm, yorum ve mesaj verileri boş döner.
    favorites: [],
    cart: [],
    savedCarts: [],
    alerts: [],
    reviews: [],
    likedReviews: [],
    messages: [],
  };
}
