import type { TaxOfficeDto, TaxOfficeDraftInput, TaxTypeDto, TaxTypeDraftInput } from '@gt/shared';
import { BUILTIN_TAX_OFFICE } from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new HttpError(409, 'CONFLICT', 'Bu ad zaten kullanılıyor.');
  throw error;
}

function mapType(row: {
  id: number;
  ad: string;
  kisaAd: string;
  oranlar: { oran: Prisma.Decimal }[];
}): TaxTypeDto {
  return {
    id: String(row.id),
    name: row.ad,
    shortName: row.kisaAd,
    rates: row.oranlar.map((rate) => Number(rate.oran)).sort((a, b) => b - a),
  };
}

/** Vergiler: tür + oranlar ve vergi daireleri; tüm kayıtlar işletme kapsamlıdır. */
export class TaxRepository {
  constructor(private db: PrismaClient) {}

  private async type(businessId: number, id: number) {
    const row = await this.db.vergiTuru.findFirst({
      where: { id, isletmeId: businessId },
      include: { oranlar: { orderBy: [{ sira: 'asc' }, { oran: 'desc' }] } },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Vergi türü bulunamadı.');
    return row;
  }

  async types(businessId: number): Promise<TaxTypeDto[]> {
    const rows = await this.db.vergiTuru.findMany({
      where: { isletmeId: businessId },
      include: { oranlar: { orderBy: [{ sira: 'asc' }, { oran: 'desc' }] } },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapType);
  }

  async saveType(businessId: number, input: TaxTypeDraftInput, id?: number) {
    if (id) {
      await this.type(businessId, id);
      try {
        await this.db.vergiTuru.update({
          where: { id },
          data: { ad: input.name, kisaAd: input.shortName },
        });
      } catch (error) {
        conflict(error);
      }
      return mapType(await this.type(businessId, id));
    }
    const last = await this.db.vergiTuru.aggregate({
      where: { isletmeId: businessId },
      _max: { sira: true },
    });
    try {
      const created = await this.db.vergiTuru.create({
        data: {
          isletmeId: businessId,
          ad: input.name,
          kisaAd: input.shortName,
          sira: (last._max.sira ?? 0) + 1,
        },
      });
      return mapType(await this.type(businessId, created.id));
    } catch (error) {
      conflict(error);
    }
  }

  async removeType(businessId: number, id: number) {
    await this.type(businessId, id);
    await this.db.vergiTuru.delete({ where: { id } });
  }

  async addRate(businessId: number, id: number, rate: number) {
    const row = await this.type(businessId, id);
    if (row.oranlar.some((item) => Number(item.oran) === rate))
      throw new HttpError(409, 'CONFLICT', 'Bu oran zaten ekli.');
    const last = await this.db.vergiOrani.aggregate({
      where: { turId: id },
      _max: { sira: true },
    });
    await this.db.vergiOrani.create({
      data: {
        turId: id,
        oran: new Prisma.Decimal(rate.toFixed(2)),
        sira: (last._max.sira ?? 0) + 1,
      },
    });
    return mapType(await this.type(businessId, id));
  }

  async removeRate(businessId: number, id: number, rate: number) {
    await this.type(businessId, id);
    await this.db.vergiOrani.deleteMany({
      where: { turId: id, oran: new Prisma.Decimal(rate.toFixed(2)) },
    });
    return mapType(await this.type(businessId, id));
  }

  private async ensureOffice(businessId: number) {
    const builtin = await this.db.vergiDairesi.findFirst({
      where: { isletmeId: businessId, yerlesik: true },
    });
    if (builtin) return;
    await this.db.vergiDairesi
      .create({
        data: { isletmeId: businessId, ad: BUILTIN_TAX_OFFICE, yerlesik: true, sira: 0 },
      })
      .catch(() => undefined);
  }

  async offices(businessId: number): Promise<TaxOfficeDto[]> {
    await this.ensureOffice(businessId);
    const rows = await this.db.vergiDairesi.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
    });
    return rows.map((row) => ({ id: String(row.id), name: row.ad, builtin: row.yerlesik }));
  }

  async saveOffice(businessId: number, input: TaxOfficeDraftInput, id?: number) {
    if (id) {
      const row = await this.db.vergiDairesi.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Vergi dairesi bulunamadı.');
      if (row.yerlesik)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Sistem kaydı değiştirilemez.');
      try {
        const updated = await this.db.vergiDairesi.update({
          where: { id },
          data: { ad: input.name },
        });
        return { id: String(updated.id), name: updated.ad, builtin: updated.yerlesik };
      } catch (error) {
        conflict(error);
      }
    }
    await this.ensureOffice(businessId);
    const last = await this.db.vergiDairesi.aggregate({
      where: { isletmeId: businessId },
      _max: { sira: true },
    });
    try {
      const created = await this.db.vergiDairesi.create({
        data: {
          isletmeId: businessId,
          ad: input.name,
          yerlesik: false,
          sira: (last._max.sira ?? 0) + 1,
        },
      });
      return { id: String(created.id), name: created.ad, builtin: created.yerlesik };
    } catch (error) {
      conflict(error);
    }
  }

  async removeOffice(businessId: number, id: number) {
    const row = await this.db.vergiDairesi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Vergi dairesi bulunamadı.');
    if (row.yerlesik) throw new HttpError(400, 'VALIDATION_ERROR', 'Sistem kaydı silinemez.');
    await this.db.vergiDairesi.delete({ where: { id } });
  }
}
