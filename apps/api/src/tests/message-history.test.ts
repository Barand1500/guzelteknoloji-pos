import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { createMessageHistoryRouter } from '../modules/orders/message-history';
import type { PrismaClient } from '../lib/prisma';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';

it('geçmişi işletme ve kanalla sınırlar, mesaj/alıcı döndürmez', async () => {
  const findMany = vi
    .fn()
    .mockResolvedValue([
      {
        id: 1,
        olay: 'order.created',
        kanal: 'email',
        durum: 'sent',
        olusturmaTarihi: new Date(),
        gonderimTarihi: new Date(),
      },
    ]);
  const db = { sablonGonderimi: { findMany } } as unknown as PrismaClient;
  const app = express()
    .use((_req, res, next) => {
      res.locals.workspace = { business: { id: 7 }, owner: true };
      next();
    })
    .use(createMessageHistoryRouter(db));
  const result = await request(app).get('/?kanal=email');
  expect(result.status).toBe(200);
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { isletmeId: 7, kanal: 'email' },
      select: expect.not.objectContaining({ alici: true, icerik: true }),
    }),
  );
  expect(result.body[0]).not.toHaveProperty('recipient');
});
it('ayar okuma yetkisi olmayan kullanıcı geçmişi göremez', async () => {
  const app = express()
    .use((_req, res, next) => {
      res.locals.workspace = { business: { id: 7 }, owner: false, permissions: [] };
      next();
    })
    .use(createMessageHistoryRouter({} as PrismaClient))
    .use(errorHandler(createLogger('silent')));
  expect((await request(app).get('/?kanal=sms')).status).toBe(403);
});
