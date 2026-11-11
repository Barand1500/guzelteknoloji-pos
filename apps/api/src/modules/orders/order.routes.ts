import { Router, type Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/http-error';
import type { AccessContext } from '../workspace/workspace.access';
import type { OrderStore } from './order.store';
import { buildHomeData, toOrderDto, toReturnDto } from './order.service';
import { HOME_PERIODS, ORDER_STATUSES, RETURN_STATUSES, type HomePeriod } from './order.types';

const idSchema = z.coerce.number().int().positive().max(2147483647);
const statusSchema = z.strictObject({
  status: z.enum(ORDER_STATUSES, { message: 'Geçersiz sipariş durumu.' }),
});
const returnStatusSchema = z.strictObject({
  status: z.enum(RETURN_STATUSES, { message: 'Geçersiz iade durumu.' }),
});
const periodSchema = z.enum(HOME_PERIODS);

/** Oturumdan gelen işletme bağlamı; middleware yoksa istek reddedilir. */
function contextOf(res: Response): AccessContext {
  const context = res.locals.workspace as AccessContext | undefined;
  if (!context) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
  return context;
}

/**
 * Sipariş ve iade uçları. Frontend `features/orders/types.ts` sözleşmesine birebir uyar:
 *   GET  /api/siparisler                 → Order[]
 *   POST /api/siparisler/:id/durum       → 204
 *   GET  /api/siparisler/iade            → ReturnRequest[]
 *   POST /api/siparisler/iade/:id/durum  → 204
 */
export function createOrderRouter(store: OrderStore) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const context = contextOf(res);
    const orders = await store.listOrders(context.business.id);
    res.json(orders.map(toOrderDto));
  });

  router.get('/iade', async (_req, res) => {
    const context = contextOf(res);
    const returns = await store.listReturns(context.business.id);
    res.json(returns.map(toReturnDto));
  });

  router.post('/iade/:id/durum', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const { status } = returnStatusSchema.parse(req.body);
    const updated = await store.updateReturnStatus(context.business.id, id, status);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'İade talebi bulunamadı.');
    res.status(204).end();
  });

  router.post('/:id/durum', async (req, res) => {
    const context = contextOf(res);
    const id = idSchema.parse(req.params.id);
    const { status } = statusSchema.parse(req.body);
    const updated = await store.updateOrderStatus(context.business.id, id, status);
    if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Sipariş bulunamadı.');
    res.status(204).end();
  });

  return router;
}

/**
 * Anasayfa özeti: `GET /api/anasayfa?donem=today|week|month|year|all`.
 * Veri siparişlerden hesaplanır; ayrı bir özet tablosu tutulmaz.
 */
export function createHomeRouter(store: OrderStore, now: () => Date = () => new Date()) {
  const router = Router();
  router.get('/', async (req, res) => {
    const context = contextOf(res);
    const parsedPeriod = periodSchema.safeParse(req.query.donem ?? 'month');
    const period: HomePeriod = parsedPeriod.success ? parsedPeriod.data : 'month';
    const [orders, productCount] = await Promise.all([
      store.listOrders(context.business.id),
      store.countProducts(context.ownerId),
    ]);
    res.json(buildHomeData(orders, productCount, period, now()));
  });
  return router;
}
