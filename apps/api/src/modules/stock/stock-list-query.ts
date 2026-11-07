import { Prisma } from '../../generated/prisma/client';
import type { StockListQuery } from './stock.api';

/** All user values are SQL parameters. The same predicate is used for count, page and bulk selection. */
export function stockListWhere(userId: number, query: StockListQuery, firstPriceListId?: number) {
  const clauses = [Prisma.sql`k.kullanici_id = ${userId}`];
  if (query.kimlik) clauses.push(Prisma.sql`k.id = ${Number(query.kimlik)}`);
  const brands = query.markalar.length ? query.markalar : query.marka ? [Number(query.marka)] : [];
  const categories = query.kategoriler.length
    ? query.kategoriler
    : query.kategori
      ? [Number(query.kategori)]
      : [];
  if (brands.length) clauses.push(Prisma.sql`k.marka_id IN (${Prisma.join(brands)})`);
  if (categories.length)
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM stok_karti_kategorileri sk WHERE sk.stok_karti_id = k.id AND sk.kategori_id IN (${Prisma.join(categories)}))`,
    );
  if (query.arama) {
    const text = query.arama;
    clauses.push(Prisma.sql`(
      LOCATE(${text}, COALESCE(k.stok_kodu, '')) > 0 OR LOCATE(${text}, COALESCE(k.stok_adi, '')) > 0
      OR EXISTS (SELECT 1 FROM markalar m WHERE m.id = k.marka_id AND LOCATE(${text}, m.marka_adi) > 0)
      OR EXISTS (SELECT 1 FROM stok_birimleri sb JOIN stok_barkodlari bk ON bk.stok_birimi_id = sb.id WHERE sb.stok_karti_id = k.id AND LOCATE(${text}, bk.barkod) > 0)
      OR EXISTS (SELECT 1 FROM stok_varyantlari sv WHERE sv.stok_karti_id = k.id AND (LOCATE(${text}, sv.kod) > 0 OR LOCATE(${text}, COALESCE(sv.barkod, '')) > 0))
    )`);
  }
  if (query.firsat === 'with')
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM stok_firsatlari sf WHERE sf.stok_karti_id = k.id)`,
    );
  if (query.firsat === 'without')
    clauses.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM stok_firsatlari sf WHERE sf.stok_karti_id = k.id)`,
    );
  if (query.stok === 'unlimited') clauses.push(Prisma.sql`k.envanter_takibi = 'yok'`);
  if (query.stok === 'in')
    clauses.push(
      Prisma.sql`k.envanter_takibi <> 'yok' AND COALESCE((SELECT SUM(sv.miktar) FROM stok_varyantlari sv WHERE sv.stok_karti_id = k.id), k.stok_miktari) > 0`,
    );
  if (query.stok === 'out')
    clauses.push(
      Prisma.sql`k.envanter_takibi <> 'yok' AND COALESCE((SELECT SUM(sv.miktar) FROM stok_varyantlari sv WHERE sv.stok_karti_id = k.id), k.stok_miktari) <= 0`,
    );
  if (query.satis === 'open') clauses.push(Prisma.sql`k.satisa_acik = TRUE`);
  if (query.satis === 'closed') clauses.push(Prisma.sql`k.satisa_acik = FALSE`);
  if (query.en_az || query.en_cok) {
    if (firstPriceListId === undefined) clauses.push(Prisma.sql`1 = 0`);
    else {
      // Match the displayed first-list price: discount, VAT input mode, 6-decimal net, then 2-decimal gross.
      const factor = Prisma.sql`(1 + COALESCE(f.kdv_orani, 0) / 100.0)`;
      const net = Prisma.sql`(f.girilen_fiyat * (1 - COALESCE(f.iskonto_orani, 0) / 100.0))`;
      const gross = Prisma.sql`ROUND(ROUND(CASE WHEN f.kdv_dahil_girildi THEN ${net} / ${factor} ELSE ${net} END, 6) * ${factor}, 2)`;
      const bounds = [];
      if (query.en_az) bounds.push(Prisma.sql`${gross} >= ${new Prisma.Decimal(query.en_az)}`);
      if (query.en_cok) bounds.push(Prisma.sql`${gross} <= ${new Prisma.Decimal(query.en_cok)}`);
      clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM stok_birimleri b JOIN stok_fiyatlari f ON f.stok_birimi_id = b.id
        WHERE b.stok_karti_id = k.id AND b.ana_birim = TRUE AND f.fiyat_yonu = 'satis'
        AND f.fiyat_listesi_id = ${firstPriceListId} AND f.girilen_fiyat IS NOT NULL AND ${Prisma.join(bounds, ' AND ')})`);
    }
  }
  return Prisma.join(clauses, ' AND ');
}
