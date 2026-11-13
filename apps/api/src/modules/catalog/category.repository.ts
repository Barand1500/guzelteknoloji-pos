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
  active: row.durum,
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

  private async checkProductAttributes(tx: Prisma.TransactionClient, productIds: number[]) {
    if (!productIds.length) return;
    const selections = await tx.stokOzellikDegeri.findMany({
      where: {
        stokKartiId: { in: productIds },
        deger: { grup: { sablon: { tumUrunler: false } } },
      },
      select: {
        stokKartiId: true,
        degerId: true,
        stokKarti: { select: { kategoriler: { select: { kategoriId: true } } } },
        deger: {
          select: {
            grup: {
              select: {
                sablon: {
                  select: {
                    kategoriler: { select: { kategoriId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    const incompatible = selections.filter(
      (s) =>
        !s.deger.grup.sablon.kategoriler.some((allowed) =>
          s.stokKarti.kategoriler.some((actual) => actual.kategoriId === allowed.kategoriId),
        ),
    );
    if (!incompatible.length) return;
    const used = await tx.stokVaryantDegeri.findFirst({
      where: {
        OR: incompatible.map((s) => ({
          degerId: s.degerId,
          varyant: { stokKartiId: s.stokKartiId },
        })),
      },
      select: { varyantId: true },
    });
    if (used)
      throw new HttpError(
        409,
        'CONFLICT',
        'Bu işlem, ürün varyantlarında kullanılan özellikleri kategoriyle uyumsuz hale getiriyor. Önce ilgili varyantları ve özellik seçimlerini düzenleyin. Hiçbir değişiklik kaydedilmedi.',
      );
    throw new HttpError(
      409,
      'CONFLICT',
      'Bu işlem, ürünün seçili özelliklerini kategoriyle uyumsuz hale getiriyor. Önce ürün kartındaki ilgili özellik seçimlerini kaldırın. Hiçbir değişiklik kaydedilmedi.',
    );
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
        durum: draft.active,
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

  /**
   * `sourceId` kategorisini `targetId` içine birleştirir: ürünleri hedefe de eklenir, doğrudan alt
   * kategorileri hedefin altına taşınır, sonra kaynak silinir. Hedef kaynağın kendi alt kategorisiyse
   * hedef kaynağın bulunduğu yere çıkar. Alt kategori adı çakışırsa işlem hiç yapılmaz.
   */
  async merge(user: number, sourceId: number, targetId: number) {
    if (sourceId === targetId)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Bir kategori kendisiyle birleştirilemez.');
    const file = await this.write(user, async (tx) => {
      const source = await this.find(tx, user, sourceId);
      const target = await this.find(tx, user, targetId);
      // Hedef, kaynağın kendi alt dalındaysa birleştirme ağacı döngüye sokar (torun/torunun çocuğu).
      let cursor = target.ustId;
      while (cursor !== null) {
        if (cursor === sourceId)
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Bir kategori kendi alt dalındaki kategoriyle birleştirilemez.',
          );
        const parentRow = await tx.kategori.findFirst({
          where: { id: cursor, kullaniciId: user },
          select: { ustId: true },
        });
        cursor = parentRow?.ustId ?? null;
      }
      const children = await tx.kategori.findMany({
        where: { kullaniciId: user, ustId: sourceId },
        orderBy: { sira: 'asc' },
      });
      // Önce tüm çakışmalar denetlenir (hiçbir şey yazılmadan).
      for (const child of children)
        await this.checkName(
          tx,
          user,
          child.id === targetId ? source.ustId : targetId,
          child.ad,
          child.id,
        );
      for (const child of children) {
        const parentId = child.id === targetId ? source.ustId : targetId;
        await tx.kategori.update({
          where: { id: child.id },
          data: { ustId: parentId, sira: await this.last(tx, user, parentId) },
        });
      }
      const links = await tx.stokKartiKategori.findMany({
        where: { kategoriId: sourceId },
        select: { stokKartiId: true },
      });
      const productIds = [...new Set(links.map((l) => l.stokKartiId))];
      if (productIds.length) {
        await tx.stokKartiKategori.createMany({
          data: productIds.map((stokKartiId) => ({ stokKartiId, kategoriId: target.id })),
          skipDuplicates: true,
        });
        await tx.stokKartiKategori.deleteMany({ where: { kategoriId: sourceId } });
        await this.checkProductAttributes(tx, productIds);
      }
      await tx.kategori.delete({ where: { id: sourceId } });
      return source.gorselDosyasi;
    });
    if (file) await this.storage.remove(file).catch(() => undefined);
  }

  async setActive(user: number, id: number, active: boolean) {
    await this.write(user, async (tx) => {
      await this.find(tx, user, id);
      await tx.kategori.update({ where: { id }, data: { durum: active } });
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
      const affected = await tx.stokKartiKategori.findMany({
        where: { kategoriId: { in: [...gone] } },
        select: { stokKartiId: true },
      });
      // Kontrol aynı transaction içinde yapılır; hata bütün silme işlemini geri alır.
      await tx.stokKartiKategori.deleteMany({ where: { kategoriId: { in: [...gone] } } });
      await this.checkProductAttributes(tx, [...new Set(affected.map((r) => r.stokKartiId))]);
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
      if (remove) {
        const affected = await tx.stokKartiKategori.findMany({
          where: { kategoriId: categoryId, stokKartiId: { in: productIds } },
          select: { stokKartiId: true },
        });
        await tx.stokKartiKategori.deleteMany({
          where: { kategoriId: categoryId, stokKartiId: { in: productIds } },
        });
        await this.checkProductAttributes(
          tx,
          affected.map((r) => r.stokKartiId),
        );
      } else
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
