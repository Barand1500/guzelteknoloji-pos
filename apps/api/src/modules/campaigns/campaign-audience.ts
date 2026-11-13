import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';

const fold = (value: string) => value.trim().toLocaleLowerCase('tr');

export async function resolveCampaignAudience(
  db: PrismaClient,
  businessId: number,
  ownerId: number,
  values: { customerTypes: string[]; priceLists: string[] },
) {
  const [types, prices] = await Promise.all([
    values.customerTypes.length
      ? db.cariTipi.findMany({ where: { isletmeId: businessId }, select: { id: true, ad: true } })
      : [],
    values.priceLists.length
      ? db.stokSecenegi.findMany({
          where: { kullaniciKimligi: ownerId, listeTuru: 'priceLists', durum: true },
          select: { kimlik: true, secenekAdi: true },
        })
      : [],
  ]);
  function resolve(input: string[], choices: { id: string; name: string }[], label: string) {
    return [
      ...new Set(
        input.map((value) => {
          const choice =
            choices.find((row) => row.id === value) ??
            choices.find((row) => fold(row.name) === fold(value));
          if (!choice)
            throw new HttpError(
              400,
              'VALIDATION_ERROR',
              `Seçilen ${label} bu işletmede bulunamadı. Seçimi yenileyin.`,
            );
          return choice.id;
        }),
      ),
    ];
  }
  return {
    customerTypes: resolve(
      values.customerTypes,
      types.map((row) => ({ id: String(row.id), name: row.ad })),
      'cari tipi',
    ),
    priceLists: resolve(
      values.priceLists,
      prices.map((row) => ({ id: String(row.kimlik), name: row.secenekAdi })),
      'fiyat listesi',
    ),
  };
}
