import { Prisma } from '../generated/prisma/client';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { createSeoRouter } from '../modules/seo/seo.routes';
import { testEnv } from './helpers';

function app(db: Record<string, unknown>, permissions: unknown[] = [], owner = true) {
  const server = express();
  server.use(express.json());
  server.use((_req, res, next) => {
    res.locals.workspace = {
      ownerId: 7,
      business: { id: 3, name: 'Demo' },
      user: { id: 42, name: 'Ali', email: null },
      owner,
      permissions,
    };
    next();
  });
  server.use(createSeoRouter(testEnv({ RATE_LIMIT_ENABLED: 'false' }), db as unknown as PrismaClient));
  return server;
}

const redirect = {
  id: 11,
  tur: 'kategori',
  kaynakId: 5,
  eskiAdres: '/eski-adres',
  seoBasligi: '',
  seoAciklamasi: '',
};

describe('SEO Ayarları API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('kategori satırlarını üst zincirli adresle döndürür; yönlendirmeleri hedefe göre süzer', async () => {
    const db = {
      kategori: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            { id: 5, ad: 'Elektronik', ustId: null, seoBasligi: 'Elektronik Ürünler', seoAciklamasi: '' },
            { id: 6, ad: ' Telefonlar ', ustId: 5, seoBasligi: '', seoAciklamasi: '' },
          ])
          .mockResolvedValueOnce([]),
        findUnique: vi.fn().mockResolvedValue({ id: 5, ad: 'Elektronik', ustId: null }),
      },
      seoYonlendirmesi: { findMany: vi.fn().mockResolvedValue([redirect, { ...redirect, id: 12, kaynakId: 6 }]) },
    };
    const server = app(db);

    const res = await request(server).get('/kategori?sayfa=1&adet=10');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({
      id: '5',
      kind: 'kategori',
      name: 'Elektronik',
      address: '/elektronik',
      seoTitle: 'Elektronik Ürünler',
      redirects: [{ id: '11', from: '/eski-adres' }],
    });
    expect(res.body.items[1].address).toBe('/elektronik/telefonlar');
    expect(res.body.items[1].redirects).toEqual([
      { id: '12', from: '/eski-adres', seoTitle: '', seoDescription: '' },
    ]);
  });

  it('arama terimini where koşuluna ekler', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const findMany = vi.fn().mockResolvedValue([]);
    const db = {
      kategori: { count, findMany },
      seoYonlendirmesi: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const server = app(db);

    await request(server).get('/kategori?ara=bilgisayar');
    const where = count.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({
      kullaniciId: 42,
      OR: expect.arrayContaining([
        { seoBasligi: { contains: 'bilgisayar' } },
        { seoAciklamasi: { contains: 'bilgisayar' } },
      ]),
    });
  });

  it('marka ve ürün satırlarını kendi adres kalıbıyla döndürür', async () => {
    const db = {
      marka: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi
          .fn()
          .mockResolvedValue([{ kimlik: 9, markaAdi: 'Anka Kırtasiye', seoBasligi: '', seoAciklamasi: '' }]),
      },
      stokKarti: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi
          .fn()
          .mockResolvedValue([{ kimlik: 77, stokAdi: 'Kalem', stokKodu: 'KL-1', seoBasligi: '', seoAciklamasi: '' }]),
      },
      seoYonlendirmesi: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const server = app(db);

    const brands = await request(server).get('/marka');
    expect(brands.body.items[0]).toMatchObject({
      id: '9',
      name: 'Anka Kırtasiye',
      address: '/marka/anka-kirtasiye',
    });
    const products = await request(server).get('/urun');
    expect(products.body.items[0]).toMatchObject({
      id: '77',
      name: 'Kalem',
      address: '/urun/kalem',
    });
  });

  it('sabit sayfa listesi boş döner ve kayıt yazma reddedilir', async () => {
    const server = app({});
    const list = await request(server).get('/sabit-sayfa');
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ total: 0, items: [] });

    const save = await request(server).post('/sabit-sayfa/1').send({ seoTitle: 'A', seoDescription: 'B' });
    expect(save.status).toBe(404);
  });

  it('SEO başlık ve açıklamayı kendi kaydına yazar', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { kategori: { updateMany }, seoYonlendirmesi: { findMany: vi.fn() } };
    const server = app(db);

    const res = await request(server)
      .post('/kategori/5')
      .send({ seoTitle: 'Elektronik', seoDescription: 'Ucuz elektronik' });
    expect(res.status).toBe(204);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 5, kullaniciId: 42 },
      data: { seoBasligi: 'Elektronik', seoAciklamasi: 'Ucuz elektronik' },
    });
  });

  it('başkasının kaydına yazamaz ve doğrulama hatalarını 400 döndürür', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const server = app({ kategori: { updateMany } });

    const notFound = await request(server)
      .post('/kategori/99')
      .send({ seoTitle: 'A', seoDescription: 'B' });
    expect(notFound.status).toBe(404);

    const tooLong = await request(server)
      .post('/kategori/5')
      .send({ seoTitle: 'x'.repeat(251), seoDescription: '' });
    expect(tooLong.status).toBe(400);

    const badKind = await request(server).get('/restorant');
    expect(badKind.status).toBe(400);

    const tooMany = await request(server).get('/kategori?adet=201');
    expect(tooMany.status).toBe(400);
  });

  it('yönlendirme ekler; sahipsiz hedef 404, tekrar adres 409 döner', async () => {
    const create = vi.fn().mockResolvedValue({});
    const db = {
      kategori: { findFirst: vi.fn().mockResolvedValue({ id: 5 }) },
      marka: { findFirst: vi.fn().mockResolvedValue(null) },
      seoYonlendirmesi: { create },
    };
    const server = app(db);
    const body = { kind: 'kategori', id: '5', from: '/eski-adres', seoTitle: '', seoDescription: '' };

    const ok = await request(server).post('/yonlendirme').send(body);
    expect(ok.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: { businessId: 3, tur: 'kategori', kaynakId: 5, eskiAdres: '/eski-adres', seoBasligi: '', seoAciklamasi: '' },
    });

    const foreign = await request(server)
      .post('/yonlendirme')
      .send({ ...body, kind: 'marka', id: '9' });
    expect(foreign.status).toBe(404);

    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const conflict = await request(server).post('/yonlendirme').send(body);
    expect(conflict.status).toBe(409);
  });

  it('yönlendirme silinir; olmayan kayıt 404 döner', async () => {
    const deleteMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const server = app({ seoYonlendirmesi: { deleteMany } });

    const ok = await request(server).post('/yonlendirme/11/sil');
    expect(ok.status).toBe(204);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 11, businessId: 3 } });

    const missing = await request(server).post('/yonlendirme/12/sil');
    expect(missing.status).toBe(404);
  });

  it('yönlendirmenin kendi başlık/açıklaması güncellenir', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const server = app({ seoYonlendirmesi: { updateMany } });

    const ok = await request(server)
      .post('/yonlendirme/11')
      .send({ seoTitle: 'Eski Sayfa', seoDescription: 'Yeni adrese taşındı' });
    expect(ok.status).toBe(204);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 11, businessId: 3 },
      data: { seoBasligi: 'Eski Sayfa', seoAciklamasi: 'Yeni adrese taşındı' },
    });

    updateMany.mockResolvedValueOnce({ count: 0 });
    const missing = await request(server)
      .post('/yonlendirme/99')
      .send({ seoTitle: '', seoDescription: '' });
    expect(missing.status).toBe(404);
  });

  it('ayarlar okuma/yazma yetkisi olmayan kullanıcıyı engeller', async () => {
    const server = app({ kategori: { count: vi.fn() } }, [], false);
    const read = await request(server).get('/kategori');
    expect(read.status).toBe(403);
  });
});
