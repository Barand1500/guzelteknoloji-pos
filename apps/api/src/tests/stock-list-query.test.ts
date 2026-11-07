import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import { stockListQuery } from '../modules/stock/stock.api';
import { stockListWhere } from '../modules/stock/stock-list-query';

// Execute the parameterized predicates against relational fixtures. MySQL deployment remains a separate integration check.
let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  // SQLite rounds binary floats; production MySQL rounds DECIMAL values. Emulate that numeric operation here.
  db.function('ROUND', (value, places) =>
    value === null
      ? null
      : new Prisma.Decimal(String(value)).toDecimalPlaces(Number(places)).toNumber(),
  );
  db.function(
    'LOCATE',
    (needle, value) =>
      String(value).toLocaleLowerCase('tr').indexOf(String(needle).toLocaleLowerCase('tr')) + 1,
  );
  db.exec(`
    CREATE TABLE stok_kartlari (id INTEGER PRIMARY KEY, kullanici_id INTEGER, marka_id INTEGER, stok_kodu TEXT, stok_adi TEXT, envanter_takibi TEXT, stok_miktari NUMERIC, satisa_acik INTEGER);
    CREATE TABLE markalar (id INTEGER PRIMARY KEY, marka_adi TEXT);
    CREATE TABLE stok_karti_kategorileri (stok_karti_id INTEGER, kategori_id INTEGER);
    CREATE TABLE stok_firsatlari (stok_karti_id INTEGER, firsat_id INTEGER);
    CREATE TABLE stok_birimleri (id INTEGER PRIMARY KEY, stok_karti_id INTEGER, ana_birim INTEGER);
    CREATE TABLE stok_barkodlari (stok_birimi_id INTEGER, barkod TEXT);
    CREATE TABLE stok_varyantlari (stok_karti_id INTEGER, kod TEXT, barkod TEXT, miktar NUMERIC);
    CREATE TABLE stok_fiyatlari (stok_birimi_id INTEGER, fiyat_listesi_id INTEGER, fiyat_yonu TEXT, girilen_fiyat NUMERIC, iskonto_orani NUMERIC, kdv_orani NUMERIC, kdv_dahil_girildi INTEGER);
    INSERT INTO markalar VALUES (11, 'Marka A'), (12, 'Marka B');
    INSERT INTO stok_kartlari VALUES
      (1, 1, 11, 'A-1', 'Ürün A', 'normal', 5, 1),
      (2, 1, 12, 'B-1', 'Ürün B', 'normal', 0, 0),
      (3, 1, 11, 'C-1', 'Ürün C', 'yok', 100, 1),
      (4, 2, 11, 'A-FOREIGN', 'Başka hesap', 'normal', 10, 1),
      (5, 1, 11, 'ZERO', 'Sıfır fiyat', 'normal', -2, 1),
      (6, 1, 11, 'OTHER', 'Diğer birim/listede fiyat', 'normal', 3, 1),
      (7, 1, 11, 'ROUND', 'Yuvarlama sınırı', 'normal', 1, 1);
    INSERT INTO stok_karti_kategorileri VALUES (1,21),(1,22),(2,22),(3,23),(4,21);
    INSERT INTO stok_firsatlari VALUES (1,31),(1,32),(3,31),(4,31);
    INSERT INTO stok_birimleri VALUES (11,1,1),(21,2,1),(31,3,1),(41,4,1),(51,5,1),(61,6,1),(62,6,0),(71,7,1);
    INSERT INTO stok_barkodlari VALUES (11,'000123'),(21,'99%_CODE');
    INSERT INTO stok_fiyatlari VALUES
      (11,101,'satis',100,10,20,0),
      (21,101,'satis',120,10,20,1),
      (31,101,'satis',NULL,0,20,0),
      (41,101,'satis',100,10,20,0),
      (51,101,'satis',0,NULL,NULL,0),
      (61,102,'satis',100,10,20,0),
      (62,101,'satis',100,10,20,0),
      (61,101,'alis',100,10,20,0),
      (71,101,'satis',1.005,0,0,0);
  `);
});
afterEach(() => db.close());

function query(raw: Record<string, unknown> = {}, firstListId: number | undefined = 101) {
  const where = stockListWhere(1, stockListQuery.parse(raw), firstListId);
  const params = where.values.map((value) =>
    Prisma.Decimal.isDecimal(value) ? Number(value) : value,
  ) as (string | number)[];
  return (
    db
      .prepare('SELECT k.id FROM stok_kartlari k WHERE ' + where.sql + ' ORDER BY k.id')
      .all(...params) as { id: number }[]
  ).map((row) => row.id);
}

describe('Ürün listesi sunucu süzgeçleri', () => {
  it('varyantların miktar toplamını ve kod/barkodunu kullanır; başka hesaba taşmaz', () => {
    db.exec(
      `INSERT INTO stok_varyantlari VALUES (2,'B-SIYAH','000987',10),(2,'B-BEYAZ',NULL,-2),(4,'OTHER-VARIANT','999987',100);`,
    );
    expect(query({ stok: 'in', satis: 'closed' })).toEqual([2]);
    expect(query({ stok: 'out', satis: 'closed' })).toEqual([]);
    expect(query({ arama: 'B-SIYAH' })).toEqual([2]);
    expect(query({ arama: '000987' })).toEqual([2]);
    expect(query({ arama: '999987' })).toEqual([]);
    db.exec('UPDATE stok_varyantlari SET miktar=0 WHERE stok_karti_id=2');
    expect(query({ stok: 'out', satis: 'closed' })).toEqual([2]);
  });
  it('aynı gruptaki seçimleri VEYA, farklı grupları VE ile birleştirir; satır çoğaltmaz', () => {
    expect(query({ kategoriler: '21,22', markalar: '11,12' })).toEqual([1, 2]);
    expect(query({ kategoriler: '21,22', markalar: '12' })).toEqual([2]);
    expect(query({ kategori: '22', marka: '11' })).toEqual([1]);
  });
  it('hesap sınırını tüm sorgularda korur', () => {
    expect(query()).toEqual([1, 2, 3, 5, 6, 7]);
    expect(query({ kimlik: '4' })).toEqual([]);
    expect(query({ en_az: '108', en_cok: '108' })).toEqual([1, 2]);
  });
  it('fırsat, stok ve satış filtreleri birlikte uygulanır', () => {
    expect(query({ firsat: 'with' })).toEqual([1, 3]);
    expect(query({ firsat: 'without', stok: 'out', satis: 'closed' })).toEqual([2]);
    expect(query({ stok: 'unlimited' })).toEqual([3]);
    expect(query({ stok: 'in', satis: 'open' })).toEqual([1, 6, 7]);
  });
  it('KDV dahil/hariç girilen tutarı iskontoyla hesaplar; yalnızca ilk liste ve ana birimi kullanır', () => {
    expect(query({ en_az: '108,00', en_cok: '108' })).toEqual([1, 2]);
    expect(query({ en_cok: '0' })).toEqual([5]);
    expect(query({ en_az: '1.01', en_cok: '1.01' })).toEqual([7]);
    const where = stockListWhere(1, stockListQuery.parse({ en_az: '0' }), undefined);
    expect(
      db
        .prepare('SELECT k.id FROM stok_kartlari k WHERE ' + where.sql)
        .all(...(where.values as number[])),
    ).toEqual([]);
  });
  it('ad, kod, marka ve barkod arar; yüzde ve alt çizgiyi düz metin sayar', () => {
    expect(query({ arama: 'Marka B' })).toEqual([2]);
    expect(query({ arama: '000123' })).toEqual([1]);
    expect(query({ arama: '%_' })).toEqual([2]);
    expect(query({ arama: "' OR 1=1 --" })).toEqual([]);
  });
  it.each([
    { en_az: '20', en_cok: '10' },
    { en_az: '-1' },
    { en_cok: '1e3' },
    { markalar: '1,1' },
    { kategoriler: 'abc' },
    { boyut: '201' },
  ])('geçersiz sorguyu reddeder: %j', (raw) => {
    expect(stockListQuery.safeParse(raw).success).toBe(false);
  });
});
