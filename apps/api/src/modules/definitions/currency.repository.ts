import type { CurrencyDto, CurrencyDraftInput, RateType } from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { tcmbRate } from './tcmb';

const BASE = { ad: 'Türk Lirası', kisaAd: 'TRY', sembol: '₺' } as const;

function toDto(row: {
  id: number;
  ad: string;
  kisaAd: string;
  sembol: string;
  anaMi: boolean;
  kurTipi: string;
  otomatik: boolean;
  kur: Prisma.Decimal;
  apiUrl: string;
  aktif: boolean;
}): CurrencyDto {
  return {
    id: String(row.id),
    name: row.ad,
    shortName: row.kisaAd,
    symbol: row.sembol,
    base: row.anaMi,
    rateType: row.kurTipi as RateType,
    auto: row.otomatik,
    rate: Number(row.kur),
    apiUrl: row.apiUrl,
    active: row.aktif,
  };
}

export class CurrencyRepository {
  constructor(private db: PrismaClient) {}

  /** Ana para birimi (₺) her işletmede tek satırdır; yoksa ilk okumada oluşturulur. */
  private async ensureBase(businessId: number) {
    const existing = await this.db.paraBirimi.findFirst({
      where: { isletmeId: businessId, anaMi: true },
    });
    if (existing) return;
    await this.db.paraBirimi
      .create({
        data: {
          isletmeId: businessId,
          ad: BASE.ad,
          kisaAd: BASE.kisaAd,
          sembol: BASE.sembol,
          anaMi: true,
          kurTipi: 'efektifSatis',
          otomatik: false,
          kur: 1,
          apiUrl: '',
          aktif: true,
          sira: 0,
        },
      })
      .catch(() => undefined);
  }

  async list(businessId: number) {
    await this.ensureBase(businessId);
    const rows = await this.db.paraBirimi.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ anaMi: 'desc' }, { sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toDto);
  }

  async save(businessId: number, input: CurrencyDraftInput, id?: number) {
    const shortName = input.shortName.toUpperCase();
    if (id) {
      const row = await this.db.paraBirimi.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Para birimi bulunamadı.');
      if (row.anaMi) {
        const updated = await this.db.paraBirimi.update({
          where: { id },
          data: { ad: input.name, sembol: input.symbol },
        });
        return toDto(updated);
      }
      const rate = input.auto ? await tcmbRate(shortName, input.rateType) : input.rate;
      if (!input.auto && !(rate > 0))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Kur 0’dan büyük olmalı.');
      const updated = await this.db.paraBirimi.update({
        where: { id },
        data: {
          ad: input.name,
          kisaAd: shortName,
          sembol: input.symbol,
          kurTipi: input.rateType,
          otomatik: input.auto,
          kur: new Prisma.Decimal(rate.toFixed(6)),
          apiUrl: input.auto ? input.apiUrl : '',
        },
      });
      return toDto(updated);
    }
    await this.ensureBase(businessId);
    const rate = input.auto ? await tcmbRate(shortName, input.rateType) : input.rate;
    if (!input.auto && !(rate > 0))
      throw new HttpError(400, 'VALIDATION_ERROR', 'Kur 0’dan büyük olmalı.');
    if (shortName === BASE.kisaAd)
      throw new HttpError(409, 'CONFLICT', 'Bu kısa ad zaten kullanılıyor.');
    const last = await this.db.paraBirimi.aggregate({
      where: { isletmeId: businessId },
      _max: { sira: true },
    });
    const created = await this.db.paraBirimi.create({
      data: {
        isletmeId: businessId,
        ad: input.name,
        kisaAd: shortName,
        sembol: input.symbol,
        anaMi: false,
        kurTipi: input.rateType,
        otomatik: input.auto,
        kur: new Prisma.Decimal(rate.toFixed(6)),
        apiUrl: input.auto ? input.apiUrl : '',
        aktif: true,
        sira: (last._max.sira ?? 0) + 1,
      },
    });
    return toDto(created);
  }

  async setActive(businessId: number, id: number, active: boolean) {
    const row = await this.db.paraBirimi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Para birimi bulunamadı.');
    if (row.anaMi && !active)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Ana para birimi pasife alınamaz.');
    await this.db.paraBirimi.update({ where: { id }, data: { aktif: active } });
  }

  async refresh(businessId: number, id: number) {
    const row = await this.db.paraBirimi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Para birimi bulunamadı.');
    if (row.anaMi) throw new HttpError(400, 'VALIDATION_ERROR', 'Ana para biriminin kuru 1’dir.');
    if (!row.otomatik)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Bu para birimi elle girilmiş; kuru güncellenemez.');
    const rate = await tcmbRate(row.kisaAd, row.kurTipi as RateType);
    const updated = await this.db.paraBirimi.update({
      where: { id },
      data: { kur: new Prisma.Decimal(rate.toFixed(6)) },
    });
    return toDto(updated);
  }

  async remove(businessId: number, id: number) {
    const row = await this.db.paraBirimi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Para birimi bulunamadı.');
    if (row.anaMi) throw new HttpError(400, 'VALIDATION_ERROR', 'Ana para birimi silinemez.');
    await this.db.paraBirimi.delete({ where: { id } });
  }

  preview(code: string, type: RateType) {
    return tcmbRate(code, type);
  }
}
