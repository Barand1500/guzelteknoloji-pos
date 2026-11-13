import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { errorHandler } from '../middleware/error-handler';
import { createOrderLifecycleRouter } from '../modules/orders/order-lifecycle.routes';
import { OrderLifecycle } from '../modules/orders/order-lifecycle';

describe('Sipariş finansal işlem yetkileri', () => {
  it('okuma yetkisi finansal detay için yeterli, tahsilat için yetersizdir', async () => {
    const detail = vi.spyOn(OrderLifecycle.prototype, 'detail').mockResolvedValue({ managed: false, paymentKind: null, payments: [], returns: [] });
    const collect = vi.spyOn(OrderLifecycle.prototype, 'collect');
    const app = express().use(express.json());
    app.use((_req, res, next) => {
      res.locals.workspace = { business: { id: 3 }, user: { id: 9 }, ownerId: 7, owner: false, permissions: [{ resource: 'orders', read: true, save: false, delete: false }] };
      next();
    });
    app.use(createOrderLifecycleRouter({} as PrismaClient), errorHandler(createLogger('silent')));
    expect((await request(app).get('/10/islemler')).status).toBe(200);
    expect(detail).toHaveBeenCalledWith(3, 10);
    expect((await request(app).post('/10/tahsilat').send({})).status).toBe(403);
    expect(collect).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it('işletme bağlamı olmadan işlem kabul etmez', async () => {
    const app = express().use(createOrderLifecycleRouter({} as PrismaClient), errorHandler(createLogger('silent')));
    expect((await request(app).get('/10/islemler')).status).toBe(401);
  });
});
