import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { BrandLogoStorage } from '../brands/brand-logo.storage';
import { prepareBrandLogo } from '../brands/brand.repository';
import type { CategoryDraftInput } from './category.schemas';

const selection = { _count: { select: { altlar: true, stokKartlari: true } } } as const;
type CategoryRow = Prisma.KategoriGetPayload<{ include: typeof selection }>;
const dto = (row: CategoryRow) => ({
  id: String(row.id),
  parentId: row.ustId === null ? null : String(row.ustId),
  name: row.ad,
  description: row.aciklama,
  imageUrl: row.gorselDosyasi
    ? `/api/kategoriler/${row.id}/gorsel?v=${encodeURIComponent(row.gorselDosyasi)}`
    : null,
  active: row.etkin,
  hidden: row.gizli,
  seoTitle: row.seoBasligi,
  seoDescription: row.seoAciklamasi,
  productCount: row._count.stokKartlari,
  childCount: row._count.altlar,
});

export class CategoryRepository {
  private storage: BrandLogoStorage;
  constructor(
    private db: PrismaClient,
    uploadsDir: string,
  ) {
    this.storage = new BrandLogoStorage(uploadsDir, 'kategoriler');
  }

  private write<T>(user: number, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${user} FOR UPDATE`);
        return fn(tx);
      },
      { timeout: 15000 },
    );
  }

  private async find(tx: Prisma.TransactionClient, user: number, id: number) {
    const item = await tx.kategori.findFirst({ where: { id, kullaniciId: user } });
    if (!item) throw new HttpError(404, 'NOT_FOUND', 'Kategori bulunamadı.');
    return item;
  }

  private async parent(
    tx: Prisma.TransactionClient,
    user: number,
    parentId: number | null,
    id?: number,
  ) {
    let current = parentId;
    const seen = new Set<number>();
    while (current !== null) {
      if (current === id || seen.has(current))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Kategori kendi alt kategorisine taşınamaz.');
      seen.add(current);
      current = (await this.find(tx, user, current)).ustId;
    }
  }

  private async last(tx: Prisma.TransactionClient, user: number, parentId: number | null) {
    const max = await tx.kategori.aggregate({
      where: { kullaniciId: user, ustId: parentId },
      _max: { sira: true },
    });
    return (max._max.sira ?? -1) + 1;
  }

  private async checkName(
    tx: Prisma.TransactionClient,
    user: number,
    parentId: number | null,
    name: string,
    exceptId?: number,
  ) {
    const peers = await tx.kategori.findMany({
      where: {
        kullaniciId: user,
        ustId: parentId,
        ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
      },
      select: { ad: true },
    });
    const fold = (s: string) => s.normalize('NFC').trim().toLocaleLowerCase('tr-TR');
    if (peers.some((p) => fold(p.ad) === fold(name)))
      throw new HttpError(409, 'CONFLICT', 'Bu üst kategoride aynı adlı kategori var.');
  }

  async list(user: number) {
    return (
      await this.db.kategori.findMany({
        where: { kullaniciId: user },
        orderBy: [{ sira: 'asc' }, { id: 'asc' }],
        include: selection,
      })
    ).map(dto);
  }

  async save(user: number, draft: CategoryDraftInput, id?: number) {
    const image = draft.imageUrl?.startsWith('data:')
      ? await prepareBrandLogo(draft.imageUrl)
      : null;
    const newFile = image ? await this.storage.write(image.data, image.format) : null;
    let previousFile: string | null = null;
    const result = await this.write(user, async (tx) => {
      const old = id === undefined ? null : await this.find(tx, user, id);
      await this.parent(tx, user, draft.parentId, id);
      await this.checkName(tx, user, draft.parentId, draft.name, id);
      if (
        draft.imageUrl !== null &&
        !image &&
        draft.imageUrl !==
          (old ? dto({ ...old, _count: { altlar: 0, stokKartlari: 0 } }).imageUrl : null)
      )
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir kategori görseli seçin.');
      const changedImage = draft.imageUrl === null || image !== null;
      if (changedImage) previousFile = old?.gorselDosyasi ?? null;
      const data = {
        ad: draft.name,
        aciklama: draft.description,
        ustId: draft.parentId,
        etkin: draft.active,
        gizli: draft.hidden,
        seoBasligi: draft.seoTitle,
        seoAciklamasi: draft.seoDescription,
        sira:
          !old || old.ustId !== draft.parentId
            ? await this.last(tx, user, draft.parentId)
            : old.sira,
        ...(changedImage ? { gorselDosyasi: newFile } : {}),
      };
      const saved = old
        ? await tx.kategori.update({ where: { id: old.id }, data, include: selection })
        : await tx.kategori.create({ data: { ...data, kullaniciId: user }, include: selection });
      return dto(saved);
    }).catch(async (error: unknown) => {
      // Bilinen doğrulama/yetki hatasında transaction geri alınmıştır; yeni dosya kullanılmaz.
      // Belirsiz veritabanı/commit hatasında olası geçerli kaydın dosyasını silmeyiz.
      if (newFile && error instanceof HttpError)
        await this.storage.remove(newFile).catch(() => undefined);
      throw error;
    });
    if (previousFile) await this.storage.remove(previousFile).catch(() => undefined);
    return result;
  }

  async move(user: number, id: number, parentId: number | null) {
    await this.write(user, async (tx) => {
      const old = await this.find(tx, user, id);
      await this.parent(tx, user, parentId, id);
      await this.checkName(tx, user, parentId, old.ad, id);
      if (old.ustId !== parentId)
        await tx.kategori.update({
          where: { id },
          data: { ustId: parentId, sira: await this.last(tx, user, parentId) },
        });
    });
  }

  async setActive(user: number, id: number, active: boolean) {
    await this.write(user, async (tx) => {
      await this.find(tx, user, id);
      await tx.kategori.update({ where: { id }, data: { etkin: active } });
    });
  }

  async remove(user: number, id: number) {
    const files = await this.write(user, async (tx) => {
      await this.find(tx, user, id);
      const all = await tx.kategori.findMany({ where: { kullaniciId: user } });
      const gone = new Set([id]);
      for (let changed = true; changed;) {
        changed = false;
        for (const row of all)
          if (row.ustId !== null && gone.has(row.ustId) && !gone.has(row.id)) {
            gone.add(row.id);
            changed = true;
          }
      }
      // Önce dalın iç bağlantıları çözülür; ürünler korunur, yalnızca kategori eşleşmeleri silinir.
      await tx.kategori.updateMany({
        where: { kullaniciId: user, id: { in: [...gone] } },
        data: { ustId: null },
      });
      await tx.kategori.deleteMany({ where: { kullaniciId: user, id: { in: [...gone] } } });
      return all
        .filter((r) => gone.has(r.id))
        .map((r) => r.gorselDosyasi)
        .filter((f): f is string => f !== null);
    });
    await Promise.allSettled(files.map((f) => this.storage.remove(f)));
  }

  async reorder(user: number, parentId: number | null, ids: number[]) {
    await this.write(user, async (tx) => {
      if (parentId !== null) await this.find(tx, user, parentId);
      const peers = await tx.kategori.findMany({
        where: { kullaniciId: user, ustId: parentId },
        select: { id: true },
      });
      if (
        ids.length !== peers.length ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !peers.some((p) => p.id === id))
      )
        throw new HttpError(
          409,
          'CONFLICT',
          'Kategori listesi değişmiş. Yenileyip tekrar sıralayın.',
        );
      for (const [sira, id] of ids.entries())
        await tx.kategori.update({ where: { id }, data: { sira } });
    });
  }

  async listProducts(user: number) {
    const cards = await this.db.stokKarti.findMany({
      where: { kullaniciKimligi: user },
      orderBy: { kimlik: 'desc' },
      select: {
        kimlik: true,
        stokKodu: true,
        stokAdi: true,
        kategoriler: { select: { kategoriId: true }, orderBy: { kategoriId: 'asc' } },
        birimler: { select: { barkodlar: { select: { barkod: true } } } },
      },
    });
    return cards.map((c) => ({
      id: String(c.kimlik),
      code: c.stokKodu ?? '',
      name: c.stokAdi ?? '',
      barcode: c.birimler.flatMap((u) => u.barkodlar.map((b) => b.barkod)).join(' '),
      categoryIds: c.kategoriler.map((k) => String(k.kategoriId)),
      categoryId: c.kategoriler[0] ? String(c.kategoriler[0].kategoriId) : null,
    }));
  }

  async assign(user: number, categoryId: number, productIds: number[], remove: boolean) {
    await this.write(user, async (tx) => {
      await this.find(tx, user, categoryId);
      if (
        (await tx.stokKarti.count({
          where: { kullaniciKimligi: user, kimlik: { in: productIds } },
        })) !== productIds.length
      )
        throw new HttpError(
          404,
          'NOT_FOUND',
          'Seçilen ürünlerden biri bulunamadı. İşlem yapılmadı.',
        );
      if (remove)
        await tx.stokKartiKategori.deleteMany({
          where: { kategoriId: categoryId, stokKartiId: { in: productIds } },
        });
      else
        await tx.stokKartiKategori.createMany({
          skipDuplicates: true,
          data: productIds.map((stokKartiId) => ({ stokKartiId, kategoriId: categoryId })),
        });
    });
  }

  async image(user: number, id: number) {
    const row = await this.find(this.db, user, id);
    if (!row.gorselDosyasi) throw new HttpError(404, 'NOT_FOUND', 'Görsel bulunamadı.');
    return this.storage.read(row.gorselDosyasi);
  }
}
