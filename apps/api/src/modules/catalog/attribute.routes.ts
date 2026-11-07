import { z } from 'zod';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { AuthService } from '../auth/auth.service';
import { BrandLogoStorage, logoMime } from '../brands/brand-logo.storage';
import { categoryIds, categoryKey } from './category.schemas';
import { positionSchema, sizeSchema } from './deal.routes';
import {
  catalogRouter,
  catalogWrite,
  checkOrder,
  fold,
  imageFile,
  rollbackImage,
} from './catalog.common';

const name = z.string().trim().min(1, 'Ad girin.').max(120);
const templateSchema = z
  .strictObject({ name, allProducts: z.boolean(), categoryIds })
  .refine(
    (d) => d.allProducts || d.categoryIds.length > 0,
    'En az bir kategori veya tüm ürünleri seçin.',
  );
const groupSchema = z.strictObject({
  templateId: categoryKey,
  name,
  kind: z.enum(['text', 'color', 'image']),
  filter: z.boolean(),
  multiple: z.boolean(),
  variant: z.boolean(),
  showOnImage: z.boolean(),
  position: positionSchema,
  size: sizeSchema,
});
const valueSchema = z.strictObject({
  code: z.string().trim().min(1, 'Kod girin.').max(120),
  name,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Geçerli bir renk seçin.')
    .nullable(),
  imageUrl: z.string().max(3000000).nullable(),
});

export function createAttributeRouter(env: Env, auth: AuthService, db: PrismaClient) {
  const router = catalogRouter(env, auth);
  const storage = new BrandLogoStorage(env.UPLOADS_DIR, 'ozellikler');
  const url = (id: number, file: string | null) =>
    file ? '/api/ozellikler/degerler/' + id + '/gorsel?v=' + file : null;
  const template = async (tx: Prisma.TransactionClient, user: number, id: number) => {
    const row = await tx.ozellikSablonu.findFirst({ where: { id, kullaniciId: user } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Şablon bulunamadı.');
    return row;
  };
  const group = async (tx: Prisma.TransactionClient, user: number, id: number) => {
    const row = await tx.ozellikGrubu.findFirst({ where: { id, sablon: { kullaniciId: user } } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Grup bulunamadı.');
    return row;
  };
  const value = async (tx: Prisma.TransactionClient, user: number, id: number) => {
    const row = await tx.ozellikDegeri.findFirst({
      where: { id, grup: { sablon: { kullaniciId: user } } },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Özellik bulunamadı.');
    return row;
  };
  router.get('/', async (_req, res) => {
    const rows = await db.ozellikSablonu.findMany({
      where: { kullaniciId: res.locals.catalogUserId as number },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
      include: {
        kategoriler: { orderBy: { kategoriId: 'asc' } },
        gruplar: {
          orderBy: [{ sira: 'asc' }, { id: 'asc' }],
          include: { degerler: { orderBy: [{ sira: 'asc' }, { id: 'asc' }] } },
        },
      },
    });
    res.json({
      templates: rows.map((r) => ({
        id: String(r.id),
        name: r.ad,
        allProducts: r.tumUrunler,
        categoryIds: r.kategoriler.map((k) => String(k.kategoriId)),
        groupCount: r.gruplar.length,
      })),
      groups: rows.flatMap((r) =>
        r.gruplar.map((g) => ({
          id: String(g.id),
          templateId: String(g.sablonId),
          name: g.ad,
          kind: g.tur,
          filter: g.filtre,
          multiple: g.coklu,
          variant: g.varyant,
          showOnImage: g.resimdeGoster,
          position: g.konum,
          size: g.boyut,
          valueCount: g.degerler.length,
        })),
      ),
      values: rows.flatMap((r) =>
        r.gruplar.flatMap((g) =>
          g.degerler.map((v) => ({
            id: String(v.id),
            groupId: String(v.grupId),
            code: v.kod,
            name: v.ad,
            color: v.renk,
            imageUrl: url(v.id, v.gorselDosyasi),
          })),
        ),
      ),
    });
  });
  for (const path of ['/sablonlar', '/sablonlar/:id'])
    router.post(path, async (req, res, next) => {
      if (req.params.id === 'sirala') {
        next();
        return;
      }
      const draft = templateSchema.parse(req.body);
      const user = res.locals.catalogUserId as number;
      const id = req.params.id === undefined ? undefined : categoryKey.parse(req.params.id);
      const saved = await catalogWrite(db, user, async (tx) => {
        const old = id === undefined ? null : await template(tx, user, id);
        const ids = draft.allProducts ? [] : draft.categoryIds;
        if (
          old &&
          !draft.allProducts &&
          (await tx.stokOzellikDegeri.findFirst({
            where: {
              deger: { grup: { sablonId: old.id } },
              stokKarti: { kategoriler: { none: { kategoriId: { in: ids } } } },
            },
          }))
        )
          throw new HttpError(
            409,
            'CONFLICT',
            'Bu şablon seçtiğiniz kategorilerin dışındaki ürünlerde kullanılıyor. Önce bu ürünlerin özellik seçimlerini düzenleyin.',
          );
        if (
          (await tx.kategori.count({ where: { kullaniciId: user, id: { in: ids } } })) !==
          ids.length
        )
          throw new HttpError(404, 'NOT_FOUND', 'Kategori bulunamadı.');
        const peers = await tx.ozellikSablonu.findMany({
          where: { kullaniciId: user, ...(old ? { id: { not: old.id } } : {}) },
          select: { ad: true },
        });
        if (peers.some((p) => fold(p.ad) === fold(draft.name)))
          throw new HttpError(409, 'CONFLICT', 'Bu adlı şablon zaten var.');
        const data = { ad: draft.name, tumUrunler: draft.allProducts };
        const row = old
          ? await tx.ozellikSablonu.update({ where: { id: old.id }, data })
          : await tx.ozellikSablonu.create({
              data: {
                ...data,
                kullaniciId: user,
                sira:
                  ((
                    await tx.ozellikSablonu.aggregate({
                      where: { kullaniciId: user },
                      _max: { sira: true },
                    })
                  )._max.sira ?? -1) + 1,
              },
            });
        await tx.ozellikSablonKategori.deleteMany({ where: { sablonId: row.id } });
        if (ids.length)
          await tx.ozellikSablonKategori.createMany({
            data: ids.map((kategoriId) => ({ sablonId: row.id, kategoriId })),
          });
        return String(row.id);
      });
      res.status(id === undefined ? 201 : 200).json({ id: saved });
    });
  for (const path of ['/gruplar', '/gruplar/:id'])
    router.post(path, async (req, res, next) => {
      if (req.params.id === 'sirala') {
        next();
        return;
      }
      const draft = groupSchema.parse(req.body);
      const user = res.locals.catalogUserId as number;
      const id = req.params.id === undefined ? undefined : categoryKey.parse(req.params.id);
      const saved = await catalogWrite(db, user, async (tx) => {
        const old = id === undefined ? null : await group(tx, user, id);
        await template(tx, user, draft.templateId);
        if (
          old &&
          (old.varyant !== draft.variant ||
            old.coklu !== draft.multiple ||
            old.sablonId !== draft.templateId) &&
          (await tx.ozellikDegeri.findFirst({
            where: {
              grupId: old.id,
              OR: [{ stokKartlari: { some: {} } }, { varyantlar: { some: {} } }],
            },
          }))
        )
          throw new HttpError(
            409,
            'CONFLICT',
            'Bu grup ürünlerde kullanılıyor. Şablon, çoklu seçim veya varyant ayarını değiştirmeden önce ürünlerdeki bağlantılarını kaldırın.',
          );
        if (
          old &&
          old.tur !== draft.kind &&
          (await tx.ozellikDegeri.count({ where: { grupId: old.id } }))
        )
          throw new HttpError(
            409,
            'CONFLICT',
            'Özellikleri bulunan grubun türünü değiştirmeden önce değerlerini kaldırın.',
          );
        const peers = await tx.ozellikGrubu.findMany({
          where: { sablonId: draft.templateId, ...(old ? { id: { not: old.id } } : {}) },
          select: { ad: true },
        });
        if (peers.some((p) => fold(p.ad) === fold(draft.name)))
          throw new HttpError(409, 'CONFLICT', 'Bu şablonda aynı adlı grup var.');
        const data = {
          sablonId: draft.templateId,
          ad: draft.name,
          tur: draft.kind,
          filtre: draft.filter,
          coklu: draft.multiple,
          varyant: draft.variant,
          resimdeGoster: draft.kind === 'image' && draft.showOnImage,
          konum: draft.position,
          boyut: draft.size,
          sira:
            old && old.sablonId === draft.templateId
              ? old.sira
              : ((
                  await tx.ozellikGrubu.aggregate({
                    where: { sablonId: draft.templateId },
                    _max: { sira: true },
                  })
                )._max.sira ?? -1) + 1,
        };
        return String(
          (old
            ? await tx.ozellikGrubu.update({ where: { id: old.id }, data })
            : await tx.ozellikGrubu.create({ data })
          ).id,
        );
      });
      res.status(id === undefined ? 201 : 200).json({ id: saved });
    });
  const saveValue = async (
    user: number,
    raw: unknown,
    groupId: number | undefined,
    id: number | undefined,
  ) => {
    const draft = valueSchema.parse(raw);
    const file = await imageFile(storage, draft.imageUrl);
    let oldFile: string | null = null;
    const result = await catalogWrite(db, user, async (tx) => {
      const old = id === undefined ? null : await value(tx, user, id);
      const parent = await group(tx, user, old?.grupId ?? groupId!);
      if (parent.tur === 'color' && !draft.color)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Renk seçin.');
      if (parent.tur === 'image' && !draft.imageUrl)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Görsel seçin.');
      if (parent.tur !== 'image' && draft.imageUrl !== null)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Bu grupta görsel kullanılmaz.');
      if (
        draft.imageUrl !== null &&
        !file &&
        draft.imageUrl !== (old ? url(old.id, old.gorselDosyasi) : null)
      )
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir görsel seçin.');
      const peers = await tx.ozellikDegeri.findMany({
        where: { grupId: parent.id, ...(old ? { id: { not: old.id } } : {}) },
        select: { ad: true, kod: true },
      });
      if (peers.some((p) => fold(p.ad) === fold(draft.name) || fold(p.kod) === fold(draft.code)))
        throw new HttpError(409, 'CONFLICT', 'Bu grupta aynı ad veya kod zaten var.');
      const changed = file !== null || draft.imageUrl === null;
      if (changed) oldFile = old?.gorselDosyasi ?? null;
      const data = {
        ad: draft.name,
        kod: draft.code,
        renk: parent.tur === 'color' ? draft.color : null,
        ...(changed ? { gorselDosyasi: file } : {}),
      };
      const row = old
        ? await tx.ozellikDegeri.update({ where: { id: old.id }, data })
        : await tx.ozellikDegeri.create({
            data: {
              ...data,
              grupId: parent.id,
              sira:
                ((
                  await tx.ozellikDegeri.aggregate({
                    where: { grupId: parent.id },
                    _max: { sira: true },
                  })
                )._max.sira ?? -1) + 1,
            },
          });
      return String(row.id);
    }).catch((error: unknown) => rollbackImage(storage, file, error));
    if (oldFile) await storage.remove(oldFile).catch(() => undefined);
    return result;
  };
  router.post('/gruplar/:id/degerler', async (req, res) =>
    res.status(201).json({
      id: await saveValue(
        res.locals.catalogUserId as number,
        req.body,
        categoryKey.parse(req.params.id),
        undefined,
      ),
    }),
  );
  router.post('/degerler/:id', async (req, res, next) => {
    if (req.params.id === 'sirala') {
      next();
      return;
    }
    res.json({
      id: await saveValue(
        res.locals.catalogUserId as number,
        req.body,
        undefined,
        categoryKey.parse(req.params.id),
      ),
    });
  });
  router.get('/degerler/:id/gorsel', async (req, res) => {
    const row = await value(
      db,
      res.locals.catalogUserId as number,
      categoryKey.parse(req.params.id),
    );
    if (!row.gorselDosyasi) throw new HttpError(404, 'NOT_FOUND', 'Görsel bulunamadı.');
    const image = await storage.read(row.gorselDosyasi);
    if (image.format === 'svg') res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.type(logoMime(image.format)).send(image.data);
  });
  for (const kind of ['sablonlar', 'gruplar', 'degerler'] as const) {
    router.post('/' + kind + '/sirala', async (req, res) => {
      const user = res.locals.catalogUserId as number;
      const data = z
        .strictObject({
          ids: categoryIds,
          templateId: categoryKey.optional(),
          groupId: categoryKey.optional(),
        })
        .parse(req.body);
      await catalogWrite(db, user, async (tx) => {
        if (kind === 'sablonlar') {
          const rows = await tx.ozellikSablonu.findMany({
            where: { kullaniciId: user },
            select: { id: true },
          });
          checkOrder(
            rows.map((r) => r.id),
            data.ids,
          );
          for (const [sira, id] of data.ids.entries())
            await tx.ozellikSablonu.update({ where: { id }, data: { sira } });
        }
        if (kind === 'gruplar') {
          if (data.templateId === undefined)
            throw new HttpError(400, 'VALIDATION_ERROR', 'Şablon seçin.');
          await template(tx, user, data.templateId);
          const rows = await tx.ozellikGrubu.findMany({
            where: { sablonId: data.templateId },
            select: { id: true },
          });
          checkOrder(
            rows.map((r) => r.id),
            data.ids,
          );
          for (const [sira, id] of data.ids.entries())
            await tx.ozellikGrubu.update({ where: { id }, data: { sira } });
        }
        if (kind === 'degerler') {
          if (data.groupId === undefined)
            throw new HttpError(400, 'VALIDATION_ERROR', 'Grup seçin.');
          await group(tx, user, data.groupId);
          const rows = await tx.ozellikDegeri.findMany({
            where: { grupId: data.groupId },
            select: { id: true },
          });
          checkOrder(
            rows.map((r) => r.id),
            data.ids,
          );
          for (const [sira, id] of data.ids.entries())
            await tx.ozellikDegeri.update({ where: { id }, data: { sira } });
        }
      });
      res.status(204).end();
    });
    router.post('/' + kind + '/:id/sil', async (req, res) => {
      const user = res.locals.catalogUserId as number;
      const id = categoryKey.parse(req.params.id);
      const files = await catalogWrite(db, user, async (tx) => {
        // Check ownership before revealing whether a definition is in use.
        if (kind === 'sablonlar') await template(tx, user, id);
        else if (kind === 'gruplar') await group(tx, user, id);
        else await value(tx, user, id);
        const scope =
          kind === 'sablonlar'
            ? { grup: { sablonId: id } }
            : kind === 'gruplar'
              ? { grupId: id }
              : { id };
        if (
          await tx.ozellikDegeri.findFirst({
            where: { ...scope, OR: [{ stokKartlari: { some: {} } }, { varyantlar: { some: {} } }] },
          })
        )
          throw new HttpError(
            409,
            'CONFLICT',
            'Bu özellik ürünlerde veya varyantlarda kullanılıyor. Silmeden önce ürünlerdeki bağlantılarını kaldırın.',
          );
        if (kind === 'sablonlar') {
          await template(tx, user, id);
          const values = await tx.ozellikDegeri.findMany({
            where: { grup: { sablonId: id } },
            select: { gorselDosyasi: true },
          });
          await tx.ozellikSablonu.delete({ where: { id } });
          return values;
        }
        if (kind === 'gruplar') {
          await group(tx, user, id);
          const values = await tx.ozellikDegeri.findMany({
            where: { grupId: id },
            select: { gorselDosyasi: true },
          });
          await tx.ozellikGrubu.delete({ where: { id } });
          return values;
        }
        const row = await value(tx, user, id);
        await tx.ozellikDegeri.delete({ where: { id } });
        return [row];
      });
      await Promise.allSettled(
        files.flatMap((r) => (r.gorselDosyasi ? [storage.remove(r.gorselDosyasi)] : [])),
      );
      res.status(204).end();
    });
  }
  return router;
}
