import { createHmac } from 'node:crypto';
import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import sharp from 'sharp';
import { z } from 'zod';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { safeEqualHex } from '../../lib/crypto';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { BrandLogoStorage, logoMime } from '../brands/brand-logo.storage';
import { catalogWrite } from '../catalog/catalog.common';
import { recordId, recordKey } from './stock.api';
import { prepareUploadedImage } from '../../lib/image-processing';

const MAX_BYTES = 5 * 1024 * 1024;
const leaf = z.string().regex(/^[0-9a-f]{48}\.(png|jpg|webp)$/);
const ticketSchema = z.strictObject({ file: leaf, user: recordId, expires: z.number().int() });
const commitSchema = z
  .strictObject({
    replace: z.boolean(),
    entries: z
      .array(
        z.strictObject({
          productId: z.union([recordId, recordKey.transform(Number)]),
          tickets: z.array(z.string().max(1000)).max(300),
          finalOrder: z
            .array(
              z.union([
                z.strictObject({ imageId: recordId }),
                z.strictObject({ ticket: z.string().max(1000) }),
              ]),
            )
            .min(1)
            .max(2000)
            .optional(),
        }),
      )
      .min(1)
      .max(300),
  })
  .refine(
    (input) => input.entries.reduce((n, e) => n + e.tickets.length, 0) <= 300,
    'Bir seferde en fazla 300 görsel yüklenebilir.',
  )
  .refine(
    (input) => input.entries.every((entry) => entry.tickets.length > 0 || (!input.replace && !!entry.finalOrder)),
    'Yüklenecek görsel veya geçerli bir görsel sırası belirtin.',
  );

export const stockImageUrl = (image: { id: number; dosyaAdi: string }) =>
  `/api/stok/gorseller/${image.id}?v=${image.dosyaAdi}`;

export function orderedStockImages(
  rows: { id: number; dosyaAdi: string }[],
  order: ({ imageId: number } | { file: string })[],
) {
  const ordered = order.map((item) =>
    'imageId' in item
      ? rows.find((row) => row.id === item.imageId)
      : rows.find((row) => row.dosyaAdi === item.file),
  );
  if (
    ordered.length !== rows.length ||
    ordered.some((row) => !row) ||
    new Set(ordered.map((row) => row?.id)).size !== rows.length
  )
    throw new HttpError(
      409,
      'CONFLICT',
      'Ürünün görselleri değişmiş. Listeyi yenileyip yeniden sıralayın.',
    );
  return ordered.map((row) => row!);
}

/** Dosyalar küçük isteklerle hazırlanır; tüm ürün bağlantıları onayda tek transaction'da yazılır. */
export function createStockImages(env: Env, db: PrismaClient) {
  const router = Router();
  const storage = new BrandLogoStorage(env.UPLOADS_DIR, 'urunler');
  const directory = path.resolve(env.UPLOADS_DIR, 'urunler');
  let nextCleanup = 0;
  const signature = (body: string) =>
    createHmac('sha256', env.COOKIE_SECRET)
      .update('stok-gorseli:' + body)
      .digest('hex');
  const sign = (file: string, user: number) => {
    const body = Buffer.from(
      JSON.stringify({ file, user, expires: Date.now() + 43200000 }),
    ).toString('base64url');
    return body + '.' + signature(body);
  };
  const verify = (token: string, user: number) => {
    const [body, mac, extra] = token.split('.');
    if (
      !body ||
      !mac ||
      extra ||
      !/^[a-f0-9]{64}$/.test(mac) ||
      !safeEqualHex(signature(body), mac)
    )
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Geçersiz görsel yüklemesi. Dosyayı yeniden seçin.',
      );
    let parsed: z.infer<typeof ticketSchema>;
    try {
      parsed = ticketSchema.parse(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')));
    } catch {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Geçersiz görsel yüklemesi.');
    }
    if (parsed.user !== user || parsed.expires < Date.now())
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Görsel yüklemesinin süresi doldu. Yeniden deneyin.',
      );
    return parsed.file;
  };
  // Vazgeçilen/yarım kalan yüklemeler ayrı bir veritabanı tablosu gerektirmez.
  // Bir günden eski, hiçbir ürüne bağlı olmayan dosyalar saatlik ilk yüklemede temizlenir.
  const cleanup = async () => {
    if (Date.now() < nextCleanup) return;
    nextCleanup = Date.now() + 3600000;
    for (const name of await readdir(directory).catch(() => [] as string[])) {
      if (!leaf.safeParse(name).success) continue;
      const info = await stat(path.join(directory, name)).catch(() => null);
      if (!info || Date.now() - info.mtimeMs < 86400000) continue;
      if (!(await db.stokGorseli.findUnique({ where: { dosyaAdi: name }, select: { id: true } })))
        await storage.remove(name);
    }
  };

  router.post(
    '/gorseller/yukle',
    createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 360 }),
    async (req, res) => {
      const { dataUrl } = z.strictObject({ dataUrl: z.string().max(7000000) }).parse(req.body);
      const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
      if (!match) throw new HttpError(400, 'VALIDATION_ERROR', 'JPG, PNG veya WebP görseli seçin.');
      const data = Buffer.from(match[2]!, 'base64');
      if (!data.length || data.length > MAX_BYTES || data.toString('base64') !== match[2])
        throw new HttpError(400, 'VALIDATION_ERROR', 'Görsel geçersiz veya 5 MB sınırını aşıyor.');
      let format: string | undefined;
      try {
        format = (await sharp(data).metadata()).format;
      } catch {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Dosya geçerli bir görsel değil.');
      }
      if (format !== match[1])
        throw new HttpError(400, 'VALIDATION_ERROR', 'Görselin dosya türü içeriğiyle uyuşmuyor.');
      // Şeffaflaştırma kararı istemciden alınmaz; oturumdaki işletmenin kayıtlı ayarı kullanılır.
      const businessId = res.locals.workspace?.business.id as number | undefined;
      const appearance = businessId
        ? await db.isletmeAyari.findUnique({
            where: { businessId_section: { businessId, section: 'images' } },
            select: { values: true },
          })
        : null;
      const values = appearance?.values;
      const transparent =
        !!values &&
        typeof values === 'object' &&
        !Array.isArray(values) &&
        values.products === 'true';
      const prepared = await prepareUploadedImage(data, transparent);
      await cleanup();
      const file = await storage.write(prepared.data, prepared.format);
      res.status(201).json({ ticket: sign(file, Number(res.locals.stockUserId)) });
    },
  );

  router.post(
    '/gorseller/kaydet',
    createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 120 }),
    async (req, res) => {
      const input = commitSchema.parse(req.body);
      const user = Number(res.locals.stockUserId);
      const entries = input.entries.map((e) => ({
        id: e.productId,
        files: e.tickets.map((t) => verify(t, user)),
        order: e.finalOrder?.map((item) =>
          'imageId' in item ? { imageId: item.imageId } : { file: verify(item.ticket, user) },
        ),
      }));
      const ids = entries.map((e) => e.id);
      const names = entries.flatMap((e) => e.files);
      if (new Set(ids).size !== ids.length || new Set(names).size !== names.length)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Aynı ürün veya görsel iki kez gönderilemez.');
      for (const name of names) {
        try {
          await access(path.join(directory, name));
        } catch {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Yüklenen görsel bulunamadı. Dosyayı yeniden seçin.',
          );
        }
      }
      const removed = await catalogWrite(db, user, async (tx) => {
        if (
          (await tx.stokKarti.count({ where: { kullaniciKimligi: user, kimlik: { in: ids } } })) !==
          ids.length
        )
          throw new HttpError(404, 'NOT_FOUND', 'Ürün bulunamadı. Hiçbir görsel kaydedilmedi.');
        const existing = await tx.stokGorseli.findMany({ where: { dosyaAdi: { in: names } } });
        const replay = existing.length > 0;
        if (replay) {
          if (!(
            existing.length === names.length &&
            entries.every((e) =>
              e.files.every((name) =>
                existing.some((r) => r.dosyaAdi === name && r.stokKartiId === e.id),
              ),
            )
          ))
            throw new HttpError(
              409,
              'CONFLICT',
              'Bu yüklemedeki görsellerden biri zaten kullanılmış.',
            );
        }
        const oldFiles: string[] = [];
        for (const entry of entries) {
          if (input.replace && !replay) {
            const old = await tx.stokGorseli.findMany({
              where: { stokKartiId: entry.id },
              select: { dosyaAdi: true },
            });
            oldFiles.push(...old.map((i) => i.dosyaAdi));
            await tx.stokGorseli.deleteMany({ where: { stokKartiId: entry.id } });
          }
          const last =
            (
              await tx.stokGorseli.aggregate({
                where: { stokKartiId: entry.id },
                _max: { sira: true },
              })
            )._max.sira ?? -1;
          if (!replay && entry.files.length)
            await tx.stokGorseli.createMany({
              data: entry.files.map((dosyaAdi, i) => ({
                stokKartiId: entry.id,
                dosyaAdi,
                sira: last + i + 1,
              })),
            });
          if (entry.order) {
            const rows = await tx.stokGorseli.findMany({ where: { stokKartiId: entry.id } });
            // Tam liste zorunludur: başka ürüne ait veya eşzamanlı değişmiş görseller sıralanamaz.
            const ordered = orderedStockImages(rows, entry.order);
            for (const [sira, row] of ordered.entries())
              await tx.stokGorseli.update({ where: { id: row.id }, data: { sira } });
          }
        }
        return oldFiles;
      });
      await Promise.allSettled(removed.map((name) => storage.remove(name)));
      res.json({ images: names.length });
    },
  );

  router.get('/gorseller/:id', async (req, res) => {
    const row = await db.stokGorseli.findFirst({
      where: {
        id: Number(recordKey.parse(req.params.id)),
        stokKarti: { kullaniciKimligi: Number(res.locals.stockUserId) },
      },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Görsel bulunamadı.');
    const file = await storage.read(row.dosyaAdi);
    res.type(logoMime(file.format)).send(file.data);
  });
  return { router, storage };
}
