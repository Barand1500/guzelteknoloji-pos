import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../config/env';
import type { PrismaClient } from '../lib/prisma';
import { createMerchantFeedRouter, merchantProductUrlTemplateSchema, merchantRssXml, type MerchantFeedItem } from '../modules/site/site.feed';

describe('Google/Meta RSS ürün feed biçimi', () => {
  it('ürün alanlarını Merchant Center RSS 2.0 içinde XML güvenli yazar', () => {
    const item: MerchantFeedItem = {
      id: 'SKU-1',
      title: 'Kahve & Çay <Set>',
      description: 'Sıcak içecekler için ürün',
      link: 'https://magaza.example/urun/SKU-1',
      imageLink: 'https://pos.example/api/site/feed/1/images/7',
      availability: 'in stock',
      price: '129.90 TRY',
      condition: 'new',
      gtin: '8690000000001',
      brand: 'Örnek Marka',
    };

    const xml = merchantRssXml('Deneme & Mağaza', 'https://magaza.example', [item]);

    expect(xml).toContain('<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">');
    expect(xml).toContain('<title>Deneme &amp; Mağaza</title>');
    expect(xml).toContain('<g:title>Kahve &amp; Çay &lt;Set&gt;</g:title>');
    expect(xml).toContain('<g:price>129.90 TRY</g:price>');
    expect(xml).toContain('<g:gtin>8690000000001</g:gtin>');
    expect(xml).toContain('<g:brand>Örnek Marka</g:brand>');
    expect(xml).toContain('</channel></rss>');
  });

  it('isteğe bağlı alanları boş bırakır ve eksik ürünleri uydurmaz', () => {
    const item: MerchantFeedItem = {
      id: '2',
      title: 'Ürün',
      description: 'Açıklama',
      link: 'https://magaza.example/urun/2',
      imageLink: 'https://pos.example/images/2',
      availability: 'out of stock',
      price: '0.00 TRY',
      condition: 'new',
    };
    const xml = merchantRssXml('Mağaza', 'https://magaza.example', [item]);
    expect(xml).toContain('<g:availability>out of stock</g:availability>');
    expect(xml).not.toContain('<g:gtin>');
    expect(xml).not.toContain('<g:brand>');
  });

  it('yalnızca HTTPS ürün adresi ve bilinen ürün belirteçlerini kabul eder', () => {
    expect(merchantProductUrlTemplateSchema.safeParse('https://shop.example/p/{slug}').success).toBe(true);
    expect(merchantProductUrlTemplateSchema.safeParse('http://shop.example/p/{id}').success).toBe(false);
    expect(merchantProductUrlTemplateSchema.safeParse('https://shop.example/products').success).toBe(false);
  });
});

describe('Feed işletme kapsamı', () => {
  it.each(['/7/google.xml', '/7/images/99'])('%s yalnızca işletme kataloğunu kullanır', async (path) => {
    const db = {
      isletme: { findUnique: vi.fn(async () => ({ ownerId: 3, name: 'Mağaza', members: [{ userId: 9 }] })) },
      isletmeAyari: { findUnique: vi.fn(async () => ({ values: { enabled: 'true', productUrlTemplate: 'https://shop.example/p/{id}' } })) },
      fiyatListesiAyari: { findFirst: vi.fn(async () => null) },
      stokSecenegi: { findFirst: vi.fn(async () => ({ kimlik: 1 })) },
      stokKarti: { findMany: vi.fn(async () => []) },
      stokGorseli: { findFirst: vi.fn(async () => null) },
    };
    const env = parseEnv({ NODE_ENV: 'test', APP_URL: 'https://pos.example', DATABASE_URL: 'mysql://test:test@localhost/test', COOKIE_SECRET: 'test-secret-with-at-least-32-characters' });
    const app = express().use(createMerchantFeedRouter(db as unknown as PrismaClient, env));
    await request(app).get(path).expect(path.endsWith('xml') ? 200 : 404);
    if (path.endsWith('xml'))
      expect(db.stokKarti.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { kullaniciKimligi: { in: [3] }, satisAcik: true } }));
    else
      expect(db.stokGorseli.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 99, stokKarti: { kullaniciKimligi: { in: [3] }, satisAcik: true } } }));
  });
});
