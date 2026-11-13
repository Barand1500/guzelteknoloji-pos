import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('vergi/cari migration fiyat listesini yeniden adlandırılmış gerçek seçenek tablosuna bağlar', () => {
  const sql = readFileSync(
    new URL(
      '../../prisma/migrations/20261112160000_vergiler_cari_stok/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  expect(sql).toMatch(/FOREIGN KEY \(`secenek_id`\) REFERENCES `urun_secenekleri`\(`id`\)/);
  expect(sql).not.toContain('REFERENCES `stok_secenekleri`');
});
