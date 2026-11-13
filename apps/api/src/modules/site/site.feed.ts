import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { BrandLogoStorage, logoMime } from '../brands/brand-logo.storage';

export type MerchantFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  availability: 'in stock' | 'out of stock';
  price: string;
  condition: 'new';
  gtin?: string;
  brand?: string;
};

const xml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export function merchantRssXml(title: string, siteUrl: string, items: MerchantFeedItem[]) {
  const entries = items
    .map((item) =>
      [
        '<item>',
        `<g:id>${xml(item.id)}</g:id>`,
        `<g:title>${xml(item.title)}</g:title>`,
        `<g:description>${xml(item.description)}</g:description>`,
        `<g:link>${xml(item.link)}</g:link>`,
        `<g:image_link>${xml(item.imageLink)}</g:image_link>`,
        `<g:availability>${item.availability}</g:availability>`,
        `<g:price>${xml(item.price)}</g:price>`,
        `<g:condition>${item.condition}</g:condition>`,
        ...(item.gtin ? [`<g:gtin>${xml(item.gtin)}</g:gtin>`] : []),
        ...(item.brand ? [`<g:brand>${xml(item.brand)}</g:brand>`] : []),
        '</item>',
      ].join(''),
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>${xml(title)}</title><link>${xml(siteUrl)}</link><description>${xml(title)} ürün feed'i</description>${entries}</channel></rss>`;
}

export const merchantProductUrlTemplateSchema = z
  .string()
  .trim()
  .min(1, 'Mağaza ürün URL şablonu gerekli.')
  .max(1000)
  .refine((value) => /^https:\/\//i.test(value), 'Ürün URL şablonu HTTPS ile başlamalı.')
  .refine(
    (value) => /\{(?:id|code|slug)\}/.test(value),
    'Şablonda {id}, {code} veya {slug} alanı olmalı.',
  )
  .refine((value) => {
    try {
      const url = new URL(
        value.replaceAll('{id}', '1').replaceAll('{code}', 'SKU').replaceAll('{slug}', 'urun'),
      );
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Geçerli bir HTTPS ürün adresi girin.');

const idSchema = z.coerce.number().int().positive();
function xmlResponse(res: import('express').Response, body: string) {
  res.status(200).set('Content-Type', 'application/rss+xml; charset=utf-8').send(body);
}

export function createMerchantFeedRouter(db: PrismaClient, env: Env) {
  const router = Router();
  const storage = new BrandLogoStorage(env.UPLOADS_DIR, 'urunler');
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 60 }));

  async function businessUsers(businessId: number) {
    const business = await db.isletme.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    // Katalog, ürün ekranlarında olduğu gibi işletme sahibinin kimliğine bağlıdır.
    return business ? [business.ownerId] : null;
  }
  async function feedEnabled(businessId: number) {
    const setting = await db.isletmeAyari.findUnique({
      where: { businessId_section: { businessId, section: 'site_xml' } },
    });
    const values = setting?.values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return false;
    return (values as Record<string, unknown>).enabled === 'true';
  }

  router.get('/:businessId/google.xml', async (req, res) => {
    const businessId = idSchema.parse(req.params.businessId);
    if (!(await feedEnabled(businessId))) return res.sendStatus(404);
    const userIds = await businessUsers(businessId);
    if (!userIds) return res.sendStatus(404);
    const setting = await db.isletmeAyari.findUnique({
      where: { businessId_section: { businessId, section: 'site_xml' } },
    });
    const values =
      setting?.values && typeof setting.values === 'object' && !Array.isArray(setting.values)
        ? (setting.values as Record<string, unknown>)
        : {};
    // Şablon arayüzden kaldırıldı; kayıtlı değer yoksa mağazanın varsayılan ürün adresi kullanılır
    // (tek vitrin: guzelteknoloji.com). Çok kiracılı kurulumda işletme ayarına taşınmalı.
    const DEFAULT_PRODUCT_URL_TEMPLATE = 'https://guzelteknoloji.com/urun/{slug}';
    const template = merchantProductUrlTemplateSchema.safeParse(values.productUrlTemplate);
    const productUrlTemplate = template.success ? template.data : DEFAULT_PRODUCT_URL_TEMPLATE;
    const business = await db.isletme.findUnique({
      where: { id: businessId },
      select: { name: true },
    });
    const defaultList = await db.fiyatListesiAyari.findFirst({
      where: { isletmeId: businessId, varsayilan: true },
      select: { secenekId: true },
    });
    const saleList =
      defaultList?.secenekId ??
      (
        await db.stokSecenegi.findFirst({
          where: {
            kullaniciKimligi: { in: userIds },
            listeTuru: 'priceLists',
            secenekKodu: 'fiyat',
            durum: true,
          },
          select: { kimlik: true },
        })
      )?.kimlik ??
      (
        await db.stokSecenegi.findFirst({
          where: { kullaniciKimligi: { in: userIds }, listeTuru: 'priceLists', durum: true },
          orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
          select: { kimlik: true },
        })
      )?.kimlik;
    const products = await db.stokKarti.findMany({
      where: { kullaniciKimligi: { in: userIds }, satisAcik: true },
      select: {
        kimlik: true,
        stokKodu: true,
        stokAdi: true,
        seoAciklamasi: true,
        envanterTakibi: true,
        stokMiktari: true,
        marka: { select: { markaAdi: true } },
        birimler: {
          where: { anaBirim: true },
          take: 1,
          select: {
            barkodlar: {
              where: { barkodTuru: { in: ['EAN8', 'EAN13', 'UPCA'] } },
              take: 1,
              select: { barkodTuru: true, barkod: true },
            },
            fiyatlar: {
              where: { fiyatYonu: 'satis', ...(saleList ? { fiyatListesiKimligi: saleList } : {}) },
              take: 1,
              select: {
                girilenFiyat: true,
                paraBirimi: true,
                iskontoOrani: true,
                kdvOrani: true,
                kdvDahilGirildi: true,
              },
            },
          },
        },
        gorseller: { orderBy: { sira: 'asc' }, take: 1, select: { id: true } },
      },
    });
    const base = `${env.APP_URL}/api/site-feed/${businessId}`;
    const items: MerchantFeedItem[] = [];
    for (const product of products) {
      const unit = product.birimler[0];
      const price = unit?.fiyatlar[0];
      const image = product.gorseller[0];
      if (
        !unit ||
        !price?.girilenFiyat ||
        price.girilenFiyat.lte(0) ||
        !image ||
        !product.stokAdi?.trim()
      )
        continue;
      const id = String(product.kimlik);
      const code = product.stokKodu?.trim() || id;
      const slug =
        (product.stokAdi ?? '')
          .toLocaleLowerCase('tr')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || id;
      const link = productUrlTemplate
        .replaceAll('{id}', encodeURIComponent(id))
        .replaceAll('{code}', encodeURIComponent(code))
        .replaceAll('{slug}', encodeURIComponent(slug));
      const discounted = price.girilenFiyat.mul(
        new Prisma.Decimal(1).minus((price.iskontoOrani ?? new Prisma.Decimal(0)).div(100)),
      );
      const factor = new Prisma.Decimal(1).plus((price.kdvOrani ?? new Prisma.Decimal(0)).div(100));
      const amount = price.kdvDahilGirildi ? discounted : discounted.mul(factor);
      const barcode = unit.barkodlar[0];
      const gtin =
        barcode?.barkod.match(/^\d+$/) && [8, 12, 13, 14].includes(barcode.barkod.length)
          ? barcode.barkod
          : undefined;
      items.push({
        id,
        title: product.stokAdi!,
        description: product.seoAciklamasi || product.stokAdi!,
        link,
        imageLink: `${base}/images/${image.id}`,
        availability:
          product.envanterTakibi === 'yok' || product.stokMiktari.gt(0)
            ? 'in stock'
            : 'out of stock',
        price: `${amount.toFixed(2)} ${price.paraBirimi}`,
        condition: 'new',
        ...(gtin ? { gtin } : {}),
        ...(product.marka?.markaAdi ? { brand: product.marka.markaAdi } : {}),
      });
    }
    const siteUrl = new URL(productUrlTemplate).origin;
    res.set('Cache-Control', 'public, max-age=300');
    xmlResponse(res, merchantRssXml(business?.name ?? 'Ürün kataloğu', siteUrl, items));
  });

  router.get('/:businessId/images/:imageId', async (req, res) => {
    const businessId = idSchema.parse(req.params.businessId);
    const imageId = idSchema.parse(req.params.imageId);
    if (!(await feedEnabled(businessId))) return res.sendStatus(404);
    const userIds = await businessUsers(businessId);
    if (!userIds) return res.sendStatus(404);
    const image = await db.stokGorseli.findFirst({
      where: { id: imageId, stokKarti: { kullaniciKimligi: { in: userIds }, satisAcik: true } },
      select: { dosyaAdi: true },
    });
    if (!image) return res.sendStatus(404);
    const file = await storage.read(image.dosyaAdi);
    res.set('Cache-Control', 'public, max-age=3600').type(logoMime(file.format)).send(file.data);
  });
  return router;
}
