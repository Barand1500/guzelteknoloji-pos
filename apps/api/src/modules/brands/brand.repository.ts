import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Brand, BrandDraft, ProductRef } from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';

const digest = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
const nameHash = (name: string) => digest(name.normalize('NFC').trim().toLocaleLowerCase('tr-TR'));
const detailsSelect = {
  aciklama: true,
  logoOzeti: true,
  seoBasligi: true,
  seoAciklamasi: true,
} as const;
const includeBrand = {
  markaBilgisi: { select: detailsSelect },
  _count: { select: { markaKartlari: true } },
} as const;
type BrandRow = Prisma.StokSecenegiGetPayload<{ include: typeof includeBrand }>;
const dto = (row: BrandRow): Brand => ({
  id: row.secenekKodu,
  name: row.secenekAdi,
  active: row.etkin,
  description: row.markaBilgisi?.aciklama ?? '',
  seoTitle: row.markaBilgisi?.seoBasligi ?? '',
  seoDescription: row.markaBilgisi?.seoAciklamasi ?? '',
  logoUrl: row.markaBilgisi?.logoOzeti
    ? `/api/markalar/${encodeURIComponent(row.secenekKodu)}/logo?v=${row.markaBilgisi.logoOzeti}`
    : null,
  productCount: row._count.markaKartlari,
});

/** Yükleme dosya adına güvenmez; içerik çözülür ve tek biçimde yeniden kodlanır. */
export async function prepareBrandLogo(value: string | null) {
  if (value === null || value.startsWith('/api/markalar/')) return null;
  const match = /^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Geçerli bir PNG, JPG, WebP veya SVG logosu seçin.',
    );
  const original = Buffer.from(match[2]!, 'base64');
  if (original.length > 2 * 1024 * 1024)
    throw new HttpError(400, 'VALIDATION_ERROR', 'Logo en çok 2 MB olabilir.');
  try {
    const image = sharp(original, { limitInputPixels: 40000000, animated: false });
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp', 'svg'].includes(metadata.format))
      throw new Error('Unsupported image');
    const data = await image
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return { logoVerisi: data, logoOzeti: digest(data) };
  } catch {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Logo okunamadı. Başka bir görsel seçin.');
  }
}

export class PrismaBrandRepository {
  constructor(private readonly db: PrismaClient) {}

  private async write<T>(
    userId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            // Stok kaydı da aynı kilidi kullanır; silme, atama ve kayıt birbirini geçemez.
            await tx.$queryRaw(
              Prisma.sql`SELECT kimlik FROM kullanicilar WHERE kimlik = ${userId} FOR UPDATE`,
            );
            return operation(tx);
          },
          { timeout: 15000 },
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2002')
            throw new HttpError(409, 'CONFLICT', 'Bu isimde bir marka zaten var.');
        }
        throw error;
      }
    }
  }

  private async find(tx: Prisma.TransactionClient, userId: string, key: string) {
    const row = await tx.stokSecenegi.findFirst({
      where: { kullaniciKimligi: userId, listeTuru: 'brands', secenekKodu: key },
      include: includeBrand,
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Marka bulunamadı.');
    return row;
  }

  async list(userId: string): Promise<Brand[]> {
    const rows = await this.db.stokSecenegi.findMany({
      where: { kullaniciKimligi: userId, listeTuru: 'brands' },
      include: includeBrand,
      orderBy: [{ sira: 'asc' }, { olusturmaZamani: 'asc' }, { kimlik: 'asc' }],
    });
    return rows.map(dto);
  }

  async save(userId: string, draft: BrandDraft, key?: string): Promise<Brand> {
    const image = await prepareBrandLogo(draft.logoUrl);
    return this.write(userId, async (tx) => {
      const existing = key ? await this.find(tx, userId, key) : null;
      if (
        draft.logoUrl?.startsWith('/api/markalar/') &&
        (!existing || dto(existing).logoUrl !== draft.logoUrl)
      )
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          'Logo değişmiş. Markayı yeniden açıp deneyin.',
        );
      const details = {
        aciklama: draft.description,
        seoBasligi: draft.seoTitle,
        seoAciklamasi: draft.seoDescription,
        ...(draft.logoUrl === null ? { logoVerisi: null, logoOzeti: null } : (image ?? {})),
      };
      const common = { secenekAdi: draft.name, adOzeti: nameHash(draft.name), etkin: draft.active };
      if (existing)
        return dto(
          await tx.stokSecenegi.update({
            where: { kimlik: existing.kimlik },
            data: { ...common, markaBilgisi: { upsert: { create: details, update: details } } },
            include: includeBrand,
          }),
        );
      const last = await tx.stokSecenegi.aggregate({
        where: { kullaniciKimligi: userId, listeTuru: 'brands' },
        _max: { sira: true },
      });
      return dto(
        await tx.stokSecenegi.create({
          data: {
            kullaniciKimligi: userId,
            listeTuru: 'brands',
            secenekKodu: randomUUID(),
            ...common,
            silinebilir: true,
            sira: (last._max.sira ?? -1) + 1,
            markaBilgisi: { create: details },
          },
          include: includeBrand,
        }),
      );
    });
  }

  async setActive(userId: string, key: string, active: boolean) {
    await this.write(userId, async (tx) => {
      const row = await this.find(tx, userId, key);
      await tx.stokSecenegi.update({ where: { kimlik: row.kimlik }, data: { etkin: active } });
    });
  }

  async remove(userId: string, key: string) {
    await this.write(userId, async (tx) => {
      const row = await this.find(tx, userId, key);
      await tx.stokKarti.updateMany({
        where: { kullaniciKimligi: userId, markaKimligi: row.kimlik },
        data: { markaKimligi: null },
      });
      await tx.stokSecenegi.delete({ where: { kimlik: row.kimlik } });
    });
  }

  async reorder(userId: string, ids: string[]) {
    await this.write(userId, async (tx) => {
      const rows = await tx.stokSecenegi.findMany({
        where: { kullaniciKimligi: userId, listeTuru: 'brands' },
        select: { kimlik: true, secenekKodu: true },
      });
      const byKey = new Map(rows.map((row) => [row.secenekKodu, row.kimlik]));
      if (
        new Set(ids).size !== ids.length ||
        rows.length !== ids.length ||
        ids.some((id) => !byKey.has(id))
      )
        throw new HttpError(409, 'CONFLICT', 'Marka listesi değişmiş. Yenileyip tekrar sıralayın.');
      for (const [sira, key] of ids.entries())
        await tx.stokSecenegi.update({ where: { kimlik: byKey.get(key)! }, data: { sira } });
    });
  }

  async listProducts(userId: string): Promise<ProductRef[]> {
    const rows = await this.db.stokKarti.findMany({
      where: { kullaniciKimligi: userId },
      select: {
        kimlik: true,
        stokKodu: true,
        stokAdi: true,
        marka: { select: { secenekKodu: true } },
        fiyatListeleri: {
          select: { birimler: { select: { barkodlar: { select: { barkod: true } } } } },
        },
      },
      orderBy: [{ olusturmaZamani: 'desc' }, { kimlik: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.kimlik,
      code: row.stokKodu ?? '',
      name: row.stokAdi || row.stokKodu || 'Adsız Ürün',
      brandId: row.marka?.secenekKodu ?? null,
      barcode: [
        ...new Set(
          row.fiyatListeleri.flatMap((list) =>
            list.birimler.flatMap((unit) => unit.barkodlar.map((b) => b.barkod)),
          ),
        ),
      ].join(' '),
    }));
  }

  async assign(userId: string, key: string, productIds: string[], remove: boolean) {
    await this.write(userId, async (tx) => {
      const row = await this.find(tx, userId, key);
      const ids = [...new Set(productIds)];
      const count = await tx.stokKarti.count({
        where: { kimlik: { in: ids }, kullaniciKimligi: userId },
      });
      if (count !== ids.length)
        throw new HttpError(
          404,
          'NOT_FOUND',
          'Seçilen ürünlerden biri bulunamadı. Listeyi yenileyin.',
        );
      await tx.stokKarti.updateMany({
        where: {
          kimlik: { in: ids },
          kullaniciKimligi: userId,
          ...(remove ? { markaKimligi: row.kimlik } : {}),
        },
        data: { markaKimligi: remove ? null : row.kimlik },
      });
    });
  }

  async logo(userId: string, key: string) {
    const row = await this.db.marka.findFirst({
      where: { secenek: { kullaniciKimligi: userId, listeTuru: 'brands', secenekKodu: key } },
      select: { logoVerisi: true },
    });
    if (!row?.logoVerisi) throw new HttpError(404, 'NOT_FOUND', 'Logo bulunamadı.');
    return Buffer.from(row.logoVerisi);
  }
}
