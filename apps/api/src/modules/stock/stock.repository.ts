import { createHash } from 'node:crypto';
import {
  DEFAULT_STOCK_LOOKUPS,
  type CreateStockInput,
  type OptionListKey,
  type PriceBlockData,
  type SelectOption,
  type StockLookups,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { Marka, StokFiyati, StokSecenegi } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';

export interface StockRepository {
  getLookups(userId: string): Promise<StockLookups>;
  addOption(userId: string, list: OptionListKey, label: string): Promise<SelectOption>;
  removeOption(userId: string, list: OptionListKey, value: string): Promise<void>;
  create(userId: string, input: CreateStockInput): Promise<{ id: string }>;
  get(userId: string, id: string): Promise<unknown>;
}

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const labelHash = (label: string) => hash(label.normalize('NFC').trim().toLocaleLowerCase('tr-TR'));
const nullable = (value: string) => (value === '' ? null : value);
const decimal = (value: string) => (value === '' ? null : new Prisma.Decimal(value));

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

// Prisma adlari Turkce; mevcut API sozlesmesi bu sinirda korunur.
function optionDto(row: StokSecenegi) {
  return {
    id: String(row.kimlik),
    userId: String(row.kullaniciKimligi),
    listKey: row.listeTuru,
    value: row.secenekKodu,
    label: row.secenekAdi,
    labelHash: row.adHash,
    removable: row.silinebilir,
    active: row.etkin,
    position: row.sira,
    createdAt: row.olusturmaZamani,
  };
}

function brandOptionDto(row: Marka) {
  return {
    id: String(row.kimlik),
    userId: String(row.kullaniciKimligi),
    listKey: 'brands',
    value: String(row.kimlik),
    label: row.markaAdi,
    labelHash: row.adHash,
    removable: true,
    active: row.etkin,
    position: row.sira,
    createdAt: row.olusturmaZamani,
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
      await tx.$queryRaw(
        Prisma.sql`SELECT kimlik FROM kullanicilar WHERE kimlik = ${userId} FOR UPDATE`,
      );

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
      await tx.$queryRaw(
        Prisma.sql`SELECT kimlik FROM kullanicilar WHERE kimlik = ${userId} FOR UPDATE`,
      );

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

  async create(userId: string, input: CreateStockInput) {
    await this.ensureDefaults(userId);
    const requestHash = hash(JSON.stringify(input.draft));
    const existing = await this.db.stokKarti.findUnique({
      where: {
        kullaniciKimligi_kayitIstegiKimligi: {
          kullaniciKimligi: Number(userId),
          kayitIstegiKimligi: input.requestId,
        },
      },
    });
    const replay = (row: { kimlik: number; kayitIstegiHash: string }) => {
      if (row.kayitIstegiHash !== requestHash)
        throw new HttpError(
          409,
          'CONFLICT',
          'Bu kayıt isteği farklı bilgilerle kullanılmış. Yeni kayıt başlatın.',
        );
      return { id: String(row.kimlik) };
    };
    if (existing) return replay(existing);
    try {
      return await retryWrite(() =>
        this.db.$transaction(
          async (tx) => {
            // Aynı kullanıcının kayıtlarını sıraya alır: barkod kontrolü ile
            // kayıt arasında başka istek araya giremez. Kullanıcı oturumdan belirlenir.
            await tx.$queryRaw(
              Prisma.sql`SELECT kimlik FROM kullanicilar WHERE kimlik = ${userId} FOR UPDATE`,
            );

            const retried = await tx.stokKarti.findUnique({
              where: {
                kullaniciKimligi_kayitIstegiKimligi: {
                  kullaniciKimligi: Number(userId),
                  kayitIstegiKimligi: input.requestId,
                },
              },
            });
            if (retried) return replay(retried);
            const options = await tx.stokSecenegi.findMany({
              where: { kullaniciKimligi: Number(userId), etkin: true },
            });
            const optionId = (
              listKey: keyof StockLookups,
              value: string,
              optional = false,
            ): number | null => {
              if (optional && !value) return null;
              const found = options.find(
                (row) => row.listeTuru === listKey && row.secenekKodu === value,
              );
              if (!found)
                throw new HttpError(
                  400,
                  'VALIDATION_ERROR',
                  'Seçilen seçenek artık kullanılamıyor. Listeyi yenileyip tekrar seçin.',
                );
              return found.kimlik;
            };
            const d = input.draft;
            optionId('stockTypes', d.stockType);
            optionId('stockKinds', d.stockKind);
            const brand =
              d.brand && /^[1-9][0-9]{0,9}$/.test(d.brand) && Number(d.brand) <= 2147483647
                ? await tx.marka.findFirst({
                    where: {
                      kullaniciKimligi: Number(userId),
                      kimlik: Number(d.brand),
                      etkin: true,
                    },
                    select: { kimlik: true },
                  })
                : null;
            if (d.brand && !brand)
              throw new HttpError(
                400,
                'VALIDATION_ERROR',
                'Seçilen marka artık kullanılamıyor. Listeyi yenileyip tekrar seçin.',
              );
            optionId('vatDepartments', d.vatDepartment, true);
            optionId('otherTaxes', d.otherTax, true);
            for (const [list, rows] of Object.entries(d.units)) {
              optionId('priceLists', list);
              for (const row of rows) optionId('units', row.unit);
            }
            if (
              d.code &&
              (await tx.stokKarti.findUnique({
                where: {
                  kullaniciKimligi_stokKodu: { kullaniciKimligi: Number(userId), stokKodu: d.code },
                },
                select: { kimlik: true },
              }))
            ) {
              throw new HttpError(
                409,
                'CONFLICT',
                'Bu stok koduyla bir kart zaten var. Farklı bir stok kodu girin.',
              );
            }
            const barcodes = [
              ...new Set(
                Object.values(d.units).flatMap((rows) =>
                  rows.flatMap((row) => row.barcodes.map((barcode) => barcode.code)),
                ),
              ),
            ];
            if (
              barcodes.length > 0 &&
              (await tx.stokBarkodu.findFirst({
                where: {
                  barkod: { in: barcodes },
                  stokBirimi: { fiyatListesi: { stokKarti: { kullaniciKimligi: Number(userId) } } },
                },
                select: { kimlik: true },
              }))
            ) {
              throw new HttpError(
                409,
                'CONFLICT',
                'Bu barkod başka bir stok kartında kullanılıyor. Barkodları kontrol edin.',
              );
            }
            // Görünmeyen takip türünün eski değerleri yanlışlıkla kaydedilmez.
            const normal = d.inventoryTracking === 'normal';
            const serial = d.inventoryTracking === 'seri';
            const lot = d.inventoryTracking === 'lot';
            const expiry = d.inventoryTracking === 'omur';
            const saved = await tx.stokKarti.create({
              select: { kimlik: true },
              data: {
                kullaniciKimligi: Number(userId),
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
                fiyatListeleri: {
                  create: Object.entries(d.units).map(([key, rows], position) => ({
                    fiyatListesiKimligi: optionId('priceLists', key)!,
                    sira: position,
                    birimler: {
                      create: rows.map((row, rowPosition) => ({
                        birimKimligi: optionId('units', row.unit)!,
                        sira: rowPosition,
                        carpan: new Prisma.Decimal(row.multiplier),
                        anaBirim: row.isMain,
                        varsayilanBirim: row.isDefault,
                        agirlik: decimal(row.weight),
                        agirlikBirimi: row.weightUnit,
                        hacimDesi: decimal(row.volume),
                        aciklama: nullable(row.note),
                        fiyatlar: {
                          create: [priceData('alis', row.purchase), priceData('satis', row.sale)],
                        },
                        barkodlar: {
                          create: row.barcodes.map(({ type, code }) => ({
                            barkodTuru: type,
                            barkod: code,
                          })),
                        },
                      })),
                    },
                  })),
                },
              },
            });
            return { id: String(saved.kimlik) };
          },
          { timeout: 15000 },
        ),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const row = await this.db.stokKarti.findUnique({
          where: {
            kullaniciKimligi_kayitIstegiKimligi: {
              kullaniciKimligi: Number(userId),
              kayitIstegiKimligi: input.requestId,
            },
          },
        });
        if (row) return replay(row);
        throw new HttpError(
          409,
          'CONFLICT',
          'Bu stok koduyla bir kart zaten var. Farklı bir stok kodu girin.',
        );
      }
      throw error;
    }
  }

  async get(userId: string, id: string) {
    const card = await this.db.stokKarti.findFirst({
      where: { kimlik: Number(id), kullaniciKimligi: Number(userId) },
      include: {
        stokTipi: true,
        stokNevi: true,
        marka: true,
        kdvDepartmani: true,
        digerVergi: true,
        fiyatListeleri: {
          orderBy: { sira: 'asc' },
          include: {
            secenek: true,
            birimler: {
              orderBy: { sira: 'asc' },
              include: {
                secenek: true,
                barkodlar: true,
                fiyatlar: { include: { ekFiyatlar: { orderBy: { sira: 'asc' } } } },
              },
            },
          },
        },
      },
    });
    if (!card) throw new HttpError(404, 'NOT_FOUND', 'Stok kartı bulunamadı.');
    return {
      id: String(card.kimlik),
      userId: String(card.kullaniciKimligi),
      requestId: card.kayitIstegiKimligi,
      requestHash: card.kayitIstegiHash,
      code: card.stokKodu,
      name: card.stokAdi,
      stockTypeId: String(card.stokTipiKimligi),
      stockKindId: String(card.stokNeviKimligi),
      brandId: card.markaKimligi === null ? null : String(card.markaKimligi),
      vatDepartmentId:
        card.kdvDepartmaniKimligi === null ? null : String(card.kdvDepartmaniKimligi),
      otherTaxId: card.digerVergiKimligi === null ? null : String(card.digerVergiKimligi),
      inventoryTracking: card.envanterTakibi,
      lowerLimit: card.altLimit,
      upperLimit: card.ustLimit,
      serialRequired: card.seriNoZorunlu,
      serialPrefix: card.seriNoOneki,
      lotRequired: card.lotZorunlu,
      expiryTracking: card.sktTakibi,
      lotPrefix: card.lotOneki,
      expiryRequired: card.sktZorunlu,
      shelfLifeDays: card.rafOmruGun,
      riskDays: card.riskSuresiGun,
      gtip: card.gtipKodu,
      origin: card.mensei,
      createdAt: card.olusturmaZamani,
      updatedAt: card.guncellemeZamani,
      stockType: optionDto(card.stokTipi),
      stockKind: optionDto(card.stokNevi),
      brand: card.marka === null ? null : brandOptionDto(card.marka),
      vatDepartment: card.kdvDepartmani === null ? null : optionDto(card.kdvDepartmani),
      otherTax: card.digerVergi === null ? null : optionDto(card.digerVergi),
      priceLists: card.fiyatListeleri.map((list) => ({
        id: String(list.kimlik),
        cardId: String(list.stokKartiKimligi),
        optionId: String(list.fiyatListesiKimligi),
        position: list.sira,
        option: optionDto(list.secenek),
        units: list.birimler.map((unit) => ({
          id: String(unit.kimlik),
          listId: String(unit.stokFiyatListesiKimligi),
          optionId: String(unit.birimKimligi),
          position: unit.sira,
          multiplier: unit.carpan,
          isMain: unit.anaBirim,
          isDefault: unit.varsayilanBirim,
          weight: unit.agirlik,
          weightUnit: unit.agirlikBirimi,
          volume: unit.hacimDesi,
          note: unit.aciklama,
          option: optionDto(unit.secenek),
          prices: unit.fiyatlar.map((price) => ({
            id: String(price.kimlik),
            unitId: String(price.stokBirimiKimligi),
            side: price.fiyatYonu,
            amount: price.girilenFiyat,
            currency: price.paraBirimi,
            discount: price.iskontoOrani,
            vatRate: price.kdvOrani,
            vatIncluded: price.kdvDahilGirildi,
            ...calculatedPrices(price),
            extras: price.ekFiyatlar.map((extra) => ({
              id: String(extra.kimlik),
              priceId: String(extra.stokFiyatiKimligi),
              position: extra.sira,
              note: extra.aciklama,
              amount: extra.tutar,
              discount: extra.iskontoOrani,
              currency: extra.paraBirimi,
            })),
          })),
          barcodes: unit.barkodlar.map((price) => ({
            id: String(price.kimlik),
            unitId: String(price.stokBirimiKimligi),
            type: price.barkodTuru,
            code: price.barkod,
          })),
        })),
      })),
    };
  }
}
