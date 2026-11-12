import type {
  SeoKind,
  SeoListDto,
  SeoRedirectDraftInput,
  SeoRedirectDto,
  SeoRowDto,
  SeoSaveInput,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

/** Vitrin adresi türetilerek gösterilir; vitrin yayına girene kadar kaydedilmez. */
function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', ö: 'o', Ö: 'o',
    ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  };
  const replaced = value.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => map[ch] ?? ch);
  return (
    replaced
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'sayfa'
  );
}

type CategoryRow = {
  id: number;
  ad: string;
  ustId: number | null;
  seoBasligi: string;
  seoAciklamasi: string;
};
type SeoRedirectRow = {
  id: number;
  tur: string;
  kaynakId: number | null;
  eskiAdres: string;
  seoBasligi: string;
  seoAciklamasi: string;
};

/** SEO Ayarları verisi. Satırlar kullanıcının kendi katalog kayıtlarından okunur ve
 * yalnızca seo_basligi/seo_aciklamasi alanları güncellenir; 301 yönlendirmeleri
 * işletme kapsamındaki seo_yonlendirmeleri tablosunda tutulur. */
export class SeoRepository {
  constructor(private db: PrismaClient) {}

  async list(
    userId: number,
    businessId: number,
    kind: SeoKind,
    ara: string | undefined,
    page: number,
    per: number,
  ): Promise<SeoListDto> {
    if (kind === 'sabit-sayfa') return { total: 0, items: [] };
    const text = ara?.trim();
    const [total, redirects] = await Promise.all([
      this.count(kind, userId, text),
      this.db.seoYonlendirmesi.findMany({ where: { businessId, tur: kind }, orderBy: [{ id: 'asc' }] }),
    ]);
    const rows = await this.rows(kind, userId, text, (page - 1) * per, per);
    const items = await Promise.all(rows.map((row) => this.toRow(kind, row, redirects)));
    return { total, items };
  }

  // Her türün kendi alan adları olduğundan okuma tek noktadan türetilir.
  private async count(kind: SeoKind, userId: number, text: string | undefined): Promise<number> {
    if (kind === 'kategori') return this.db.kategori.count({ where: categoryWhere(userId, text) });
    if (kind === 'marka') return this.db.marka.count({ where: brandWhere(userId, text) });
    if (kind === 'firsat') return this.db.firsat.count({ where: dealWhere(userId, text) });
    return this.db.stokKarti.count({ where: productWhere(userId, text) });
  }

  private async rows(kind: SeoKind, userId: number, text: string | undefined, skip: number, take: number) {
    if (kind === 'kategori')
      return this.db.kategori.findMany({
        where: categoryWhere(userId, text),
        select: { id: true, ad: true, ustId: true, seoBasligi: true, seoAciklamasi: true },
        orderBy: [{ id: 'asc' }],
        skip,
        take,
      });
    if (kind === 'marka')
      return this.db.marka.findMany({
        where: brandWhere(userId, text),
        select: { kimlik: true, markaAdi: true, seoBasligi: true, seoAciklamasi: true },
        orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
        skip,
        take,
      });
    if (kind === 'firsat')
      return this.db.firsat.findMany({
        where: dealWhere(userId, text),
        select: { id: true, ad: true, seoBasligi: true, seoAciklamasi: true },
        orderBy: [{ sira: 'asc' }, { id: 'asc' }],
        skip,
        take,
      });
    return this.db.stokKarti.findMany({
      where: productWhere(userId, text),
      select: { kimlik: true, stokAdi: true, stokKodu: true, seoBasligi: true, seoAciklamasi: true },
      orderBy: [{ olusturmaTarihi: 'desc' }, { kimlik: 'desc' }],
      skip,
      take,
    });
  }

  private async toRow(kind: SeoKind, row: Record<string, unknown>, redirects: SeoRedirectRow[]): Promise<SeoRowDto> {
    const id = Number(row.id ?? row.kimlik);
    const name = String(row.ad ?? row.markaAdi ?? row.stokAdi ?? '');
    return {
      id: String(id),
      kind,
      name,
      address: await this.address(kind, row),
      seoTitle: String(row.seoBasligi ?? ''),
      seoDescription: String(row.seoAciklamasi ?? ''),
      redirects: redirects
        .filter((r) => r.kaynakId !== null && r.kaynakId === id)
        .map(
          (r): SeoRedirectDto => ({
            id: String(r.id),
            from: r.eskiAdres,
            seoTitle: r.seoBasligi,
            seoDescription: r.seoAciklamasi,
          }),
        ),
    };
  }

  /** Kategori adresi üst zinciriyle kurulur; diğer türler kendi adres kalıbını kullanır. */
  private async address(kind: SeoKind, row: Record<string, unknown>): Promise<string> {
    const name = String(row.ad ?? row.markaAdi ?? row.stokAdi ?? '');
    const slug = slugify(name);
    if (kind === 'marka') return `/marka/${slug}`;
    if (kind === 'firsat') return `/all-categories?firsat=${slug}`;
    if (kind === 'urun') return `/urun/${slug}`;
    const parts = [slug];
    let ustId = (row as CategoryRow).ustId ?? null;
    const seen = new Set<number>([(row as CategoryRow).id]);
    while (ustId !== null && !seen.has(ustId)) {
      const parent = await this.db.kategori.findUnique({
        where: { id: ustId },
        select: { id: true, ad: true, ustId: true },
      });
      if (!parent) break;
      seen.add(parent.id);
      parts.unshift(slugify(parent.ad));
      ustId = parent.ustId;
    }
    return `/${parts.join('/')}`;
  }

  async save(userId: number, kind: SeoKind, id: number, input: SeoSaveInput): Promise<void> {
    if (kind === 'sabit-sayfa')
      throw new HttpError(404, 'NOT_FOUND', 'Sabit sayfa kayıtları henüz eklenmedi.');
    const data = { seoBasligi: input.seoTitle, seoAciklamasi: input.seoDescription };
    const result =
      kind === 'kategori'
        ? await this.db.kategori.updateMany({ where: { id, kullaniciId: userId }, data })
        : kind === 'marka'
          ? await this.db.marka.updateMany({ where: { kimlik: id, kullaniciKimligi: userId }, data })
          : kind === 'firsat'
            ? await this.db.firsat.updateMany({ where: { id, kullaniciId: userId }, data })
            : await this.db.stokKarti.updateMany({ where: { kimlik: id, kullaniciKimligi: userId }, data });
    if (result.count === 0) throw new HttpError(404, 'NOT_FOUND', 'Kayıt bulunamadı.');
  }

  async addRedirect(userId: number, businessId: number, draft: SeoRedirectDraftInput): Promise<void> {
    if (draft.kind === 'sabit-sayfa')
      throw new HttpError(404, 'NOT_FOUND', 'Sabit sayfa kayıtları henüz eklenmedi.');
    if (draft.id !== null) await this.requireSource(userId, draft.kind, Number(draft.id));
    await this.db.seoYonlendirmesi
      .create({
        data: {
          businessId,
          tur: draft.kind,
          kaynakId: draft.id === null ? null : Number(draft.id),
          eskiAdres: draft.from,
          seoBasligi: draft.seoTitle,
          seoAciklamasi: draft.seoDescription,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
          throw new HttpError(409, 'CONFLICT', 'Bu eski adres için zaten bir yönlendirme var.');
        throw error;
      });
  }

  /** Yönlendirme yalnızca oturumdaki kullanıcının kendi sayfasına eklenebilir. */
  private async requireSource(userId: number, kind: SeoKind, id: number): Promise<void> {
    const found =
      kind === 'kategori'
        ? await this.db.kategori.findFirst({ where: { id, kullaniciId: userId }, select: { id: true } })
        : kind === 'marka'
          ? await this.db.marka.findFirst({ where: { kimlik: id, kullaniciKimligi: userId }, select: { kimlik: true } })
          : kind === 'firsat'
            ? await this.db.firsat.findFirst({ where: { id, kullaniciId: userId }, select: { id: true } })
            : await this.db.stokKarti.findFirst({ where: { kimlik: id, kullaniciKimligi: userId }, select: { kimlik: true } });
    if (!found) throw new HttpError(404, 'NOT_FOUND', 'Yönlendirme hedefi bulunamadı.');
  }

  async removeRedirect(businessId: number, id: number): Promise<void> {
    const result = await this.db.seoYonlendirmesi.deleteMany({ where: { id, businessId } });
    if (result.count === 0) throw new HttpError(404, 'NOT_FOUND', 'Yönlendirme bulunamadı.');
  }

  /** 301 satırının kendi başlık/açıklaması ekranında düzenlenebilir. */
  async updateRedirect(businessId: number, id: number, input: SeoSaveInput): Promise<void> {
    const result = await this.db.seoYonlendirmesi.updateMany({
      where: { id, businessId },
      data: { seoBasligi: input.seoTitle, seoAciklamasi: input.seoDescription },
    });
    if (result.count === 0) throw new HttpError(404, 'NOT_FOUND', 'Yönlendirme bulunamadı.');
  }
}

const categoryWhere = (userId: number, text: string | undefined): Prisma.KategoriWhereInput => ({
  kullaniciId: userId,
  ...textWhere(text),
});
const brandWhere = (userId: number, text: string | undefined): Prisma.MarkaWhereInput => ({
  kullaniciKimligi: userId,
  ...(text
    ? { OR: [{ markaAdi: { contains: text } }, ...textOr(text)] }
    : {}),
});
const dealWhere = (userId: number, text: string | undefined): Prisma.FirsatWhereInput => ({
  kullaniciId: userId,
  ...textWhere(text),
});
const productWhere = (userId: number, text: string | undefined): Prisma.StokKartiWhereInput => ({
  kullaniciKimligi: userId,
  ...(text
    ? {
        OR: [
          { stokAdi: { contains: text } },
          { stokKodu: { contains: text } },
          ...textOr(text),
        ],
      }
    : {}),
});
const textWhere = (text: string | undefined) =>
  text ? { OR: [{ seoBasligi: { contains: text } }, { seoAciklamasi: { contains: text } }] } : {};
const textOr = (text: string) => [
  { seoBasligi: { contains: text } },
  { seoAciklamasi: { contains: text } },
];
