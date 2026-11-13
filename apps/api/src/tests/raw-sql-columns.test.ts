import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Ham SQL, Prisma'nın sütun eşlemesinden geçmez: `@map` ile yeniden adlandırılan bir sütun
 * sorguda eski adıyla kalırsa tip denetimi ve birim testleri bunu görmez, hata ancak canlıda
 * "Unknown column" olarak çıkar. `20261112140000_zaman_tarih_adlari` migration'ı kolonları
 * `_zamani` → `_tarihi` yaptı; bu test ham SQL'de kalan eski adı tablo bazında yakalar.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** model adı, tablo adı ve o tablodaki `_zamani` ile biten sütunlar. */
async function schemaColumns() {
  const schema = await readFile(path.join(root, '..', 'prisma', 'schema.prisma'), 'utf8');
  const tables = new Map<string, Set<string>>();
  for (const block of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const body = block[2] as string;
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1];
    if (!table) continue;
    const columns = new Set<string>([table]);
    for (const match of body.matchAll(/@map\("([^"]+)"\)/g)) columns.add(match[1] as string);
    tables.set(table, columns);
  }
  return tables;
}

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(full)));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Dosyadaki ham SQL dizgileri: SELECT/INSERT/UPDATE/DELETE içeren şablon metinleri. */
function rawSqlBlocks(source: string) {
  return [...source.matchAll(/`([^`]*)`/g)]
    .map((match) => match[1] as string)
    .filter((text) => /\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text));
}

/** `FROM urunler k` / `JOIN urun_birimleri b` eşlemesinden takma ad → tablo. */
function aliases(block: string) {
  const map = new Map<string, string>();
  for (const match of block.matchAll(/\b(?:FROM|JOIN)\s+`?(\w+)`?(?:\s+AS)?\s+`?(\w+)`?/gi)) {
    const table = match[1] as string;
    const alias = match[2] as string;
    // `FROM (SELECT ...` gibi alt sorgularda ikinci grup anahtar sözcük olur; onu atla.
    if (/^(WHERE|ON|GROUP|ORDER|LIMIT|JOIN|LEFT|INNER|SET|VALUES)$/i.test(alias)) continue;
    map.set(alias.toLowerCase(), table);
    map.set(table.toLowerCase(), table);
  }
  return map;
}

describe('ham SQL sütun adları', () => {
  it('yeniden adlandırılan tarih sütunlarını eski adıyla kullanmaz', async () => {
    const tables = await schemaColumns();
    const offenders: string[] = [];
    for (const file of await files(path.join(root, 'modules'))) {
      const source = await readFile(file, 'utf8');
      for (const block of rawSqlBlocks(source)) {
        const scope = aliases(block);
        for (const match of block.matchAll(/\b(\w+)\.(\w+_zamani)\b/g)) {
          const table = scope.get((match[1] as string).toLowerCase());
          if (!table) continue;
          const columns = tables.get(table);
          if (!columns || columns.has(match[2] as string)) continue;
          offenders.push(`${path.relative(root, file)}: ${table}.${match[2]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
