import type { CustomHolidayDraftInput, CustomHolidayDto } from '@gt/shared';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

/** DATE sütunları UTC gece yarısı döner; ekrana YYYY-AA-GG olarak verilir. */
const day = (value: Date) => value.toISOString().slice(0, 10);
const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Tanımlamalar › Resmi Tatil Günleri: işletmenin elle eklediği özel tatiller. */
export class HolidayRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Yıl ile kesişen özel tatiller (önceki yılda başlayıp bu yıla taşanlar dahil). */
  async list(businessId: number, year: number): Promise<CustomHolidayDto[]> {
    const rows = await this.db.ozelTatil.findMany({
      where: {
        isletmeId: businessId,
        baslangic: { lte: at(`${year}-12-31`) },
        bitis: { gte: at(`${year}-01-01`) },
      },
      orderBy: [{ baslangic: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      name: row.ad,
      start: day(row.baslangic),
      end: day(row.bitis),
    }));
  }

  async save(businessId: number, input: CustomHolidayDraftInput, id?: number) {
    const data = { ad: input.name, baslangic: at(input.start), bitis: at(input.end) };
    let savedId: number;
    if (id) {
      const row = await this.db.ozelTatil.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tatil bulunamadı.');
      await this.db.ozelTatil.update({ where: { id }, data });
      savedId = id;
    } else {
      const created = await this.db.ozelTatil.create({
        data: { ...data, isletmeId: businessId },
      });
      savedId = created.id;
    }
    return {
      id: String(savedId),
      name: data.ad,
      start: day(data.baslangic),
      end: day(data.bitis),
    };
  }

  async remove(businessId: number, id: number) {
    const row = await this.db.ozelTatil.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Tatil bulunamadı.');
    await this.db.ozelTatil.delete({ where: { id } });
  }
}
