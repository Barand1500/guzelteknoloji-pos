import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';

it('migration eksik vergileri tamamlar, pasif/adı aynı seçenekleri korur ve çoğaltmaz', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.function('SHA2', (value, bits) => {
      if (bits !== 256) throw new Error('Unsupported hash');
      return createHash('sha256').update(String(value)).digest('hex');
    });
    db.exec(`
      CREATE TABLE kullanicilar (id INTEGER PRIMARY KEY);
      INSERT INTO kullanicilar VALUES (1), (2), (3);
      CREATE TABLE urun_secenekleri (
        kullanici_id INTEGER, liste_turu TEXT, secenek_kodu TEXT, secenek_adi TEXT,
        ad_hash TEXT, silinebilir INTEGER, etkin INTEGER, sira INTEGER, olusturma_zamani TEXT,
        UNIQUE (kullanici_id, liste_turu, secenek_kodu), UNIQUE (kullanici_id, liste_turu, ad_hash)
      );
      INSERT INTO urun_secenekleri VALUES (1,'otherTaxes','mtv','MTV',SHA2('mtv',256),0,0,5,'old');
      INSERT INTO urun_secenekleri VALUES (2,'otherTaxes','custom','Alış ÖTV',SHA2('alış ötv',256),1,1,7,'old');
    `);
    // Aynı veri sorgusu; SQLite için yalnızca MySQL zaman hassasiyeti sözdizimi uyarlanır.
    const sql = readFileSync(
      new URL(
        '../../prisma/migrations/20261109030000_mevcut_kullanici_vergi_secenekleri/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ).replace('CURRENT_TIMESTAMP(3)', 'CURRENT_TIMESTAMP');
    db.exec(sql);
    expect(db.prepare('SELECT COUNT(*) AS n FROM urun_secenekleri').get()?.n).toBe(9);
    expect(
      db
        .prepare(
          "SELECT etkin, sira FROM urun_secenekleri WHERE kullanici_id=1 AND secenek_kodu='mtv'",
        )
        .get(),
    ).toMatchObject({ etkin: 0, sira: 5 });
    expect(
      db
        .prepare(
          "SELECT secenek_kodu FROM urun_secenekleri WHERE kullanici_id=2 AND secenek_adi='Alış ÖTV'",
        )
        .get(),
    ).toMatchObject({ secenek_kodu: 'custom' });
    db.exec(sql);
    expect(db.prepare('SELECT COUNT(*) AS n FROM urun_secenekleri').get()?.n).toBe(9);
  } finally {
    db.close();
  }
});
