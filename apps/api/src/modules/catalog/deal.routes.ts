import { z } from 'zod';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { AuthService } from '../auth/auth.service';
import { BrandLogoStorage, logoMime } from '../brands/brand-logo.storage';
import { categoryIds, categoryKey } from './category.schemas';
import {
  catalogRouter,
  catalogWrite,
  checkOrder,
  fold,
  imageFile,
  rollbackImage,
} from './catalog.common';

export const positionSchema = z.enum(['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']);
export const sizeSchema = z.enum(['small', 'medium', 'large']);
const draftSchema = z
  .strictObject({
    name: z.string().trim().min(1, 'Fırsat adı girin.').max(120),
    iconUrl: z.string().max(3000000).nullable(),
    active: z.boolean(),
    showOnImage: z.boolean(),
    position: positionSchema,
    size: sizeSchema,
    seoTitle: z.string().max(250),
    seoDescription: z.string().max(1000),
  })
  .refine(
    (draft) => !draft.showOnImage || draft.iconUrl !== null,
    'Rozet olarak kullanılacak bir ikon yükleyin.',
  );

export function createDealRouter(env: Env, auth: AuthService, db: PrismaClient) {
  const router = catalogRouter(env, auth);
  const storage = new BrandLogoStorage(env.UPLOADS_DIR, 'firsatlar');
  const url = (id: number, file: string | null) =>
    file ? `/api/firsatlar/${id}/gorsel?v=${file}` : null;
  const find = async (tx: Prisma.TransactionClient, user: number, id: number) => {
    const row = await tx.firsat.findFirst({ where: { id, kullaniciId: user } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Fırsat bulunamadı.');
    return row;
  };
  router.get('/', async (_req, res) => {
    const rows = await db.firsat.findMany({
      where: { kullaniciId: res.locals.catalogUserId as number },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { stokKartlari: true } } },
    });
    res.json(
      rows.map((r) => ({
        id: String(r.id),
        name: r.ad,
        iconUrl: url(r.id, r.ikonDosyasi),
        active: r.durum,
        showOnImage: r.resimdeGoster,
        position: r.konum,
        size: r.boyut,
        seoTitle: r.seoBasligi,
        seoDescription: r.seoAciklamasi,
        productCount: r._count.stokKartlari,
      })),
    );
  });
  router.get('/urunler', async (_req, res) => {
    const rows = await db.stokKarti.findMany({
      where: { kullaniciKimligi: res.locals.catalogUserId as number },
      orderBy: { kimlik: 'desc' },
      include: { firsatlar: true, birimler: { include: { barkodlar: true } } },
    });
    res.json(
      rows.map((r) => ({
        id: String(r.kimlik),
        code: r.stokKodu ?? '',
        name: r.stokAdi ?? '',
        barcode: r.birimler.flatMap((u) => u.barkodlar.map((b) => b.barkod)).join(' '),
        dealIds: r.firsatlar.map((f) => String(f.firsatId)),
      })),
    );
  });
  router.post('/sirala', async (req, res) => {
    const { ids } = z.strictObject({ ids: categoryIds }).parse(req.body);
    const user = res.locals.catalogUserId as number;
    await catalogWrite(db, user, async (tx) => {
      const rows = await tx.firsat.findMany({ where: { kullaniciId: user }, select: { id: true } });
      checkOrder(
        rows.map((r) => r.id),
        ids,
      );
      for (const [sira, id] of ids.entries())
        await tx.firsat.update({ where: { id }, data: { sira } });
    });
    res.status(204).end();
  });
  for (const path of ['/', '/:id'])
    router.post(path, async (req, res) => {
      const draft = draftSchema.parse(req.body);
      const user = res.locals.catalogUserId as number;
      const id = req.params.id === undefined ? undefined : categoryKey.parse(req.params.id);
      const file = await imageFile(storage, draft.iconUrl);
      let oldFile: string | null = null;
      const saved = await catalogWrite(db, user, async (tx) => {
        const old = id === undefined ? null : await find(tx, user, id);
        const peers = await tx.firsat.findMany({
          where: { kullaniciId: user, ...(id === undefined ? {} : { id: { not: id } }) },
          select: { ad: true },
        });
        if (peers.some((r) => fold(r.ad) === fold(draft.name)))
          throw new HttpError(409, 'CONFLICT', 'Bu adlı fırsat zaten var.');
        if (
          draft.iconUrl !== null &&
          !file &&
          draft.iconUrl !== (old ? url(old.id, old.ikonDosyasi) : null)
        )
          throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir görsel seçin.');
        const changed = file !== null || draft.iconUrl === null;
        if (changed) oldFile = old?.ikonDosyasi ?? null;
        const data = {
          ad: draft.name,
          durum: draft.active,
          resimdeGoster: draft.showOnImage,
          konum: draft.position,
          boyut: draft.size,
          seoBasligi: draft.seoTitle,
          seoAciklamasi: draft.seoDescription,
          ...(changed ? { ikonDosyasi: file } : {}),
        };
        const row = old
          ? await tx.firsat.update({
              where: { id: old.id },
              data,
              include: { _count: { select: { stokKartlari: true } } },
            })
          : await tx.firsat.create({
              data: {
                ...data,
                kullaniciId: user,
                sira:
                  ((
                    await tx.firsat.aggregate({
                      where: { kullaniciId: user },
                      _max: { sira: true },
                    })
                  )._max.sira ?? -1) + 1,
              },
              include: { _count: { select: { stokKartlari: true } } },
            });
        return {
          id: String(row.id),
          ...draft,
          iconUrl: url(row.id, row.ikonDosyasi),
          productCount: row._count.stokKartlari,
        };
      }).catch((error: unknown) => rollbackImage(storage, file, error));
      if (oldFile) await storage.remove(oldFile).catch(() => undefined);
      res.status(id === undefined ? 201 : 200).json(saved);
    });
  router.get('/:id/gorsel', async (req, res) => {
    const row = await find(
      db,
      res.locals.catalogUserId as number,
      categoryKey.parse(req.params.id),
    );
    if (!row.ikonDosyasi) throw new HttpError(404, 'NOT_FOUND', 'Görsel bulunamadı.');
    const image = await storage.read(row.ikonDosyasi);
    if (image.format === 'svg') res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.type(logoMime(image.format)).send(image.data);
  });
  router.post('/:id/aktiflik', async (req, res) => {
    const { active } = z.strictObject({ active: z.boolean() }).parse(req.body);
    const user = res.locals.catalogUserId as number;
    await catalogWrite(db, user, async (tx) => {
      const row = await find(tx, user, categoryKey.parse(req.params.id));
      await tx.firsat.update({ where: { id: row.id }, data: { durum: active } });
    });
    res.status(204).end();
  });
  router.post('/:id/sil', async (req, res) => {
    const user = res.locals.catalogUserId as number;
    const file = await catalogWrite(db, user, async (tx) => {
      const row = await find(tx, user, categoryKey.parse(req.params.id));
      await tx.firsat.delete({ where: { id: row.id } });
      return row.ikonDosyasi;
    });
    if (file) await storage.remove(file).catch(() => undefined);
    res.status(204).end();
  });
  for (const [path, remove] of [
    ['ata', false],
    ['cikar', true],
  ] as const)
    router.post('/:id/urunler/' + path, async (req, res) => {
      const { productIds } = z.strictObject({ productIds: categoryIds }).parse(req.body);
      const user = res.locals.catalogUserId as number;
      await catalogWrite(db, user, async (tx) => {
        const row = await find(tx, user, categoryKey.parse(req.params.id));
        if (
          (await tx.stokKarti.count({
            where: { kullaniciKimligi: user, kimlik: { in: productIds } },
          })) !== productIds.length
        )
          throw new HttpError(404, 'NOT_FOUND', 'Ürün bulunamadı. İşlem yapılmadı.');
        if (remove)
          await tx.stokFirsati.deleteMany({
            where: { firsatId: row.id, stokKartiId: { in: productIds } },
          });
        else
          await tx.stokFirsati.createMany({
            skipDuplicates: true,
            data: productIds.map((stokKartiId) => ({ stokKartiId, firsatId: row.id })),
          });
      });
      res.status(204).end();
    });
  return router;
}
