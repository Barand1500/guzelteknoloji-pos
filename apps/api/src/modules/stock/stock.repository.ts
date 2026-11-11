import { createHash } from 'node:crypto';
import {
  DEFAULT_STOCK_LOOKUPS,
  type OptionListKey,
  type PriceBlockData,
  type SelectOption,
  type StockLookups,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { StokFiyati } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { stockImageUrl } from './stock-images';
import { stockListWhere } from './stock-list-query';
import type {
  StockSaveInput,
  ProductListItem,
  ProductListPage,
  StockBulkInput,
  StockListQuery,
} from './stock.api';

export interface StockRepository {
  getLookups(userId: string): Promise<StockLookups>;
  addOption(userId: string, list: OptionListKey, label: string): Promise<SelectOption>;
  removeOption(userId: string, list: OptionListKey, value: string): Promise<void>;
  renameOption(
    userId: string,
    list: OptionListKey,
    value: string,
    label: string,
  ): Promise<SelectOption>;
  create(userId: string, input: StockSaveInput): Promise<{ id: string }>;
  update(userId: string, id: string, input: StockSaveInput): Promise<{ id: string }>;
  get(userId: string, id: string): Promise<unknown>;
  getDraft(userId: string, id: string): Promise<unknown>;
  list(userId: string, query: StockListQuery): Promise<ProductListPage>;
  selectIds(userId: string, query: StockListQuery): Promise<{ ids: number[]; total: number }>;
  bulk(userId: string, input: StockBulkInput): Promise<{ affected: number }>;
  saveImported(
    userId: string,
    input: StockSaveInput,
    id: string | undefined,
    metadata: { stock?: string; categoryId?: number },
  ): Promise<{ id: string }>;
}

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const labelHash = (label: string) => hash(label.normalize('NFC').trim().toLocaleLowerCase('tr-TR'));
const nullable = (value: string) => (value === '' ? null : value);
const decimal = (value: string) => (value === '' ? null : new Prisma.Decimal(value));

/** Shared paket değişene kadar eski fiyat-listesi sözleşmesini ortak birimlere çevirir. */
function commonUnits(draft: StockSaveInput['draft']) {
  const lists = Object.entries(draft.units);
  const first = lists[0]?.[1];
  if (!first?.length) throw new HttpError(400, 'VALIDATION_ERROR', 'En az bir birim ekleyin.');
  const signature = (row: (typeof first)[number]) =>
    JSON.stringify({
      unit: row.unit,
      multiplier: new Prisma.Decimal(row.multiplier).toString(),
      isMain: row.isMain,
      isDefault: row.isDefault,
      weight: row.weight === '' ? null : new Prisma.Decimal(row.weight).toString(),
      weightUnit: row.weightUnit,
      volume: row.volume === '' ? null : new Prisma.Decimal(row.volume).toString(),
      barcodes: row.barcodes
        .map((b) => [b.type, b.code])
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    });
  for (const [, rows] of lists) {
    if (
      rows.length !== first.length ||
      rows.some((row, i) => signature(row) !== signature(first[i]!))
    )
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Birim ve barkodlar tüm fiyat listelerinde ortak olmalı. Birim bilgilerini eşitleyin.',
      );
  }
  const barcodes = first.flatMap((row) => row.barcodes.map((b) => b.code));
  if (new Set(barcodes.map((code) => code.toLocaleLowerCase('en-US'))).size !== barcodes.length)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Aynı barkod bir kartta birden fazla kez kullanılamaz.',
    );
  return { lists, rows: first, barcodes };
}

async function retryWrite<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034' ||
        attempt >= 2
      )
        throw error;
    }
  }
}

/** Türetilen fiyatlar saklanmaz; aynı ondalık hesap ve altı haneli yuvarlama korunur. */
function calculatedPrices(price: StokFiyati) {
  const amount = price.girilenFiyat;
  const net =
    amount?.mul(
      new Prisma.Decimal(1).minus((price.iskontoOrani ?? new Prisma.Decimal(0)).div(100)),
    ) ?? null;
  const factor = new Prisma.Decimal(1).plus((price.kdvOrani ?? new Prisma.Decimal(0)).div(100));
  const excludingVat = net === null ? null : price.kdvDahilGirildi ? net.div(factor) : net;
  const includingVat = excludingVat?.mul(factor) ?? null;
  const round = (value: Prisma.Decimal | null) => value?.toDecimalPlaces(6).toString() ?? null;
  return { net: round(net), excludingVat: round(excludingVat), includingVat: round(includingVat) };
}

function priceData(side: 'alis' | 'satis', block: PriceBlockData) {
  return {
    fiyatYonu: side,
    girilenFiyat: decimal(block.amount),
    paraBirimi: block.currency,
    iskontoOrani: decimal(block.discount),
    kdvOrani: decimal(block.vatRate),
    kdvDahilGirildi: block.vatIncluded,
  };
}

type BulkPriceInput = Extract<StockBulkInput, { islem: 'fiyat_guncelle' }>;

const ZERO = new Prisma.Decimal(0);

/**
 * KDV HARİÇ bir tutarın yeni değeri. Hesap seçilen dayanağa göre yapılır (`kdv`): "dahil" ise
 * değişim KDV dahil fiyata, "haric" ise KDV hariç fiyata uygulanır (yüzdede fark yoktur, sabit
 * tutarda vardır). Sonuç `yuvarla` adımına yuvarlanır; sıfırın altı hata verir.
 */
export function bulkPriceExcl(
  excl: Prisma.Decimal,
  rate: Prisma.Decimal,
  input: Pick<BulkPriceInput, 'mod' | 'kdv' | 'yuvarla'> & { value: Prisma.Decimal },
): Prisma.Decimal {
  const toBasis = input.kdv === 'dahil' ? rate.plus(1) : new Prisma.Decimal(1);
  const base = excl.times(toBasis);
  let target =
    input.mod === 'yuzde_artir'
      ? base.times(input.value.div(100).plus(1))
      : input.mod === 'yuzde_azalt'
        ? base.times(new Prisma.Decimal(1).minus(input.value.div(100)))
        : input.mod === 'tutar_ekle'
          ? base.plus(input.value)
          : input.mod === 'tutar_cikar'
            ? base.minus(input.value)
            : input.value;
  if (input.yuvarla !== 'yok') {
    const step = new Prisma.Decimal(input.yuvarla);
    target = target.div(step).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).times(step);
  }
  if (target.isNeg())
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Bazı ürünlerde fiyat sıfırın altına düşer. İşlem yapılmadı.',
    );
  return target.div(toBasis);
}

/**
 * Bir fiyat satırının yeni "girilen tutarı". Gösterilen KDV dahil fiyat = girilen × (1 − iskonto) ×
 * (KDV hariç girildiyse 1 + KDV). Hesap `bulkPriceExcl` ile yapılır, sonra satırın girilme biçimine
 * (dahil/hariç, iskontolu) geri çevrilir. İskonto %100 olan ya da fiyatı boş satır atlanır (null).
 */
export function bulkPriceEntered(
  row: {
    girilenFiyat: Prisma.Decimal | null;
    kdvOrani: Prisma.Decimal | null;
    iskontoOrani: Prisma.Decimal | null;
    kdvDahilGirildi: boolean;
  },
  input: Pick<BulkPriceInput, 'mod' | 'kdv' | 'yuvarla'> & { value: Prisma.Decimal },
): Prisma.Decimal | null {
  if (!row.girilenFiyat) return null;
  const rate = (row.kdvOrani ?? ZERO).div(100);
  const keep = new Prisma.Decimal(1).minus((row.iskontoOrani ?? ZERO).div(100));
  if (keep.lte(0)) return null;
  // entered × keep × (dahil girildiyse 1/(1+r), değilse 1) = KDV hariç tutar
  const inclusive = row.kdvDahilGirildi;
  const excl = row.girilenFiyat.times(keep).div(inclusive ? rate.plus(1) : 1);
  const newExcl = bulkPriceExcl(excl, rate, input);
  const entered = newExcl
    .times(inclusive ? rate.plus(1) : 1)
    .div(keep)
    .toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
  if (entered.gt(new Prisma.Decimal('999999999999.999999')))
    throw new HttpError(400, 'VALIDATION_ERROR', 'Fiyat çok büyük olur. İşlem yapılmadı.');
  return entered;
}

/**
 * Seçilen ürünlerin ana birim fiyatını (bir liste ve yön için) toplu değiştirir. İskonto ve "KDV
 * dahil girildi" durumu korunur, yalnızca girilen tutar yeniden hesaplanır. İstenirse varyantların
 * (KDV hariç) fiyatı da aynı değişimle güncellenir. Sıfırın altına düşen sonuç tüm işlemi reddeder.
 */
async function bulkPrice(
  tx: Prisma.TransactionClient,
  userId: number,
  input: BulkPriceInput,
): Promise<{ affected: number; skipped: number }> {
  if (
    !(await tx.stokSecenegi.count({
      where: { kimlik: input.listeId, kullaniciKimligi: userId, listeTuru: 'priceLists' },
    }))
  )
    throw new HttpError(404, 'NOT_FOUND', 'Fiyat listesi bulunamadı.');
  const rows = await tx.stokFiyati.findMany({
    where: {
      fiyatListesiKimligi: input.listeId,
      fiyatYonu: input.yon,
      girilenFiyat: { not: null },
      stokBirimi: { anaBirim: true, stokKartiKimligi: { in: input.ids } },
    },
    include: { stokBirimi: { select: { stokKartiKimligi: true } } },
  });
  const value = new Prisma.Decimal(input.deger);
  if (input.mod === 'yuzde_azalt' && value.gt(100))
    throw new HttpError(400, 'VALIDATION_ERROR', 'Oran 0–100 arasında olmalı.');
  const change = { mod: input.mod, kdv: input.kdv, yuvarla: input.yuvarla, value };
  const rateByProduct = new Map<number, Prisma.Decimal>();
  for (const row of rows) {
    const entered = bulkPriceEntered(row, change);
    if (entered === null) continue;
    rateByProduct.set(row.stokBirimi.stokKartiKimligi, (row.kdvOrani ?? ZERO).div(100));
    await tx.stokFiyati.update({ where: { kimlik: row.kimlik }, data: { girilenFiyat: entered } });
  }
  if (input.varyantlar && input.yon === 'satis' && rateByProduct.size) {
    const variants = await tx.stokVaryanti.findMany({
      where: { stokKartiId: { in: [...rateByProduct.keys()] } },
    });
    for (const variant of variants) {
      const rate = rateByProduct.get(variant.stokKartiId) ?? ZERO;
      const fiyat = bulkPriceExcl(variant.fiyat, rate, change).toDecimalPlaces(
        6,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      await tx.stokVaryanti.update({ where: { id: variant.id }, data: { fiyat } });
    }
  }
  return { affected: rows.length, skipped: input.ids.length - rows.length };
}

export class PrismaStockRepository implements StockRepository {
  constructor(private readonly db: PrismaClient) {}

  private async ensureDefaults(userId: string) {
    const initialized = await this.db.stokSecenegi.findUnique({
      where: {
        kullaniciKimligi_listeTuru_secenekKodu: {
          kullaniciKimligi: Number(userId),
          listeTuru: 'stockTypes',
          secenekKodu: 'basit',
        },
      },
      select: { kimlik: true },
    });
    if (initialized) return;
    // Benzersiz anahtar sayesinde eşzamanlı açılışlar çoğaltmaz; silinen varsayılanlar yeniden etkinleşmez.
    await retryWrite(() =>
      this.db.stokSecenegi.createMany({
        skipDuplicates: true,
        data: (Object.keys(DEFAULT_STOCK_LOOKUPS) as (keyof StockLookups)[])
          .filter((key) => key !== 'brands' && key !== 'vatDepartments' && key !== 'stockKinds')
          .flatMap((listKey) =>
            DEFAULT_STOCK_LOOKUPS[listKey].map((option, position) => ({
              kullaniciKimligi: Number(userId),
              listeTuru: listKey,
              secenekKodu: option.value,
              secenekAdi: option.label,
              adHash: labelHash(option.label),
              silinebilir: option.removable ?? false,
              sira: position,
            })),
          ),
      }),
    );
  }

  async getLookups(userId: string): Promise<StockLookups> {
    await this.ensureDefaults(userId);
    const rows = await this.db.stokSecenegi.findMany({
      where: { kullaniciKimligi: Number(userId), etkin: true },
      orderBy: [{ sira: 'asc' }, { olusturmaZamani: 'asc' }, { kimlik: 'asc' }],
    });
    const result = {} as StockLookups;
    for (const key of Object.keys(DEFAULT_STOCK_LOOKUPS) as (keyof StockLookups)[]) {
      result[key] = rows
        .filter((row) => row.listeTuru === key)
        .map((row) => ({
          value: row.secenekKodu,
          label: row.secenekAdi,
          removable: row.silinebilir,
        }));
    }
    const brands = await this.db.marka.findMany({
      where: { kullaniciKimligi: Number(userId), etkin: true },
      select: { kimlik: true, markaAdi: true },
      orderBy: [{ sira: 'asc' }, { olusturmaZamani: 'asc' }, { kimlik: 'asc' }],
    });
    result.brands = brands.map((brand) => ({ value: String(brand.kimlik), label: brand.markaAdi }));
    return result;
  }

  async addOption(userId: string, listKey: OptionListKey, label: string) {
    if (listKey === 'vatDepartments' || listKey === 'stockKinds')
      throw new HttpError(400, 'VALIDATION_ERROR', 'Bu alan ürün ekranından kaldırıldı.');
    await this.ensureDefaults(userId);
    const row = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${userId} FOR UPDATE`);

      return tx.stokSecenegi.upsert({
        where: {
          kullaniciKimligi_listeTuru_adHash: {
            kullaniciKimligi: Number(userId),
            listeTuru: listKey,
            adHash: labelHash(label),
          },
        },
        create: {
          kullaniciKimligi: Number(userId),
          listeTuru: listKey,
          secenekKodu: `ozel-${labelHash(label)}`,
          secenekAdi: label,
          adHash: labelHash(label),
          silinebilir: true,
          sira: 1000,
        },
        update: { etkin: true },
      });
    });
    return { value: row.secenekKodu, label: row.secenekAdi, removable: row.silinebilir };
  }

  async removeOption(userId: string, listKey: OptionListKey, value: string) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${userId} FOR UPDATE`);

      const row = await tx.stokSecenegi.findUnique({
        where: {
          kullaniciKimligi_listeTuru_secenekKodu: {
            kullaniciKimligi: Number(userId),
            listeTuru: listKey,
            secenekKodu: value,
          },
        },
      });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Seçenek bulunamadı.');
      if (!row.silinebilir)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Sabit seçenek silinemez.');
      // Fiziksel silme yapılmaz; geçmiş kartların ilişkileri korunur.
      await tx.stokSecenegi.update({ where: { kimlik: row.kimlik }, data: { etkin: false } });
    });
  }

  async renameOption(userId: string, listKey: OptionListKey, value: string, label: string) {
    if (listKey !== 'priceLists')
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Yalnızca fiyat listesi adları değiştirilebilir.',
      );
    const clean = label.trim();
    if (!clean) throw new HttpError(400, 'VALIDATION_ERROR', 'Fiyat listesi adı boş olamaz.');
    const row = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${userId} FOR UPDATE`);
      const current = await tx.stokSecenegi.findUnique({
        where: {
          kullaniciKimligi_listeTuru_secenekKodu: {
            kullaniciKimligi: Number(userId),
            listeTuru: listKey,
            secenekKodu: value,
          },
        },
      });
      if (!current) throw new HttpError(404, 'NOT_FOUND', 'Fiyat listesi bulunamadı.');
      if (!current.silinebilir)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Sabit fiyat listesi adı değiştirilemez.');
      const duplicate = await tx.stokSecenegi.findFirst({
        where: {
          kullaniciKimligi: Number(userId),
          listeTuru: listKey,
          adHash: labelHash(clean),
          etkin: true,
          kimlik: { not: current.kimlik },
        },
      });
      if (duplicate)
        throw new HttpError(409, 'CONFLICT', 'Bu fiyat listesi adı zaten kullanılıyor.');
      return tx.stokSecenegi.update({
        where: { kimlik: current.kimlik },
        data: { secenekAdi: clean, adHash: labelHash(clean) },
      });
    });
    return { value: row.secenekKodu, label: row.secenekAdi, removable: row.silinebilir };
  }

  async create(userId: string, input: StockSaveInput) {
    return this.saveCard(userId, input);
  }

  async update(userId: string, id: string, input: StockSaveInput) {
    return this.saveCard(userId, input, Number(id));
  }
  async saveImported(
    userId: string,
    input: StockSaveInput,
    id: string | undefined,
    metadata: { stock?: string; categoryId?: number },
  ) {
    return this.saveCard(userId, input, id === undefined ? undefined : Number(id), metadata);
  }

  private async saveCard(
    userId: string,
    input: StockSaveInput,
    cardId?: number,
    metadata?: { stock?: string; categoryId?: number },
  ) {
    const common = commonUnits(input.draft);
    await this.ensureDefaults(userId);
    const requestHash = hash(
      JSON.stringify(input.extras ? { draft: input.draft, extras: input.extras } : input.draft),
    );
    try {
      return await retryWrite(() =>
        this.db.$transaction(
          async (tx) => {
            await tx.$queryRaw(
              Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${Number(userId)} FOR UPDATE`,
            );
            const current =
              cardId === undefined
                ? null
                : await tx.stokKarti.findFirst({
                    where: { kimlik: cardId, kullaniciKimligi: Number(userId) },
                    include: {
                      birimler: { include: { fiyatlar: true } },
                      _count: { select: { varyantlar: true } },
                    },
                  });
            if (cardId !== undefined && !current)
              throw new HttpError(404, 'NOT_FOUND', 'Stok kartı bulunamadı.');
            if (input.extras) {
              const { categoryIds, dealIds } = input.extras;
              const user = Number(userId);
              if (
                (await tx.kategori.count({
                  where: { kullaniciId: user, id: { in: categoryIds } },
                })) !== categoryIds.length ||
                (await tx.firsat.count({ where: { kullaniciId: user, id: { in: dealIds } } })) !==
                  dealIds.length
              )
                throw new HttpError(
                  404,
                  'NOT_FOUND',
                  'Seçilen kategori veya fırsat bulunamadı. İşlem yapılmadı.',
                );
              if (input.extras.attributeValueIds) {
                const values = await tx.ozellikDegeri.findMany({
                  where: {
                    id: { in: input.extras.attributeValueIds },
                    grup: { sablon: { kullaniciId: user } },
                  },
                  include: { grup: { include: { sablon: { include: { kategoriler: true } } } } },
                });
                if (
                  values.length !== input.extras.attributeValueIds.length ||
                  values.some(
                    (v) =>
                      !v.grup.sablon.tumUrunler &&
                      !v.grup.sablon.kategoriler.some((k) => categoryIds.includes(k.kategoriId)),
                  )
                )
                  throw new HttpError(
                    400,
                    'VALIDATION_ERROR',
                    'Seçilen özellikler ürünün kategorisine uygun değil.',
                  );
                for (const value of values)
                  if (
                    !value.grup.coklu &&
                    !value.grup.varyant &&
                    values.filter((v) => v.grupId === value.grupId).length > 1
                  )
                    throw new HttpError(
                      400,
                      'VALIDATION_ERROR',
                      'Bu özellik grubunda yalnızca bir değer seçilebilir.',
                    );
              }
            }
            if (
              metadata?.categoryId !== undefined &&
              !(await tx.kategori.findFirst({
                where: { id: metadata.categoryId, kullaniciId: Number(userId) },
                select: { id: true },
              }))
            )
              throw new HttpError(404, 'NOT_FOUND', 'Kategori bulunamadı.');
            const replay = await tx.stokKarti.findUnique({
              where: {
                kullaniciKimligi_kayitIstegiKimligi: {
                  kullaniciKimligi: Number(userId),
                  kayitIstegiKimligi: input.requestId,
                },
              },
            });
            if (replay) {
              if (
                (cardId !== undefined && replay.kimlik !== cardId) ||
                replay.kayitIstegiHash !== requestHash
              )
                throw new HttpError(
                  409,
                  'CONFLICT',
                  'Bu kayıt isteği farklı bilgilerle kullanılmış. Yeniden kaydedin.',
                );
              return { id: String(replay.kimlik) };
            }
            const allowedOldOptions = new Set(
              current
                ? [
                    current.stokTipiKimligi,
                    ...current.birimler.flatMap((unit) => [
                      unit.birimKimligi,
                      ...unit.fiyatlar.map((p) => p.fiyatListesiKimligi),
                    ]),
                  ].filter((id): id is number => id !== null)
                : [],
            );
            const options = await tx.stokSecenegi.findMany({
              where: { kullaniciKimligi: Number(userId) },
            });
            const optionId = (
              key: keyof StockLookups,
              value: string,
              optional = false,
            ): number | null => {
              if (optional && !value) return null;
              const found = options.find(
                (o) =>
                  o.listeTuru === key &&
                  o.secenekKodu === value &&
                  (o.etkin || allowedOldOptions.has(o.kimlik)),
              );
              if (!found)
                throw new HttpError(
                  400,
                  'VALIDATION_ERROR',
                  'Seçilen seçenek artık kullanılamıyor. Listeyi yenileyin.',
                );
              return found.kimlik;
            };
            const d = input.draft;
            optionId('stockTypes', d.stockType);
            for (const row of common.rows) optionId('units', row.unit);
            for (const [list] of common.lists) optionId('priceLists', list);
            if (d.brand && (!/^[1-9][0-9]{0,9}$/.test(d.brand) || Number(d.brand) > 2147483647))
              throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir marka seçin.');
            const brand = d.brand
              ? await tx.marka.findFirst({
                  where: {
                    kimlik: Number(d.brand),
                    kullaniciKimligi: Number(userId),
                    OR: [
                      { etkin: true },
                      ...(current?.markaKimligi ? [{ kimlik: current.markaKimligi }] : []),
                    ],
                  },
                })
              : null;
            if (d.brand && !brand)
              throw new HttpError(400, 'VALIDATION_ERROR', 'Seçilen marka kullanılamıyor.');
            if (
              d.code &&
              (await tx.stokKarti.findFirst({
                where: {
                  kullaniciKimligi: Number(userId),
                  stokKodu: d.code,
                  ...(cardId === undefined ? {} : { kimlik: { not: cardId } }),
                },
                select: { kimlik: true },
              }))
            )
              throw new HttpError(
                409,
                'CONFLICT',
                'Bu stok koduyla bir kart zaten var. Farklı bir stok kodu girin.',
              );
            if (
              d.code &&
              (await tx.stokVaryanti.findFirst({
                where: { kod: d.code, stokKarti: { kullaniciKimligi: Number(userId) } },
              }))
            )
              throw new HttpError(409, 'CONFLICT', 'Bu stok kodu bir varyantta kullanılıyor.');
            if (
              common.barcodes.length &&
              (await tx.stokVaryanti.findFirst({
                where: {
                  barkod: { in: common.barcodes },
                  stokKarti: { kullaniciKimligi: Number(userId) },
                },
              }))
            )
              throw new HttpError(409, 'CONFLICT', 'Bu barkod bir varyantta kullanılıyor.');
            if (
              common.barcodes.length &&
              (await tx.stokBarkodu.findFirst({
                where: {
                  barkod: { in: common.barcodes },
                  stokBirimi: {
                    stokKarti: {
                      kullaniciKimligi: Number(userId),
                      ...(cardId === undefined ? {} : { kimlik: { not: cardId } }),
                    },
                  },
                },
              }))
            )
              throw new HttpError(
                409,
                'CONFLICT',
                'Bu barkod başka bir stok kartında kullanılıyor.',
              );
            const normal = d.inventoryTracking === 'normal';
            const hasVariants = (current?._count.varyantlar ?? 0) > 0;
            if (hasVariants && metadata?.stock !== undefined)
              throw new HttpError(
                409,
                'CONFLICT',
                'Varyantlı ürünün miktarını dosyadan değiştiremezsiniz. Miktarları varyantlar bölümünden güncelleyin.',
              );
            const changes = {
              kayitIstegiKimligi: input.requestId,
              kayitIstegiHash: requestHash,
              stokKodu: nullable(d.code),
              stokAdi: nullable(d.name),
              stokTipiKimligi: optionId('stockTypes', d.stockType)!,
              markaKimligi: brand?.kimlik ?? null,
              envanterTakibi: d.inventoryTracking,
              // Formda adet alanı yok: kayıtlı adet korunur. Yalnızca dosyadan içe aktarma adet gönderir.
              ...(normal && !hasVariants && d.stockQuantity !== undefined
                ? { stokMiktari: decimal(d.stockQuantity) ?? new Prisma.Decimal(0) }
                : {}),
              mensei: nullable(d.origin),
              birimler: {
                create: common.rows.map((row, position) => ({
                  birimKimligi: optionId('units', row.unit)!,
                  sira: position,
                  carpan: new Prisma.Decimal(row.multiplier),
                  anaBirim: row.isMain,
                  varsayilanBirim: row.isDefault,
                  agirlik: decimal(row.weight),
                  agirlikBirimi: row.weightUnit,
                  hacimDesi: decimal(row.volume),
                  barkodlar: {
                    create: row.barcodes.map((b) => ({ barkodTuru: b.type, barkod: b.code })),
                  },
                  fiyatlar: {
                    create: common.lists.flatMap(([list, rows]) => {
                      const priceRow = rows[position]!;
                      const fiyatListesiKimligi = optionId('priceLists', list)!;
                      return [
                        { ...priceData('alis', priceRow.purchase), fiyatListesiKimligi },
                        { ...priceData('satis', priceRow.sale), fiyatListesiKimligi },
                      ];
                    }),
                  },
                })),
              },
            };
            // Kart numarası, satış durumu, stok miktarı ve kategoriler güncellemede korunur.
            const finish = async (id: number) => {
              if (input.extras) {
                if (input.extras.attributeValueIds) {
                  const used = await tx.stokVaryantDegeri.findFirst({
                    where: {
                      varyant: { stokKartiId: id },
                      degerId: { notIn: input.extras.attributeValueIds },
                    },
                  });
                  if (used)
                    throw new HttpError(
                      409,
                      'CONFLICT',
                      'Varyantta kullanılan özellik seçimi kaldırılamaz.',
                    );
                  await tx.stokOzellikDegeri.deleteMany({ where: { stokKartiId: id } });
                  await tx.stokOzellikDegeri.createMany({
                    data: input.extras.attributeValueIds.map((degerId) => ({
                      stokKartiId: id,
                      degerId,
                    })),
                  });
                }
                await tx.stokKartiKategori.deleteMany({ where: { stokKartiId: id } });
                await tx.stokFirsati.deleteMany({ where: { stokKartiId: id } });
                if (input.extras.categoryIds.length)
                  await tx.stokKartiKategori.createMany({
                    data: input.extras.categoryIds.map((kategoriId) => ({
                      stokKartiId: id,
                      kategoriId,
                    })),
                  });
                if (input.extras.dealIds.length)
                  await tx.stokFirsati.createMany({
                    data: input.extras.dealIds.map((firsatId) => ({ stokKartiId: id, firsatId })),
                  });
              }
              if (metadata?.stock !== undefined)
                await tx.stokKarti.update({
                  where: { kimlik: id },
                  data: { stokMiktari: new Prisma.Decimal(metadata.stock) },
                });
              if (metadata?.categoryId !== undefined)
                await tx.stokKartiKategori.createMany({
                  skipDuplicates: true,
                  data: [{ stokKartiId: id, kategoriId: metadata.categoryId }],
                });
              return { id: String(id) };
            };
            if (cardId !== undefined) {
              await tx.stokBirimi.deleteMany({ where: { stokKartiKimligi: cardId } });
              const saved = await tx.stokKarti.update({
                where: { kimlik: cardId },
                data: changes,
                select: { kimlik: true },
              });
              return finish(saved.kimlik);
            }
            const saved = await tx.stokKarti.create({
              data: { kullaniciKimligi: Number(userId), ...changes },
              select: { kimlik: true },
            });
            return finish(saved.kimlik);
          },
          { timeout: 15000 },
        ),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new HttpError(
          409,
          'CONFLICT',
          'Kayıtta tekrarlanan bir kod veya barkod var. Bilgileri kontrol edin.',
        );
      throw error;
    }
  }

  private async readCard(userId: string, id: string) {
    const card = await this.db.stokKarti.findFirst({
      where: { kimlik: Number(id), kullaniciKimligi: Number(userId) },
      include: {
        stokTipi: true,
        marka: true,
        varyantlar: { select: { miktar: true } },
        kategoriler: { include: { kategori: true }, orderBy: { kategoriId: 'asc' } },
        birimler: {
          orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
          include: {
            secenek: true,
            barkodlar: { orderBy: { kimlik: 'asc' } },
            fiyatlar: { include: { fiyatListesi: true } },
          },
        },
      },
    });
    if (!card) throw new HttpError(404, 'NOT_FOUND', 'Stok kartı bulunamadı.');
    return card;
  }

  async get(userId: string, id: string) {
    return this.getDraft(userId, id);
  }

  async getDraft(userId: string, id: string) {
    const card = await this.readCard(userId, id);
    const str = (value: unknown) => (value == null ? '' : String(value));
    const listOptions = new Map(
      card.birimler.flatMap((u) =>
        u.fiyatlar.map((p) => [p.fiyatListesiKimligi, p.fiyatListesi] as const),
      ),
    );
    const lists = [...listOptions.values()].sort((a, b) => a.sira - b.sira || a.kimlik - b.kimlik);
    const units = Object.fromEntries(
      lists.map((list) => [
        list.secenekKodu,
        card.birimler.map((unit) => {
          const price = (side: string) => {
            const row = unit.fiyatlar.find(
              (p) => p.fiyatListesiKimligi === list.kimlik && p.fiyatYonu === side,
            );
            return {
              amount: str(row?.girilenFiyat),
              currency: row?.paraBirimi ?? 'TRY',
              discount: str(row?.iskontoOrani),
              vatRate: str(row?.kdvOrani),
              vatIncluded: row?.kdvDahilGirildi ?? false,
              extras: [],
            };
          };
          return {
            id: String(unit.kimlik),
            unit: unit.secenek.secenekKodu,
            multiplier: str(unit.carpan),
            purchase: price('alis'),
            sale: price('satis'),
            barcodes: unit.barkodlar.map((b) => ({
              id: String(b.kimlik),
              type: b.barkodTuru,
              code: b.barkod,
            })),
            weight: str(unit.agirlik),
            weightUnit: unit.agirlikBirimi,
            volume: str(unit.hacimDesi),
            note: '',
            isMain: unit.anaBirim,
            isDefault: unit.varsayilanBirim,
          };
        }),
      ]),
    );
    return {
      stockType: card.stokTipi.secenekKodu,
      code: str(card.stokKodu),
      name: str(card.stokAdi),
      brand: str(card.markaKimligi),
      vatDepartment: '',
      stockKind: '',
      inventoryTracking: card.envanterTakibi,
      gtip: '',
      origin: str(card.mensei),
      units,
    };
  }

  async list(userId: string, query: StockListQuery): Promise<ProductListPage> {
    return this.db.$transaction(
      async (tx) => {
        const priceLists = await tx.stokSecenegi.findMany({
          where: { kullaniciKimligi: Number(userId), listeTuru: 'priceLists', etkin: true },
          orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
        });
        const where = stockListWhere(Number(userId), query, priceLists[0]?.kimlik);
        const counts = await tx.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT COUNT(*) AS total FROM urunler k WHERE ${where}`,
        );
        const total = Number(counts[0]?.total ?? 0);
        const page = Math.min(query.sayfa, Math.max(1, Math.ceil(total / query.boyut)));
        if (query.sayim === '1') return { items: [], total, page, pageSize: query.boyut };
        const ids = await tx.$queryRaw<
          { id: number }[]
        >(Prisma.sql`SELECT k.id FROM urunler k WHERE ${where}
          ORDER BY k.olusturma_zamani DESC, k.id DESC LIMIT ${query.boyut} OFFSET ${(page - 1) * query.boyut}`);
        const rows = await tx.stokKarti.findMany({
          where: { kullaniciKimligi: Number(userId), kimlik: { in: ids.map((row) => row.id) } },
          orderBy: [{ olusturmaZamani: 'desc' }, { kimlik: 'desc' }],
          include: {
            firsatlar: true,
            _count: { select: { varyantlar: true } },
            varyantlar: { select: { miktar: true, barkod: true } },
            gorseller: { orderBy: [{ sira: 'asc' }, { id: 'asc' }] },
            marka: true,
            stokTipi: true,
            kategoriler: { orderBy: { kategoriId: 'asc' }, include: { kategori: true } },
            birimler: {
              orderBy: { sira: 'asc' },
              include: {
                barkodlar: true,
                fiyatlar: { include: { fiyatListesi: true } },
              },
            },
          },
        });
        const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
        // Kullanıcının fiyat listeleri (sekme adları ve sırası); her ürün hepsi için fiyat taşır.
        const items: ProductListItem[] = rows.map((card) => {
          const prices = card.birimler.find((unit) => unit.anaBirim)?.fiyatlar ?? [];
          const saleFor = (key: string) =>
            prices.find((p) => p.fiyatYonu === 'satis' && p.fiyatListesi.secenekKodu === key);
          const sales = [saleFor('fiyat'), saleFor('perakende'), saleFor('toptan')];
          const first = sales[0];
          const purchase = prices.find(
            (p) => p.fiyatYonu === 'alis' && p.fiyatListesi.secenekKodu === 'fiyat',
          );
          const excludingVat = (p: typeof first) =>
            p ? Number(calculatedPrices(p).excludingVat ?? 0) : 0;
          const categories = card.kategoriler.map((k) => k.kategori);
          return {
            id: String(card.kimlik),
            code: card.stokKodu ?? '',
            name: card.stokAdi ?? '',
            stockType: card.stokTipi.secenekAdi,
            brandId: card.markaKimligi === null ? null : String(card.markaKimligi),
            brandName: card.marka?.markaAdi ?? '',
            categoryId: categories[0] ? String(categories[0].id) : null,
            categoryName: categories.map((c) => c.ad).join(', ') || 'Kategorisiz',
            categoryIds: categories.map((c) => String(c.id)),
            categoryNames: categories.map((c) => c.ad),
            imageUrl: card.gorseller[0] ? stockImageUrl(card.gorseller[0]) : null,
            imageUrls: card.gorseller.map(stockImageUrl),
            variantCount: card._count.varyantlar,
            barcode: card.birimler.flatMap((unit) => unit.barkodlar.map((b) => b.barkod))[0] ?? '',
            barcodes: [
              ...card.birimler.flatMap((unit) => unit.barkodlar.map((b) => b.barkod)),
              ...card.varyantlar.flatMap((v) => (v.barkod ? [v.barkod] : [])),
            ],
            currency: symbols[first?.paraBirimi ?? 'TRY'] ?? first?.paraBirimi ?? '₺',
            vatRate: Number(first?.kdvOrani ?? 0),
            prices: [excludingVat(sales[0]), excludingVat(sales[1]), excludingVat(sales[2])],
            cost: excludingVat(purchase),
            costVatRate: Number(purchase?.kdvOrani ?? 0),
            costCurrency: purchase?.paraBirimi ?? 'TRY',
            stock: Number(
              card.varyantlar.length
                ? card.varyantlar.reduce((sum, v) => sum.plus(v.miktar), new Prisma.Decimal(0))
                : card.stokMiktari,
            ),
            stockTracking: card.envanterTakibi !== 'yok',
            salesOpen: card.satisAcik,
            dealIds: card.firsatlar.map((f) => String(f.firsatId)),
            priceVatRates: [
              Number(sales[0]?.kdvOrani ?? 0),
              Number(sales[1]?.kdvOrani ?? 0),
              Number(sales[2]?.kdvOrani ?? 0),
            ],
            priceCurrencies: [
              sales[0]?.paraBirimi ?? 'TRY',
              sales[1]?.paraBirimi ?? 'TRY',
              sales[2]?.paraBirimi ?? 'TRY',
            ],
            listPrices: priceLists.map((list) => {
              const buy = prices.find(
                (p) => p.fiyatYonu === 'alis' && p.fiyatListesi.kimlik === list.kimlik,
              );
              const buyNet = buy ? calculatedPrices(buy).excludingVat : null;
              const sale = prices.find(
                (p) => p.fiyatYonu === 'satis' && p.fiyatListesi.kimlik === list.kimlik,
              );
              const excluding = sale ? calculatedPrices(sale).excludingVat : null;
              return {
                id: String(list.kimlik),
                code: list.secenekKodu,
                name: list.secenekAdi,
                purchase: {
                  net: buyNet === null ? null : Number(buyNet),
                  gross:
                    buyNet === null
                      ? null
                      : Number(
                          new Prisma.Decimal(buyNet)
                            .mul(new Prisma.Decimal(1).plus((buy?.kdvOrani ?? ZERO).div(100)))
                            .toDecimalPlaces(2),
                        ),
                  vatRate: Number(buy?.kdvOrani ?? 0),
                  currency: buy?.paraBirimi ?? 'TRY',
                },
                // Girilmemiş fiyat 0 değil boştur ("—").
                net: excluding === null ? null : Number(excluding),
                gross:
                  excluding === null
                    ? null
                    : Number(
                        new Prisma.Decimal(excluding)
                          .mul(
                            new Prisma.Decimal(1).plus(
                              (sale?.kdvOrani ?? new Prisma.Decimal(0)).div(100),
                            ),
                          )
                          .toDecimalPlaces(2),
                      ),
                vatRate: Number(sale?.kdvOrani ?? 0),
                currency: sale?.paraBirimi ?? 'TRY',
              };
            }),
          };
        });
        const metadata =
          query.secenekler === '1'
            ? {
                priceLists: priceLists.map((list) => ({
                  id: String(list.kimlik),
                  name: list.secenekAdi,
                })),
                filterOptions: {
                  categories: (
                    await tx.kategori.findMany({
                      where: { kullaniciId: Number(userId) },
                      orderBy: [{ ad: 'asc' }, { id: 'asc' }],
                      select: { id: true, ad: true, ustId: true, etkin: true },
                    })
                  ).map((c) => ({
                    id: String(c.id),
                    name: c.ad,
                    parentId: c.ustId == null ? null : String(c.ustId),
                    active: c.etkin,
                  })),
                  brands: (
                    await tx.marka.findMany({
                      where: { kullaniciKimligi: Number(userId) },
                      orderBy: [{ markaAdi: 'asc' }, { kimlik: 'asc' }],
                      select: { kimlik: true, markaAdi: true },
                    })
                  ).map((b) => ({ id: String(b.kimlik), name: b.markaAdi })),
                },
              }
            : {};
        return { items, total, page, pageSize: query.boyut, ...metadata };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async selectIds(userId: string, query: StockListQuery) {
    return this.db.$transaction(
      async (tx) => {
        const first = await tx.stokSecenegi.findFirst({
          where: { kullaniciKimligi: Number(userId), listeTuru: 'priceLists', etkin: true },
          orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
        });
        const where = stockListWhere(Number(userId), query, first?.kimlik);
        const rows = await tx.$queryRaw<{ id: number }[]>(
          Prisma.sql`SELECT k.id FROM urunler k WHERE ${where} ORDER BY k.olusturma_zamani DESC, k.id DESC LIMIT 1001`,
        );
        if (rows.length > 1000)
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Tek seferde en fazla 1000 ürün seçilebilir. Süzgeçleri daraltın.',
          );
        return { ids: rows.map((row) => row.id), total: rows.length };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async bulk(userId: string, input: StockBulkInput) {
    return retryWrite(() =>
      this.db.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${Number(userId)} FOR UPDATE`,
        );
        const where = { kullaniciKimligi: Number(userId), kimlik: { in: input.ids } };
        if ((await tx.stokKarti.count({ where })) !== input.ids.length)
          throw new HttpError(
            404,
            'NOT_FOUND',
            'Seçilen ürünlerden biri bulunamadı. İşlem yapılmadı.',
          );
        if (input.islem === 'sil') {
          await tx.stokKarti.deleteMany({ where });
        } else if (input.islem === 'firsat_ekle' || input.islem === 'firsat_kaldir') {
          if (
            !(await tx.firsat.count({
              where: { id: input.firsatId, kullaniciId: Number(userId) },
            }))
          )
            throw new HttpError(404, 'NOT_FOUND', 'Fırsat bulunamadı.');
          if (input.islem === 'firsat_ekle')
            await tx.stokFirsati.createMany({
              data: input.ids.map((stokKartiId) => ({ stokKartiId, firsatId: input.firsatId })),
              skipDuplicates: true,
            });
          else
            await tx.stokFirsati.deleteMany({
              where: { stokKartiId: { in: input.ids }, firsatId: input.firsatId },
            });
        } else if (input.islem === 'kategori_ekle' || input.islem === 'kategori_kaldir') {
          if (
            !(await tx.kategori.count({
              where: { id: input.kategoriId, kullaniciId: Number(userId) },
            }))
          )
            throw new HttpError(404, 'NOT_FOUND', 'Kategori bulunamadı.');
          if (input.islem === 'kategori_ekle')
            await tx.stokKartiKategori.createMany({
              data: input.ids.map((stokKartiId) => ({
                stokKartiId,
                kategoriId: input.kategoriId,
              })),
              skipDuplicates: true,
            });
          else
            await tx.stokKartiKategori.deleteMany({
              where: { stokKartiId: { in: input.ids }, kategoriId: input.kategoriId },
            });
        } else if (input.islem === 'marka_ata') {
          if (
            input.markaId !== null &&
            !(await tx.marka.count({
              where: { kimlik: input.markaId, kullaniciKimligi: Number(userId) },
            }))
          )
            throw new HttpError(404, 'NOT_FOUND', 'Marka bulunamadı.');
          await tx.stokKarti.updateMany({ where, data: { markaKimligi: input.markaId } });
        } else if (input.islem === 'fiyat_guncelle') {
          return bulkPrice(tx, Number(userId), input);
        } else if (input.islem === 'stok_ac') {
          await tx.stokKarti.updateMany({
            where: { ...where, envanterTakibi: 'yok' },
            data: { envanterTakibi: 'normal' },
          });
        } else if (input.islem === 'stok_kapat') {
          await tx.stokKarti.updateMany({ where, data: { envanterTakibi: 'yok' } });
        } else {
          await tx.stokKarti.updateMany({ where, data: { satisAcik: input.islem === 'satis_ac' } });
        }
        return { affected: input.ids.length };
      }),
    );
  }
}
