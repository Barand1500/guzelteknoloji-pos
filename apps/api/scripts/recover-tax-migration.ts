import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createPrismaClient } from '../src/lib/prisma';

// Yalnızca 1824 ile son sorguda duran bu migration içindir. Tablo/veri silmez.
// --apply verilmezse salt okunur ön kontrol yapar. Deploy başlatmaz.
const migration = '20261112160000_vergiler_cari_stok';
const missingKey = 'fiyat_listesi_ayarlari_secenek_id_fkey';
const apply = process.argv.includes('--apply');
assert(
  process.argv.slice(2).every((v) => v === '--apply'),
  'Yalnızca --apply seçeneği kullanılabilir.',
);
assert(
  process.env.DATABASE_URL,
  'DATABASE_URL bulunamadı; proje kökündeki .env dosyasını kontrol edin.',
);
const sql = readFileSync(
  new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url),
  'utf8',
);
const statements = sql
  .replace(/^\s*--.*$/gm, '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);
assert(
  statements.length === 11 && statements[10]?.includes(missingKey),
  'Migration içeriği beklenenden farklı; otomatik kurtarma durduruldu.',
);
assert(
  statements[10]?.includes('REFERENCES `urun_secenekleri`'),
  'Düzeltilmiş migration dosyası yüklenmemiş.',
);
const db = createPrismaClient(process.env.DATABASE_URL);
let resolve = false;
try {
  const failed = await db.$queryRaw<{ migration_name: string; logs: string | null }[]>`
    SELECT migration_name, logs FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL`;
  assert(
    failed.length === 1 && failed[0]?.migration_name === migration,
    'Beklenen tek başarısız migration bulunamadı. Veritabanı değiştirilmedi.',
  );
  assert(failed[0].logs?.includes('stok_secenekleri'), 'Hata kaydı bu kurtarmaya uygun değil.');
  // İlk beş CREATE TABLE gerçekten tamamlanmış olmalı. Beklenmeyen durumlarda dur.
  for (const statement of statements.slice(0, 5)) {
    const table = /^CREATE TABLE `([a-z_]+)`/.exec(statement)?.[1];
    assert(table, 'Tablo tanımı tanınamadı.');
    const expected = [...statement.matchAll(/^\s*`([a-z_]+)`\s/gm)].map((m) => m[1]).sort();
    const columns = await db.$queryRaw<{ name: string }[]>`
      SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table}`;
    assert.deepEqual(
      columns.map((c) => c.name).sort(),
      expected,
      `${table}: kolonlar beklenenden farklı.`,
    );
    const indexes = await db.$queryRaw<
      { name: string; columnName: string; position: number; nonUnique: number }[]
    >`
      SELECT INDEX_NAME AS name, COLUMN_NAME AS columnName, SEQ_IN_INDEX AS position, NON_UNIQUE AS nonUnique
      FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table}`;
    assert(
      indexes.some(
        (i) => i.name === 'PRIMARY' && i.columnName === 'id' && Number(i.nonUnique) === 0,
      ),
      `${table}: birincil anahtar eksik.`,
    );
    for (const index of statement.matchAll(/(UNIQUE )?INDEX `([a-z_]+)`\(([^)]+)\)/g)) {
      const actual = indexes
        .filter((i) => i.name === index[2])
        .sort((a, b) => Number(a.position) - Number(b.position));
      assert.deepEqual(
        actual.map((i) => i.columnName),
        [...index[3]!.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]),
        `${table}: ${index[2]} eksik/farklı.`,
      );
      assert(
        actual.every((i) => Number(i.nonUnique) === (index[1] ? 0 : 1)),
        `${table}: indeks türü farklı.`,
      );
    }
  }
  let missing = false;
  for (const statement of statements.slice(5)) {
    const match =
      /ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)`\(`([^`]+)`\)/.exec(
        statement,
      );
    assert(match, 'Bağlantı tanımı tanınamadı.');
    const [, table, name, column, parent, parentColumn] = match;
    const keys = await db.$queryRaw<
      {
        columnName: string;
        parent: string;
        parentColumn: string;
        deleteRule: string;
        updateRule: string;
      }[]
    >`
      SELECT k.COLUMN_NAME AS columnName, k.REFERENCED_TABLE_NAME AS parent, k.REFERENCED_COLUMN_NAME AS parentColumn,
        r.DELETE_RULE AS deleteRule, r.UPDATE_RULE AS updateRule
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
        AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
      WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.TABLE_NAME=${table} AND k.CONSTRAINT_NAME=${name}`;
    if (keys.length === 0 && name === missingKey) {
      missing = true;
      continue;
    }
    assert.deepEqual(
      keys,
      [{ columnName: column, parent, parentColumn, deleteRule: 'CASCADE', updateRule: 'CASCADE' }],
      `${name}: bağlantı eksik veya farklı.`,
    );
  }
  const orphan = await db.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) AS total FROM fiyat_listesi_ayarlari f
    LEFT JOIN urun_secenekleri s ON s.id=f.secenek_id WHERE s.id IS NULL`;
  assert(
    Number(orphan[0]?.total) === 0,
    'Karşılıksız fiyat listesi kaydı var. Otomatik kurtarma durduruldu.',
  );
  console.log('Ön kontrol başarılı: beş tablo, indeksler ve mevcut bağlantılar doğrulandı.');
  if (apply) {
    if (missing) await db.$executeRawUnsafe(statements[10]!); // Kaynak dosyadan doğrulanmış sabit DDL.
    resolve = true;
  } else {
    console.log('Değişiklik yapılmadı. Kurtarma için aynı komutu -- --apply ile çalıştırın.');
  }
} finally {
  await db.$disconnect();
}
if (resolve) {
  const require = createRequire(import.meta.url);
  execFileSync(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'migrate', 'resolve', '--applied', migration],
    { stdio: 'inherit' },
  );
  console.log(
    'Eksik bağlantı tamamlandı ve migration uygulandı olarak işaretlendi. Şimdi proje kökünde npm run db:deploy çalıştırabilirsiniz.',
  );
}
