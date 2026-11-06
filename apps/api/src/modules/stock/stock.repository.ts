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
  create(userId: string, input: StockSaveInput): Promise<{ id: string }>;
  update(userId: string, id: string, input: StockSaveInput): Promise<{ id: string }>;
  get(userId: string, id: string): Promise<unknown>;
  getDraft(userId: string, id: string): Promise<unknown>;
  list(userId: string, query: StockListQuery): Promise<ProductListPage>;
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
      note: row.note,
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
    ekFiyatlar: {
      create: block.extras.map((extra, position) => ({
        sira: position,
        aciklama: nullable(extra.note),
        tutar: decimal(extra.amount),
        iskontoOrani: decimal(extra.discount),
        paraBirimi: extra.currency,
      })),
    },
  };
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
          .filter((key) => key !== 'brands')
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
                    include: { birimler: { include: { fiyatlar: true } } },
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
                    current.stokNeviKimligi,
                    current.kdvDepartmaniKimligi,
                    current.digerVergiKimligi,
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
            optionId('stockKinds', d.stockKind);
            optionId('vatDepartments', d.vatDepartment, true);
            optionId('otherTaxes', d.otherTax, true);
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
            const serial = d.inventoryTracking === 'seri';
            const lot = d.inventoryTracking === 'lot';
            const expiry = d.inventoryTracking === 'omur';
            const changes = {
              kayitIstegiKimligi: input.requestId,
              kayitIstegiHash: requestHash,
              stokKodu: nullable(d.code),
              stokAdi: nullable(d.name),
              stokTipiKimligi: optionId('stockTypes', d.stockType)!,
              stokNeviKimligi: optionId('stockKinds', d.stockKind)!,
              markaKimligi: brand?.kimlik ?? null,
              kdvDepartmaniKimligi: optionId('vatDepartments', d.vatDepartment, true),
              digerVergiKimligi: optionId('otherTaxes', d.otherTax, true),
              envanterTakibi: d.inventoryTracking,
              altLimit: normal ? decimal(d.lowerLimit) : null,
              ustLimit: normal ? decimal(d.upperLimit) : null,
              seriNoZorunlu: serial && d.serialRequired,
              seriNoOneki: serial ? nullable(d.serialPrefix) : null,
              lotZorunlu: lot && d.lotRequired,
              sktTakibi: lot && d.expiryTracking,
              lotOneki: lot ? nullable(d.lotPrefix) : null,
              sktZorunlu: expiry && d.expiryRequired,
              rafOmruGun: expiry && d.shelfLifeDays ? Number(d.shelfLifeDays) : null,
              riskSuresiGun: expiry && d.riskDays ? Number(d.riskDays) : null,
              gtipKodu: nullable(d.gtip),
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
                  aciklama: nullable(row.note),
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
        stokNevi: true,
        marka: true,
        kdvDepartmani: true,
        digerVergi: true,
        kategoriler: { include: { kategori: true }, orderBy: { kategoriId: 'asc' } },
        birimler: {
          orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
          include: {
            secenek: true,
            barkodlar: { orderBy: { kimlik: 'asc' } },
            fiyatlar: { include: { fiyatListesi: true, ekFiyatlar: { orderBy: { sira: 'asc' } } } },
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
              extras: (row?.ekFiyatlar ?? []).map((extra) => ({
                id: String(extra.kimlik),
                note: str(extra.aciklama),
                amount: str(extra.tutar),
                discount: str(extra.iskontoOrani),
                currency: extra.paraBirimi,
              })),
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
            note: str(unit.aciklama),
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
      vatDepartment: card.kdvDepartmani?.secenekKodu ?? '',
      stockKind: card.stokNevi.secenekKodu,
      inventoryTracking: card.envanterTakibi,
      lowerLimit: str(card.altLimit),
      upperLimit: str(card.ustLimit),
      serialRequired: card.seriNoZorunlu,
      serialPrefix: str(card.seriNoOneki),
      lotRequired: card.lotZorunlu,
      expiryTracking: card.sktTakibi,
      lotPrefix: str(card.lotOneki),
      expiryRequired: card.sktZorunlu,
      shelfLifeDays: str(card.rafOmruGun),
      riskDays: str(card.riskSuresiGun),
      gtip: str(card.gtipKodu),
      origin: str(card.mensei),
      otherTax: card.digerVergi?.secenekKodu ?? '',
      units,
    };
  }

  async list(userId: string, query: StockListQuery): Promise<ProductListPage> {
    const where: Prisma.StokKartiWhereInput = { kullaniciKimligi: Number(userId) };
    if (query.arama)
      where.OR = [
        { stokKodu: { contains: query.arama } },
        { stokAdi: { contains: query.arama } },
        { marka: { markaAdi: { contains: query.arama } } },
        { birimler: { some: { barkodlar: { some: { barkod: { contains: query.arama } } } } } },
      ];
    if (query.marka) where.markaKimligi = Number(query.marka);
    if (query.kimlik) where.kimlik = Number(query.kimlik);
    if (query.kategori) where.kategoriler = { some: { kategoriId: Number(query.kategori) } };
    if (query.stok === 'unlimited') where.envanterTakibi = 'yok';
    if (query.stok === 'in' || query.stok === 'out') {
      where.envanterTakibi = { not: 'yok' };
      where.stokMiktari = query.stok === 'in' ? { gt: 0 } : { lte: 0 };
    }
    if (query.satis === 'open' || query.satis === 'closed')
      where.satisAcik = query.satis === 'open';
    return this.db.$transaction(
      async (tx) => {
        const total = await tx.stokKarti.count({ where });
        const rows = await tx.stokKarti.findMany({
          where,
          orderBy: [{ olusturmaZamani: 'desc' }, { kimlik: 'desc' }],
          skip: (query.sayfa - 1) * query.boyut,
          take: query.boyut,
          include: {
            firsatlar: true,
            marka: true,
            stokTipi: true,
            kategoriler: { orderBy: { kategoriId: 'asc' }, include: { kategori: true } },
            birimler: {
              where: { anaBirim: true },
              take: 1,
              orderBy: { sira: 'asc' },
              include: {
                fiyatlar: { include: { fiyatListesi: true } },
              },
            },
          },
        });
        const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
        const items: ProductListItem[] = rows.map((card) => {
          const prices = card.birimler[0]?.fiyatlar ?? [];
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
            imageUrl: null,
            currency: symbols[first?.paraBirimi ?? 'TRY'] ?? first?.paraBirimi ?? '₺',
            vatRate: Number(first?.kdvOrani ?? 0),
            prices: [excludingVat(sales[0]), excludingVat(sales[1]), excludingVat(sales[2])],
            cost: excludingVat(purchase),
            costVatRate: Number(purchase?.kdvOrani ?? 0),
            costCurrency: purchase?.paraBirimi ?? 'TRY',
            stock: Number(card.stokMiktari),
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
          };
        });
        return { items, total, page: query.sayfa, pageSize: query.boyut };
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
