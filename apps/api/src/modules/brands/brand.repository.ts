import { createHash, randomBytes } from 'node:crypto';
import sharp from 'sharp';
import type { Brand, BrandDraft, ProductRef } from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { BrandLogoStorage, type LogoFormat } from './brand-logo.storage';

const digest = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
const nameHash = (name: string) => digest(name.normalize('NFC').trim().toLocaleLowerCase('tr-TR'));
const brandSelect = {
  kimlik: true,
  markaKodu: true,
  markaAdi: true,
  etkin: true,
  aciklama: true,
  logoHash: true,
  logoDosyasi: true,
  seoBasligi: true,
  seoAciklamasi: true,
  _count: { select: { stokKartlari: true } },
} as const;
type BrandRow = Prisma.MarkaGetPayload<{ select: typeof brandSelect }>;
const dto = (row: BrandRow): Brand => ({
  id: String(row.kimlik),
  name: row.markaAdi,
  active: row.etkin,
  description: row.aciklama ?? '',
  seoTitle: row.seoBasligi ?? '',
  seoDescription: row.seoAciklamasi ?? '',
  logoUrl: row.logoHash
    ? `/api/markalar/${encodeURIComponent(String(row.kimlik))}/logo?v=${row.logoHash}`
    : null,
  productCount: row._count.stokKartlari,
});

/** Base64 aktarımı çözülür ve içerik doğrulanır; özgün baytlar değiştirilmez. */
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
    const expected = match[1] === 'svg+xml' ? 'svg' : match[1];
    if (!metadata.format || metadata.format !== expected) throw new Error('Unsupported image');
    return { data: original, format: expected as LogoFormat, logoHash: digest(original) };
  } catch {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Logo okunamadı. Başka bir görsel seçin.');
  }
}

export class PrismaBrandRepository {
  private readonly storage: BrandLogoStorage;
  constructor(
    private readonly db: PrismaClient,
    uploadsDir = '../../uploads',
  ) {
    this.storage = new BrandLogoStorage(uploadsDir);
  }

  /** Eski BLOB'lar güvenli yazımdan sonra dosyaya taşınır; kesintide tekrar denenir. */
  async migrateLegacyLogos() {
    for (;;) {
      const rows = await this.db.marka.findMany({
        where: { logoVerisi: { not: null } },
        select: { kimlik: true, logoVerisi: true, logoDosyasi: true },
        take: 50,
      });
      if (!rows.length) return;
      for (const row of rows) {
        if (!row.logoVerisi) continue;
        if (row.logoDosyasi) {
          // Kayıtlı dosyayı kontrol etmeden eski veriyi silme.
          const file = await this.storage.read(row.logoDosyasi);
          if (!file.data.equals(Buffer.from(row.logoVerisi)))
            throw new Error('Eski logo ve dosya eşleşmiyor.');
          await this.db.marka.update({ where: { kimlik: row.kimlik }, data: { logoVerisi: null } });
          continue;
        }
        const data = Buffer.from(row.logoVerisi);
        const meta = await sharp(data, { limitInputPixels: 40000000 }).metadata();
        if (!meta.format || !['png', 'jpeg', 'webp', 'svg'].includes(meta.format))
          throw new Error('Eski logo okunamadı.');
        const name = await this.storage.write(data, meta.format as LogoFormat);
        const written = await this.storage.read(name);
        if (!written.data.equals(data)) throw new Error('Taşınan logo doğrulanamadı.');
        // Belirsiz commit sonucunda dosya silinmez; kayıtlı logo kaybolmaz.
        const result = await this.db.marka.updateMany({
          where: { kimlik: row.kimlik, logoDosyasi: null, logoVerisi: { not: null } },
          data: { logoDosyasi: name, logoVerisi: null, logoHash: digest(data) },
        });
        if (!result.count) await this.storage.remove(name);
      }
    }
  }

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
    const row = await tx.marka.findFirst({
      where: { kullaniciKimligi: Number(userId), kimlik: Number(key) },
      select: brandSelect,
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Marka bulunamadı.');
    return row;
  }

  async list(userId: string): Promise<Brand[]> {
    const rows = await this.db.marka.findMany({
      where: { kullaniciKimligi: Number(userId) },
      select: brandSelect,
      orderBy: [{ sira: 'asc' }, { olusturmaZamani: 'asc' }, { kimlik: 'asc' }],
    });
    return rows.map(dto);
  }

  async save(userId: string, draft: BrandDraft, key?: string): Promise<Brand> {
    const image = await prepareBrandLogo(draft.logoUrl);
    const newFile = image ? await this.storage.write(image.data, image.format) : null;
    let oldFile: string | null = null;
    let result: Brand;
    try {
      result = await this.write(userId, async (tx) => {
        const existing = key ? await this.find(tx, userId, key) : null;
        if (draft.logoUrl === null || image) oldFile = existing?.logoDosyasi ?? null;
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
          ...(draft.logoUrl === null
            ? { logoVerisi: null, logoDosyasi: null, logoHash: null }
            : image
              ? { logoVerisi: null, logoDosyasi: newFile, logoHash: image.logoHash }
              : {}),
        };
        const common = { markaAdi: draft.name, adHash: nameHash(draft.name), etkin: draft.active };
        if (existing)
          return dto(
            await tx.marka.update({
              where: { kimlik: existing.kimlik },
              data: { ...common, ...details },
              select: brandSelect,
            }),
          );
        const last = await tx.marka.aggregate({
          where: { kullaniciKimligi: Number(userId) },
          _max: { sira: true },
        });
        return dto(
          await tx.marka.create({
            data: {
              kullaniciKimligi: Number(userId),
              markaKodu: 'marka-' + randomBytes(16).toString('hex'),
              ...common,
              sira: (last._max.sira ?? -1) + 1,
              ...details,
            },
            select: brandSelect,
          }),
        );
      });
    } catch (error) {
      if (newFile && error instanceof HttpError) await this.storage.remove(newFile);
      throw error;
    }
    if (oldFile)
      await this.storage
        .remove(oldFile)
        .catch(() => console.error('Eski logo dosyası silinemedi.'));
    return result;
  }

  async setActive(userId: string, key: string, active: boolean) {
    await this.write(userId, async (tx) => {
      const row = await this.find(tx, userId, key);
      await tx.marka.update({ where: { kimlik: row.kimlik }, data: { etkin: active } });
    });
  }

  async remove(userId: string, key: string) {
    const oldFile = await this.write(userId, async (tx) => {
      const row = await this.find(tx, userId, key);
      await tx.stokKarti.updateMany({
        where: { kullaniciKimligi: Number(userId), markaKimligi: row.kimlik },
        data: { markaKimligi: null },
      });
      await tx.marka.delete({ where: { kimlik: row.kimlik } });
      return row.logoDosyasi;
    });
    if (oldFile)
      await this.storage
        .remove(oldFile)
        .catch(() => console.error('Eski logo dosyası silinemedi.'));
  }

  async reorder(userId: string, ids: string[]) {
    await this.write(userId, async (tx) => {
      const rows = await tx.marka.findMany({
        where: { kullaniciKimligi: Number(userId) },
        select: { kimlik: true },
      });
      const byKey = new Map(rows.map((row) => [String(row.kimlik), row.kimlik]));
      if (
        new Set(ids).size !== ids.length ||
        rows.length !== ids.length ||
        ids.some((id) => !byKey.has(id))
      )
        throw new HttpError(409, 'CONFLICT', 'Marka listesi değişmiş. Yenileyip tekrar sıralayın.');
      for (const [sira, key] of ids.entries())
        await tx.marka.update({ where: { kimlik: byKey.get(key)! }, data: { sira } });
    });
  }

  async listProducts(userId: string): Promise<ProductRef[]> {
    const rows = await this.db.stokKarti.findMany({
      where: { kullaniciKimligi: Number(userId) },
      select: {
        kimlik: true,
        stokKodu: true,
        stokAdi: true,
        marka: { select: { kimlik: true } },
        fiyatListeleri: {
          select: { birimler: { select: { barkodlar: { select: { barkod: true } } } } },
        },
      },
      orderBy: [{ olusturmaZamani: 'desc' }, { kimlik: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.kimlik),
      code: row.stokKodu ?? '',
      name: row.stokAdi || row.stokKodu || 'Adsız Ürün',
      brandId: row.marka ? String(row.marka.kimlik) : null,
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
      const ids = [...new Set(productIds)].map(Number);
      const count = await tx.stokKarti.count({
        where: { kimlik: { in: ids }, kullaniciKimligi: Number(userId) },
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
          kullaniciKimligi: Number(userId),
          ...(remove ? { markaKimligi: row.kimlik } : {}),
        },
        data: { markaKimligi: remove ? null : row.kimlik },
      });
    });
  }

  async logo(userId: string, key: string) {
    const row = await this.db.marka.findFirst({
      where: { kullaniciKimligi: Number(userId), kimlik: Number(key) },
      select: { logoVerisi: true, logoDosyasi: true },
    });
    if (row?.logoDosyasi) return this.storage.read(row.logoDosyasi);
    if (!row?.logoVerisi) throw new HttpError(404, 'NOT_FOUND', 'Logo bulunamadı.');
    const data = Buffer.from(row.logoVerisi);
    const meta = await sharp(data).metadata();
    if (!meta.format || !['png', 'jpeg', 'webp', 'svg'].includes(meta.format))
      throw new Error('Eski logo okunamadı.');
    return { data, format: meta.format as LogoFormat };
  }
}
