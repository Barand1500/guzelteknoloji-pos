import { createHash } from 'node:crypto';
import {
  DEFAULT_STOCK_LOOKUPS,
  type NameDraftInput,
  type NameItemDto,
  type NameList,
  type PriceListDto,
  type PriceListDraftInput,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

const hash = (value: string) =>
  createHash('sha256')
    .update(value.normalize('NFC').trim().toLocaleLowerCase('tr-TR'))
    .digest('hex');

const OPTION_LIST: Record<Exclude<NameList, 'cari-tipleri'>, 'stockTypes' | 'units'> = {
  'stok-tipleri': 'stockTypes',
  'olcu-birimleri': 'units',
};

const isoDate = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

function parseDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new HttpError(409, 'CONFLICT', 'Bu ad zaten kullanılıyor.');
  throw error;
}

/**
 * Cari ve Stok Tanımları.
 * - Stok tipleri, ölçü birimleri ve fiyat listeleri mevcut `stok_secenekleri` tablosunu kullanır;
 *   böylece stok kartı ekranındaki seçeneklerle aynı kaynaktır.
 * - Cari tipleri ayrı tabloda tutulur (stok seçenekleriyle ilişkisi yoktur).
 */
export class StockDefRepository {
  constructor(private db: PrismaClient) {}

  private async ensureDefaults(ownerId: number) {
    const initialized = await this.db.stokSecenegi.findFirst({
      where: { kullaniciKimligi: ownerId, listeTuru: 'stockTypes', secenekKodu: 'basit' },
      select: { kimlik: true },
    });
    if (initialized) return;
    await this.db.stokSecenegi
      .createMany({
        skipDuplicates: true,
        data: (['stockTypes', 'units', 'priceLists'] as const).flatMap((list) =>
          DEFAULT_STOCK_LOOKUPS[list].map((option, position) => ({
            kullaniciKimligi: ownerId,
            listeTuru: list,
            secenekKodu: option.value,
            secenekAdi: option.label,
            adHash: hash(option.label),
            silinebilir: option.removable ?? false,
            sira: position,
          })),
        ),
      })
      .catch(() => undefined);
  }

  async names(businessId: number, ownerId: number, list: NameList): Promise<NameItemDto[]> {
    if (list === 'cari-tipleri') {
      const rows = await this.db.cariTipi.findMany({
        where: { isletmeId: businessId },
        orderBy: [{ sira: 'asc' }, { id: 'asc' }],
      });
      return rows.map((row) => ({ id: String(row.id), name: row.ad, shortName: '' }));
    }
    await this.ensureDefaults(ownerId);
    const rows = await this.db.stokSecenegi.findMany({
      where: { kullaniciKimligi: ownerId, listeTuru: OPTION_LIST[list], durum: true },
      orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.kimlik),
      name: row.secenekAdi,
      shortName: list === 'olcu-birimleri' ? row.secenekKodu.toLocaleUpperCase('tr') : '',
    }));
  }

  async saveName(
    businessId: number,
    ownerId: number,
    list: NameList,
    input: NameDraftInput,
    id?: number,
  ): Promise<NameItemDto> {
    if (list === 'cari-tipleri') {
      if (id) {
        const row = await this.db.cariTipi.findFirst({ where: { id, isletmeId: businessId } });
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Cari tipi bulunamadı.');
        try {
          const updated = await this.db.cariTipi.update({
            where: { id },
            data: { ad: input.name },
          });
          return { id: String(updated.id), name: updated.ad, shortName: '' };
        } catch (error) {
          conflict(error);
        }
      }
      const last = await this.db.cariTipi.aggregate({
        where: { isletmeId: businessId },
        _max: { sira: true },
      });
      try {
        const created = await this.db.cariTipi.create({
          data: { isletmeId: businessId, ad: input.name, sira: (last._max.sira ?? 0) + 1 },
        });
        return { id: String(created.id), name: created.ad, shortName: '' };
      } catch (error) {
        conflict(error);
      }
    }

    await this.ensureDefaults(ownerId);
    const listeTuru = OPTION_LIST[list];
    if (id) {
      const row = await this.db.stokSecenegi.findFirst({
        where: { kimlik: id, kullaniciKimligi: ownerId, listeTuru },
      });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tanım bulunamadı.');
      const code =
        list === 'olcu-birimleri'
          ? (input.shortName || input.name).toLocaleUpperCase('tr')
          : row.secenekKodu;
      try {
        const updated = await this.db.stokSecenegi.update({
          where: { kimlik: id },
          data: {
            secenekAdi: input.name,
            adHash: hash(input.name),
            secenekKodu: code,
          },
        });
        return {
          id: String(updated.kimlik),
          name: updated.secenekAdi,
          shortName: list === 'olcu-birimleri' ? updated.secenekKodu : '',
        };
      } catch (error) {
        conflict(error);
      }
    }
    const last = await this.db.stokSecenegi.aggregate({
      where: { kullaniciKimligi: ownerId, listeTuru },
      _max: { sira: true },
    });
    const code =
      list === 'olcu-birimleri' ? (input.shortName || input.name).toLocaleUpperCase('tr') : `ozel-${hash(input.name)}`;
    try {
      const created = await this.db.stokSecenegi.create({
        data: {
          kullaniciKimligi: ownerId,
          listeTuru,
          secenekKodu: code,
          secenekAdi: input.name,
          adHash: hash(input.name),
          silinebilir: true,
          sira: (last._max.sira ?? 0) + 1,
        },
      });
      return {
        id: String(created.kimlik),
        name: created.secenekAdi,
        shortName: list === 'olcu-birimleri' ? created.secenekKodu : '',
      };
    } catch (error) {
      conflict(error);
    }
  }

  async removeName(businessId: number, ownerId: number, list: NameList, id: number) {
    if (list === 'cari-tipleri') {
      const row = await this.db.cariTipi.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Cari tipi bulunamadı.');
      await this.db.cariTipi.delete({ where: { id } });
      return;
    }
    const listeTuru = OPTION_LIST[list];
    const row = await this.db.stokSecenegi.findFirst({
      where: { kimlik: id, kullaniciKimligi: ownerId, listeTuru },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tanım bulunamadı.');
    if (listeTuru === 'units') {
      const used = await this.db.stokBirimi.count({ where: { birimKimligi: id } });
      if (used > 0)
        throw new HttpError(409, 'CONFLICT', 'Bu birim ürünlerde kullanılıyor; silinemez.');
    } else {
      const used = await this.db.stokKarti.count({ where: { stokTipiKimligi: id } });
      if (used > 0)
        throw new HttpError(409, 'CONFLICT', 'Bu ürün tipi ürünlerde kullanılıyor; silinemez.');
    }
    await this.db.stokSecenegi.delete({ where: { kimlik: id } });
  }

  private async priceOptions(businessId: number, ownerId: number) {
    await this.ensureDefaults(ownerId);
    const rows = await this.db.stokSecenegi.findMany({
      where: { kullaniciKimligi: ownerId, listeTuru: 'priceLists', durum: true },
      orderBy: [{ sira: 'asc' }, { kimlik: 'asc' }],
    });
    if (rows.length === 0) return [] as typeof rows;
    await this.db.fiyatListesiAyari.createMany({
      skipDuplicates: true,
      data: rows.map((row) => ({ isletmeId: businessId, secenekId: row.kimlik })),
    }).catch(() => undefined);
    return rows;
  }

  async priceLists(businessId: number, ownerId: number): Promise<PriceListDto[]> {
    const rows = await this.priceOptions(businessId, ownerId);
    if (rows.length === 0) return [];
    const settings = await this.db.fiyatListesiAyari.findMany({
      where: { isletmeId: businessId, secenekId: { in: rows.map((row) => row.kimlik) } },
    });
    const byId = new Map(settings.map((row) => [row.secenekId, row]));
    if (!settings.some((row) => row.varsayilan)) {
      const preferred = rows.find((row) => row.secenekKodu === 'fiyat') ?? rows[0]!;
      await this.setDefaultPriceList(businessId, ownerId, preferred.kimlik);
      const created = byId.get(preferred.kimlik);
      if (created) created.varsayilan = true;
    }
    return rows.map((row) => {
      const setting = byId.get(row.kimlik);
      return {
        id: String(row.kimlik),
        name: row.secenekAdi,
        kind: setting?.tur === 'special' ? 'special' : 'general',
        start: isoDate(setting?.baslangic ?? null),
        end: isoDate(setting?.bitis ?? null),
        isDefault: setting?.varsayilan ?? false,
      };
    });
  }

  async savePriceList(
    businessId: number,
    ownerId: number,
    input: PriceListDraftInput,
    id?: number,
  ): Promise<PriceListDto> {
    await this.priceOptions(businessId, ownerId);
    let optionId = id;
    if (id) {
      const row = await this.db.stokSecenegi.findFirst({
        where: { kimlik: id, kullaniciKimligi: ownerId, listeTuru: 'priceLists' },
      });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Fiyat listesi bulunamadı.');
      try {
        await this.db.stokSecenegi.update({
          where: { kimlik: id },
          data: { secenekAdi: input.name, adHash: hash(input.name) },
        });
      } catch (error) {
        conflict(error);
      }
    } else {
      const last = await this.db.stokSecenegi.aggregate({
        where: { kullaniciKimligi: ownerId, listeTuru: 'priceLists' },
        _max: { sira: true },
      });
      try {
        const created = await this.db.stokSecenegi.create({
          data: {
            kullaniciKimligi: ownerId,
            listeTuru: 'priceLists',
            secenekKodu: `liste-${hash(input.name)}`,
            secenekAdi: input.name,
            adHash: hash(input.name),
            silinebilir: true,
            sira: (last._max.sira ?? 0) + 1,
          },
        });
        optionId = created.kimlik;
      } catch (error) {
        conflict(error);
      }
    }
    if (!optionId) throw new HttpError(500, 'INTERNAL_ERROR', 'Liste oluşturulamadı.');
    const special = input.kind === 'special';
    await this.db.fiyatListesiAyari.upsert({
      where: { secenekId: optionId },
      update: {
        tur: input.kind,
        baslangic: special ? parseDate(input.start) : null,
        bitis: special ? parseDate(input.end) : null,
      },
      create: {
        isletmeId: businessId,
        secenekId: optionId,
        tur: input.kind,
        baslangic: special ? parseDate(input.start) : null,
        bitis: special ? parseDate(input.end) : null,
        varsayilan: false,
      },
    });
    const list = await this.priceLists(businessId, ownerId);
    const target = list.find((item) => item.id === String(optionId));
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'Fiyat listesi bulunamadı.');
    return target;
  }

  async removePriceList(businessId: number, ownerId: number, id: number) {
    const row = await this.db.stokSecenegi.findFirst({
      where: { kimlik: id, kullaniciKimligi: ownerId, listeTuru: 'priceLists' },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Fiyat listesi bulunamadı.');
    const setting = await this.db.fiyatListesiAyari.findFirst({
      where: { secenekId: id, isletmeId: businessId },
    });
    if (setting?.varsayilan)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Varsayılan fiyat listesi silinemez.');
    const used = await this.db.stokFiyati.count({ where: { fiyatListesiKimligi: id } });
    if (used > 0)
      throw new HttpError(409, 'CONFLICT', 'Bu liste ürün fiyatlarında kullanılıyor; silinemez.');
    await this.db.fiyatListesiAyari.deleteMany({ where: { secenekId: id } });
    await this.db.stokSecenegi.delete({ where: { kimlik: id } });
  }

  async setDefaultPriceList(businessId: number, ownerId: number, id: number) {
    const row = await this.db.stokSecenegi.findFirst({
      where: { kimlik: id, kullaniciKimligi: ownerId, listeTuru: 'priceLists' },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Fiyat listesi bulunamadı.');
    await this.db.$transaction([
      this.db.fiyatListesiAyari.updateMany({
        where: { isletmeId: businessId },
        data: { varsayilan: false },
      }),
      this.db.fiyatListesiAyari.upsert({
        where: { secenekId: id },
        update: { varsayilan: true },
        create: { isletmeId: businessId, secenekId: id, varsayilan: true },
      }),
    ]);
  }
}
