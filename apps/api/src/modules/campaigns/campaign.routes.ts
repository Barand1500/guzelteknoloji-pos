import { Router, type Response } from 'express';
import { z } from 'zod';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { AccessContext } from '../workspace/workspace.access';
import { requirePermission } from '../workspace/workspace.access';
import { resolveCampaignAudience } from './campaign-audience';
import { quoteCampaignCart } from './campaign-quote';

type CampaignKind = 'cart' | 'shipping';
type DiscountKind = 'percent' | 'amount';
const kindBySlug: Record<string, CampaignKind> = {
  'sepet-indirimi': 'cart',
  'ucretsiz-kargo': 'shipping',
};
const dbKind = (kind: CampaignKind) => (kind === 'cart' ? 'SEPET_INDIRIMI' : 'UCRETSIZ_KARGO');
const dbDiscount = (kind: DiscountKind): 'YUZDE' | 'TUTAR' =>
  kind === 'percent' ? 'YUZDE' : 'TUTAR';
const positiveId = /^[1-9]\d{0,9}$/;
const idList = (label: string) =>
  z
    .array(z.string().regex(positiveId))
    .max(500)
    .refine((ids) => ids.every((id) => Number(id) <= 2_147_483_647), `${label} kimliği geçersiz.`)
    .refine((ids) => new Set(ids).size === ids.length, `${label} içinde tekrar var.`);
const generalSchema = z.strictObject({
  active: z.boolean(),
  customerTypes: z.array(z.string().trim().min(1).max(120)).max(500),
  priceLists: z.array(z.string().trim().min(1).max(120)).max(500),
  minTotal: z.number().finite().int().min(0).max(1_000_000_000_000),
  discountKind: z.enum(['percent', 'amount']),
  discountValue: z.number().finite().min(0).max(1_000_000_000_000),
});
const ruleSchema = generalSchema.extend({
  categoryIds: idList('Kategori'),
  brandIds: idList('Marka'),
});

function contextOf(res: Response): AccessContext {
  const context = res.locals.workspace as AccessContext | undefined;
  if (!context) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
  return context;
}

function campaignKind(slug: string): CampaignKind {
  const kind = kindBySlug[slug];
  if (!kind) throw new HttpError(404, 'NOT_FOUND', 'Kampanya bulunamadı.');
  return kind;
}

function stringList(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

const asNumber = (value: Prisma.Decimal | null) => (value === null ? 0 : Number(value.toString()));

function defaultGeneral() {
  return {
    active: false,
    customerTypes: [],
    priceLists: [],
    minTotal: 0,
    discountKind: 'percent' as const,
    discountValue: 0,
  };
}

function toGeneral(row: {
  durum: boolean;
  customerTypes: Prisma.JsonValue;
  priceLists: Prisma.JsonValue;
  minTotal: Prisma.Decimal;
  discountKind: string | null;
  discountValue: Prisma.Decimal | null;
}) {
  return {
    active: row.durum,
    customerTypes: stringList(row.customerTypes),
    priceLists: stringList(row.priceLists),
    minTotal: asNumber(row.minTotal),
    discountKind: row.discountKind === 'TUTAR' ? ('amount' as const) : ('percent' as const),
    discountValue: asNumber(row.discountValue),
  };
}

function toRule(row: {
  id: number;
  durum: boolean;
  customerTypes: Prisma.JsonValue;
  priceLists: Prisma.JsonValue;
  minTotal: Prisma.Decimal;
  discountKind: string | null;
  discountValue: Prisma.Decimal | null;
  categoryLinks: { categoryId: number }[];
  brandLinks: { brandId: number }[];
}) {
  return {
    id: String(row.id),
    active: row.durum,
    categoryIds: row.categoryLinks.map((link) => String(link.categoryId)),
    brandIds: row.brandLinks.map((link) => String(link.brandId)),
    customerTypes: stringList(row.customerTypes),
    priceLists: stringList(row.priceLists),
    minTotal: asNumber(row.minTotal),
    discountKind: row.discountKind === 'TUTAR' ? ('amount' as const) : ('percent' as const),
    discountValue: asNumber(row.discountValue),
  };
}

function validateValues(value: z.infer<typeof generalSchema>, kind: CampaignKind) {
  if (kind === 'cart' && value.discountKind === 'percent' && value.discountValue > 100)
    throw new HttpError(400, 'VALIDATION_ERROR', 'İndirim oranı %100’den büyük olamaz.');
}

async function ensureScope(
  db: PrismaClient,
  ownerId: number,
  categoryIds: string[],
  brandIds: string[],
) {
  const [categories, brands] = await Promise.all([
    categoryIds.length
      ? db.kategori.findMany({
          where: { kullaniciId: ownerId, id: { in: categoryIds.map(Number) } },
          select: { id: true },
        })
      : Promise.resolve([]),
    brandIds.length
      ? db.marka.findMany({
          where: { kullaniciKimligi: ownerId, kimlik: { in: brandIds.map(Number) } },
          select: { kimlik: true },
        })
      : Promise.resolve([]),
  ]);
  if (categories.length !== categoryIds.length || brands.length !== brandIds.length)
    throw new HttpError(400, 'VALIDATION_ERROR', 'Seçilen kategori veya marka bulunamadı.');
}

const campaignInclude = {
  rules: {
    orderBy: { id: 'desc' as const },
    include: { categoryLinks: true, brandLinks: true },
  },
};

function campaignData(value: z.infer<typeof generalSchema>, kind: CampaignKind) {
  return {
    durum: value.active,
    customerTypes: value.customerTypes as Prisma.InputJsonValue,
    priceLists: value.priceLists as Prisma.InputJsonValue,
    minTotal: new Prisma.Decimal(value.minTotal),
    discountKind: kind === 'cart' ? dbDiscount(value.discountKind) : null,
    discountValue: kind === 'cart' ? new Prisma.Decimal(value.discountValue) : null,
  };
}

export function createCampaignRouter(db: PrismaClient) {
  const router = Router();
  router.post('/hesapla', async (req, res) => {
    const ctx = contextOf(res);
    requirePermission(ctx, 'campaigns', 'read');
    res.set('Cache-Control', 'no-store').json(await quoteCampaignCart(db, ctx.business.id, ctx.ownerId, req.body));
  });

  router.get('/:tur', async (req, res, next) => {
    try {
      const ctx = contextOf(res);
      requirePermission(ctx, 'campaigns', 'read');
      const kind = campaignKind(req.params.tur);
      const row = await db.kampanya.findUnique({
        where: { userId_kind: { userId: ctx.ownerId, kind: dbKind(kind) } },
        include: campaignInclude,
      });
      res.json({
        general: row ? toGeneral(row) : defaultGeneral(),
        rules: row?.rules.map(toRule) ?? [],
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:tur/genel', async (req, res, next) => {
    try {
      const ctx = contextOf(res);
      requirePermission(ctx, 'campaigns', 'save');
      const kind = campaignKind(req.params.tur);
      const value = generalSchema.parse(req.body);
      validateValues(value, kind);
      Object.assign(value, await resolveCampaignAudience(db, ctx.business.id, ctx.ownerId, value));
      const data = campaignData(value, kind);
      await db.kampanya.upsert({
        where: { userId_kind: { userId: ctx.ownerId, kind: dbKind(kind) } },
        create: { userId: ctx.ownerId, kind: dbKind(kind), ...data },
        update: data,
      });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post('/:tur/kurallar', async (req, res, next) => {
    try {
      const ctx = contextOf(res);
      requirePermission(ctx, 'campaigns', 'save');
      const kind = campaignKind(req.params.tur);
      const value = ruleSchema.parse(req.body);
      validateValues(value, kind);
      Object.assign(value, await resolveCampaignAudience(db, ctx.business.id, ctx.ownerId, value));
      await ensureScope(db, ctx.ownerId, value.categoryIds, value.brandIds);
      const created = await db.$transaction(async (tx) => {
        const campaign = await tx.kampanya.upsert({
          where: { userId_kind: { userId: ctx.ownerId, kind: dbKind(kind) } },
          create: {
            userId: ctx.ownerId,
            kind: dbKind(kind),
            ...campaignData(defaultGeneral(), kind),
          },
          update: {},
        });
        return tx.kampanyaKural.create({
          data: {
            campaignId: campaign.id,
            ...campaignData(value, kind),
            categoryLinks: { create: value.categoryIds.map((id) => ({ categoryId: Number(id) })) },
            brandLinks: { create: value.brandIds.map((id) => ({ brandId: Number(id) })) },
          },
          include: { categoryLinks: true, brandLinks: true },
        });
      });
      res.status(201).json(toRule(created));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:tur/kurallar/:id', async (req, res, next) => {
    try {
      const ctx = contextOf(res);
      requirePermission(ctx, 'campaigns', 'save');
      const kind = campaignKind(req.params.tur);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647)
        throw new HttpError(404, 'NOT_FOUND', 'Kural bulunamadı.');
      const value = ruleSchema.parse(req.body);
      validateValues(value, kind);
      Object.assign(value, await resolveCampaignAudience(db, ctx.business.id, ctx.ownerId, value));
      await ensureScope(db, ctx.ownerId, value.categoryIds, value.brandIds);
      const updated = await db.$transaction(async (tx) => {
        const existing = await tx.kampanyaKural.findFirst({
          where: { id, campaign: { userId: ctx.ownerId, kind: dbKind(kind) } },
          select: { id: true },
        });
        if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Kural bulunamadı.');
        return tx.kampanyaKural.update({
          where: { id },
          data: {
            ...campaignData(value, kind),
            categoryLinks: {
              deleteMany: {},
              create: value.categoryIds.map((categoryId) => ({ categoryId: Number(categoryId) })),
            },
            brandLinks: {
              deleteMany: {},
              create: value.brandIds.map((brandId) => ({ brandId: Number(brandId) })),
            },
          },
          include: { categoryLinks: true, brandLinks: true },
        });
      });
      res.json(toRule(updated));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:tur/kurallar/:id/aktiflik', async (req, res, next) => {
    try {
      const ctx = contextOf(res);
      requirePermission(ctx, 'campaigns', 'save');
      const kind = campaignKind(req.params.tur);
      const id = Number(req.params.id);
      const body = z.strictObject({ active: z.boolean() }).parse(req.body);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647)
        throw new HttpError(404, 'NOT_FOUND', 'Kural bulunamadı.');
      const result = await db.kampanyaKural.updateMany({
        where: { id, campaign: { userId: ctx.ownerId, kind: dbKind(kind) } },
        data: { durum: body.active },
      });
      if (!result.count) throw new HttpError(404, 'NOT_FOUND', 'Kural bulunamadı.');
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post('/:tur/kurallar/:id/sil', async (req, res, next) => {
    try {
      const ctx = contextOf(res);
      requirePermission(ctx, 'campaigns', 'delete');
      const kind = campaignKind(req.params.tur);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647)
        throw new HttpError(404, 'NOT_FOUND', 'Kural bulunamadı.');
      const result = await db.kampanyaKural.deleteMany({
        where: { id, campaign: { userId: ctx.ownerId, kind: dbKind(kind) } },
      });
      if (!result.count) throw new HttpError(404, 'NOT_FOUND', 'Kural bulunamadı.');
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
