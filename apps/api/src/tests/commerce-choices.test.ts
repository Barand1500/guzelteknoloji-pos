import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { createCommerceChoicesRouter } from '../modules/definitions/commerce-choices.routes';
import { StockDefRepository } from '../modules/definitions/stockdef.repository';
import { PaymentRepository } from '../modules/definitions/payment.repository';
import { testEnv } from './helpers';

describe('Ekranların tanımlama seçenekleri', () => {
  it.each(['customers', 'campaigns'])('%s yetkisiyle gerekli seçenekleri okur; ayar yönetimi yetkisi istemez', async (resource) => {
    const names = vi.spyOn(StockDefRepository.prototype, 'names').mockResolvedValue([{ id: '5', name: 'Bayi', shortName: '' }]);
    const prices = vi.spyOn(StockDefRepository.prototype, 'priceLists').mockResolvedValue([]);
    vi.spyOn(PaymentRepository.prototype, 'list').mockResolvedValue([]);
    const app = express();
    app.use((_req, res, next) => {
      res.locals.workspace = { business: { id: 7 }, ownerId: 3, owner: false, permissions: [{ resource, read: true, save: false, delete: false }] };
      next();
    });
    app.use(createCommerceChoicesRouter({} as PrismaClient, testEnv()));
    const res = await request(app).get(`/${resource === 'customers' ? 'musteriler' : 'kampanyalar'}/secenekler`);
    expect(res.status).toBe(200);
    expect(res.body.customerTypes).toEqual([{ id: '5', name: 'Bayi', shortName: '' }]);
    expect(names).toHaveBeenCalledWith(7, 3, 'cari-tipleri');
    expect(prices).toHaveBeenCalledWith(7, 3);
    vi.restoreAllMocks();
  });
});
