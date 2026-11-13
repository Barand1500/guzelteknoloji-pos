import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { OrderLifecycle } from './order-lifecycle';
import { createOrderSchema } from '@gt/shared';
import { quoteCampaignCartTx } from '../campaigns/campaign-quote';
import type { OrderMessageHandler } from './order-message-event';

const id = z.coerce.number().int().positive().max(2147483647);
export function createOrderLifecycleRouter(db: PrismaClient, notify?: OrderMessageHandler) {
  const router = Router();
  const service = new OrderLifecycle(db, notify);
  router.use((req, res, next) => {
    const ctx = res.locals.workspace as AccessContext | undefined;
    if (!ctx) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
    requirePermission(
      ctx,
      'orders',
      req.method === 'GET' || req.path === '/onizleme' ? 'read' : 'save',
    );
    res.set('Cache-Control', 'no-store');
    next();
  });
  const context = (ctx: AccessContext) => ({
    businessId: ctx.business.id,
    ownerId: ctx.ownerId,
    actorId: ctx.user.id,
  });
  router.get('/istek/:requestId', async (req, res) =>
    res.json(
      await service.lookup(res.locals.workspace.business.id, z.uuid().parse(req.params.requestId)),
    ),
  );
  router.post('/onizleme', async (req, res) => {
    const data = createOrderSchema.parse(req.body);
    const ctx = context(res.locals.workspace);
    const result = await db.$transaction(async (tx) => {
      const customer = await tx.musteri.findFirst({
        where: { id: Number(data.customerId), businessId: ctx.businessId, durum: true },
      });
      const method = await tx.odemeSekli.findFirst({
        where: { id: Number(data.paymentMethodId), isletmeId: ctx.businessId, aktif: true },
      });
      if (!customer || !method)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Müşteri veya ödeme şekli bulunamadı.');
      const type = await tx.cariTipi.findFirst({
        where: { isletmeId: ctx.businessId, ad: customer.cariTipi },
      });
      return quoteCampaignCartTx(tx, ctx.businessId, ctx.ownerId, {
        priceListId: data.priceListId,
        customerTypeId: type ? String(type.id) : null,
        shippingFee: method.kargoYok ? 0 : data.shippingFee,
        items: data.items,
      });
    });
    res.json(result);
  });
  router.post('/', async (req, res) =>
    res.status(201).json(await service.create(context(res.locals.workspace), req.body)),
  );
  router.get('/:id/islemler', async (req, res) =>
    res.json(await service.detail(res.locals.workspace.business.id, id.parse(req.params.id))),
  );
  router.post('/:id/tahsilat', async (req, res) => {
    await service.collect(context(res.locals.workspace), id.parse(req.params.id), req.body);
    res.status(204).end();
  });
  router.post('/:id/iade', async (req, res) =>
    res
      .status(201)
      .json(
        await service.requestReturn(
          context(res.locals.workspace),
          id.parse(req.params.id),
          req.body,
        ),
      ),
  );
  router.post('/iade/:id/tamamla', async (req, res) => {
    await service.completeReturn(context(res.locals.workspace), id.parse(req.params.id), req.body);
    res.status(204).end();
  });
  return router;
}
