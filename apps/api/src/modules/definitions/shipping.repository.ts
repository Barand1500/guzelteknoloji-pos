import type {
  CarrierDraftInput,
  CarrierDto,
  DefinitionDto,
  DefinitionDraftInput,
  ListKeyInput,
  LocationDto,
  PriceTableInput,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

const MAX_LEVEL = 5;

function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new HttpError(409, 'CONFLICT', 'Bu ad zaten kullanılıyor.');
  throw error;
}

function priceList(
  rows: {
    tur: string;
    sira: number;
    ustSinir: number | null;
    fiyat: Prisma.Decimal;
    birimBasi: boolean;
  }[],
  type: 'desi' | 'weight',
) {
  const items = rows
    .filter((row) => row.tur === type)
    .sort((a, b) => a.sira - b.sira)
    .map((row) => ({ to: row.ustSinir, price: Number(row.fiyat), perUnit: row.birimBasi }));
  // Hiç basamak yoksa boş dizi döner: "tanımsız" ile "açıkça 0 TL" böylece ayrılır.
  return items;
}

/** Tanımlamalar › Kargo ve Nakliye verisi; tüm sorgular işletme kapsamlıdır. */
export class ShippingRepository {
  constructor(private db: PrismaClient) {}

  async carriers(businessId: number): Promise<CarrierDto[]> {
    const rows = await this.db.kargoFirmasi.findMany({
      where: { isletmeId: businessId },
      include: { fiyatlar: true },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      name: row.ad,
      shortName: row.kisaAd,
      apiUrl: row.apiUrl,
      prices: {
        vat: row.kdvOrani,
        desi: priceList(row.fiyatlar, 'desi'),
        weight: priceList(row.fiyatlar, 'weight'),
      },
    }));
  }

  async saveCarrier(businessId: number, input: CarrierDraftInput, id?: number) {
    if (id) {
      const row = await this.db.kargoFirmasi.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Kargo firması bulunamadı.');
      try {
        await this.db.kargoFirmasi.update({
          where: { id },
          data: { ad: input.name, kisaAd: input.shortName, apiUrl: input.apiUrl },
        });
      } catch (error) {
        conflict(error);
      }
    } else {
      const last = await this.db.kargoFirmasi.aggregate({
        where: { isletmeId: businessId },
        _max: { sira: true },
      });
      try {
        await this.db.kargoFirmasi.create({
          data: {
            isletmeId: businessId,
            ad: input.name,
            kisaAd: input.shortName,
            apiUrl: input.apiUrl,
            sira: (last._max.sira ?? 0) + 1,
          },
        });
      } catch (error) {
        conflict(error);
      }
    }
    const list = await this.carriers(businessId);
    const target = id ? list.find((item) => item.id === String(id)) : list[list.length - 1];
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'Kargo firması bulunamadı.');
    return target;
  }

  async removeCarrier(businessId: number, id: number) {
    const row = await this.db.kargoFirmasi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Kargo firması bulunamadı.');
    await this.db.kargoFirmasi.delete({ where: { id } });
  }

  async savePrices(businessId: number, id: number, table: PriceTableInput) {
    const row = await this.db.kargoFirmasi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Kargo firması bulunamadı.');
    const rows = (['desi', 'weight'] as const).flatMap((type) =>
      table[type].map((tier, index) => ({
        firmaId: id,
        tur: type,
        sira: index,
        ustSinir: tier.to,
        fiyat: new Prisma.Decimal(tier.price.toFixed(2)),
        birimBasi: tier.perUnit,
      })),
    );
    await this.db.$transaction([
      this.db.kargoFiyatBasamagi.deleteMany({ where: { firmaId: id } }),
      this.db.kargoFiyatBasamagi.createMany({ data: rows }),
      this.db.kargoFirmasi.update({ where: { id }, data: { kdvOrani: table.vat } }),
    ]);
  }

  async locations(businessId: number): Promise<LocationDto[]> {
    const rows = await this.db.kargoLokasyonu.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ seviye: 'asc' }, { sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      parentId: row.ustId === null ? null : String(row.ustId),
      name: row.ad,
      level: row.seviye,
    }));
  }

  async createLocation(businessId: number, parentId: number | null, name: string) {
    let level = 0;
    if (parentId !== null) {
      const parent = await this.db.kargoLokasyonu.findFirst({
        where: { id: parentId, isletmeId: businessId },
      });
      if (!parent) throw new HttpError(404, 'NOT_FOUND', 'Üst konum bulunamadı.');
      level = parent.seviye + 1;
      if (level > MAX_LEVEL)
        throw new HttpError(400, 'VALIDATION_ERROR', 'En fazla altı konum seviyesi eklenebilir.');
    }
    const last = await this.db.kargoLokasyonu.aggregate({
      where: { isletmeId: businessId, ustId: parentId },
      _max: { sira: true },
    });
    const created = await this.db.kargoLokasyonu.create({
      data: {
        isletmeId: businessId,
        ustId: parentId,
        ad: name,
        seviye: level,
        sira: (last._max.sira ?? 0) + 1,
      },
    });
    return {
      id: String(created.id),
      parentId: created.ustId === null ? null : String(created.ustId),
      name: created.ad,
      level: created.seviye,
    } satisfies LocationDto;
  }

  async renameLocation(businessId: number, id: number, name: string) {
    const row = await this.db.kargoLokasyonu.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Konum bulunamadı.');
    const updated = await this.db.kargoLokasyonu.update({ where: { id }, data: { ad: name } });
    return {
      id: String(updated.id),
      parentId: updated.ustId === null ? null : String(updated.ustId),
      name: updated.ad,
      level: updated.seviye,
    } satisfies LocationDto;
  }

  async removeLocation(businessId: number, id: number) {
    const row = await this.db.kargoLokasyonu.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Konum bulunamadı.');
    await this.db.kargoLokasyonu.delete({ where: { id } });
  }

  async definitions(businessId: number, list: ListKeyInput): Promise<DefinitionDto[]> {
    const rows = await this.db.kargoTanimi.findMany({
      where: { isletmeId: businessId, liste: list },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      title: row.baslik,
      short: row.kisaAd,
      text: row.metin,
    }));
  }

  async saveDefinition(
    businessId: number,
    list: ListKeyInput,
    input: DefinitionDraftInput,
    id?: number,
  ) {
    if (id) {
      const row = await this.db.kargoTanimi.findFirst({
        where: { id, isletmeId: businessId, liste: list },
      });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tanım bulunamadı.');
      try {
        await this.db.kargoTanimi.update({
          where: { id },
          data: { baslik: input.title, kisaAd: input.short, metin: input.text },
        });
      } catch (error) {
        conflict(error);
      }
    } else {
      const last = await this.db.kargoTanimi.aggregate({
        where: { isletmeId: businessId, liste: list },
        _max: { sira: true },
      });
      try {
        await this.db.kargoTanimi.create({
          data: {
            isletmeId: businessId,
            liste: list,
            baslik: input.title,
            kisaAd: input.short,
            metin: input.text,
            sira: (last._max.sira ?? 0) + 1,
          },
        });
      } catch (error) {
        conflict(error);
      }
    }
    const items = await this.definitions(businessId, list);
    const target = id ? items.find((item) => item.id === String(id)) : items[items.length - 1];
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'Tanım bulunamadı.');
    return target;
  }

  async removeDefinition(businessId: number, list: ListKeyInput, id: number) {
    const row = await this.db.kargoTanimi.findFirst({
      where: { id, isletmeId: businessId, liste: list },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tanım bulunamadı.');
    await this.db.kargoTanimi.delete({ where: { id } });
  }
}
