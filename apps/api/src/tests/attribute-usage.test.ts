import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import type { AuthService } from '../modules/auth/auth.service';
import { createAttributeRouter } from '../modules/catalog/attribute.routes';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';
import { testEnv } from './helpers';

function setup() {
  const remove = vi.fn();
  const change = vi.fn();
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    ozellikSablonu: {
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
      delete: remove,
      update: change,
    },
    ozellikGrubu: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 2, sablonId: 1, tur: 'color', coklu: true, varyant: true }),
      delete: remove,
      update: change,
    },
    ozellikDegeri: { findFirst: vi.fn().mockResolvedValue({ id: 3, grupId: 2 }), delete: remove },
    stokOzellikDegeri: { findFirst: vi.fn().mockResolvedValue({ degerId: 3 }) },
  };
  const db = {
    $transaction: (fn: (arg: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient;
  const auth = {
    getSession: vi.fn().mockResolvedValue({ user: { id: '1' } }),
  } as unknown as AuthService;
  const app = express();
  app.use(express.json(), (req, _res, next) => {
    req.cookies = { gt_session: 'token' };
    next();
  });
  app.use(
    createAttributeRouter(testEnv({ RATE_LIMIT_ENABLED: 'false' }), auth, db),
    errorHandler(createLogger('silent')),
  );
  return { app, remove, change, tx };
}
describe('Kullanılan özellik tanımları', () => {
  it.each(['sablonlar/1', 'gruplar/2', 'degerler/3'])(
    'kullanılan %s silinmeden açıklayıcı uyarı verir',
    async (path) => {
      const s = setup();
      const result = await request(s.app)
        .post('/' + path + '/sil')
        .expect(409);
      expect(result.body.error.message).toContain('kullanılıyor');
      expect(s.remove).not.toHaveBeenCalled();
    },
  );
  it('kullanılan grubun varyant ayarını kapatmaya izin vermez', async () => {
    const s = setup();
    await request(s.app)
      .post('/gruplar/2')
      .send({
        templateId: '1',
        name: 'Renk',
        kind: 'color',
        filter: true,
        multiple: true,
        variant: false,
        showOnImage: false,
        position: 'tl',
        size: 'medium',
      })
      .expect(409);
    expect(s.change).not.toHaveBeenCalled();
  });
  it('şablonun kapsamını kullanılan ürünlerin dışına daraltmaz', async () => {
    const s = setup();
    const result = await request(s.app)
      .post('/sablonlar/1')
      .send({ name: 'Renkler', allProducts: false, categoryIds: ['5'] })
      .expect(409);
    expect(result.body.error.message).toContain('dışındaki ürünlerde');
    expect(s.change).not.toHaveBeenCalled();
  });
});
