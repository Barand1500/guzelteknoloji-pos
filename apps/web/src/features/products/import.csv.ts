/**
 * Ürün aktarımı için CSV sütunları ve ayrıştırma. XLSX dosyaları ekranda aynı metin biçimine çevrilir.
 */
/**
 * `title`: sunucunun beklediği başlık (dosyaya/sunucuya bu adla gider). `label`: eşleştirme
 * ekranında kullanıcıya görünen ad. `aliases`: dosyada bu adlarla yazılmış başlıklar otomatik eşleşir.
 */
export const IMPORT_COLUMNS = [
  {
    key: 'code',
    title: 'Stok Kodu',
    label: 'Ürün Kodu',
    required: true,
    aliases: ['stok kodu', 'urun kodu', 'kod', 'stok no', 'sku'],
  },
  {
    key: 'name',
    title: 'Ürün Adı',
    label: 'Ürün Adı',
    required: true,
    aliases: ['urun adi', 'stok adi', 'ad', 'isim', 'urun ismi', 'name'],
  },
  {
    key: 'price1',
    title: 'Fiyat 1',
    label: 'Fiyat 1 (ilk liste)',
    required: true,
    aliases: ['fiyat 1', 'fiyat', 'satis fiyati', 'price'],
  },
  {
    key: 'category',
    title: 'Kategori',
    label: 'Kategori',
    required: false,
    aliases: ['kategori', 'category'],
  },
  { key: 'brand', title: 'Marka', label: 'Marka', required: false, aliases: ['marka', 'brand'] },
  {
    key: 'price2',
    title: 'Fiyat 2',
    label: 'Fiyat 2 (ikinci liste)',
    required: false,
    aliases: ['fiyat 2'],
  },
  {
    key: 'price3',
    title: 'Fiyat 3',
    label: 'Fiyat 3 (üçüncü liste)',
    required: false,
    aliases: ['fiyat 3'],
  },
  {
    key: 'cost',
    title: 'Alış Fiyatı',
    label: 'Alış Fiyatı',
    required: false,
    aliases: ['alis fiyati', 'alis', 'maliyet'],
  },
  { key: 'vat', title: 'KDV', label: 'KDV Oranı', required: false, aliases: ['kdv', 'kdv orani'] },
  {
    key: 'stock',
    title: 'Stok',
    label: 'Stok Miktarı',
    required: false,
    aliases: ['stok', 'stok miktari', 'miktar', 'adet'],
  },
] as const;

export type ImportKey = (typeof IMPORT_COLUMNS)[number]['key'];
export type RawImportRow = { line: number } & Record<ImportKey, string>;

/** Excel'in UTF-8 dosyaların başına koyduğu işaret (Byte Order Mark). Kaçış dizisiyle yazılmaz. */
const BOM = String.fromCharCode(0xfeff);

const fold = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

/** Tırnaklı alanları ve satır içi ayraçları doğru okuyan küçük CSV ayrıştırıcı. */
function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') {
      // Tırnak yalnızca alanın BAŞINDAYSA tırnaklama sayılır; "15.6" gibi inç işareti düz karakterdir.
      quoted = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else field += ch;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/** Dosyanın ham tablosu: ilk satır başlıklar, gerisi kayıtlar (boş satırlar atılmış). */
export interface ImportTable {
  headers: string[];
  /** Başlık satırından sonraki her satırın hücreleri; `lines` dosyadaki gerçek satır numaralarıdır. */
  records: string[][];
  lines: number[];
}

/** Eşleştirme: her dosya sütunu için hedef tablo sütunu ("" = atla). */
export type ImportAssignment = (ImportKey | '')[];

/** Metni başlık + kayıtlara ayırır (ayraç ve BOM otomatik). */
export function readTable(rawText: string): ImportTable {
  const text = rawText.startsWith(BOM) ? rawText.slice(1) : rawText;
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const [header = [], ...body] = splitRecords(text, delimiter);
  const records: string[][] = [];
  const lines: number[] = [];
  body.forEach((cells, n) => {
    if (cells.every((c) => c.trim() === '')) return;
    records.push(cells);
    lines.push(n + 2);
  });
  return { headers: header.map((h) => h.trim()), records, lines };
}

/** Eşleştirmede başlıklar harf/aksan farkı gözetmeden karşılaştırılır. */
const loose = (s: string) =>
  fold(s)
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

/** Dosya başlıklarını bilinen adlara göre kendiliğinden eşler; her tablo sütunu en çok bir kez kullanılır. */
export function autoMapping(headers: string[]): ImportAssignment {
  const used = new Set<ImportKey>();
  return headers.map((header) => {
    const name = loose(header);
    const found = IMPORT_COLUMNS.find(
      (c) =>
        !used.has(c.key) &&
        (loose(c.title) === name || (c.aliases as readonly string[]).includes(name)),
    );
    if (!found) return '';
    used.add(found.key);
    return found.key;
  });
}

/** Eşleştirilmemiş zorunlu alanların kullanıcıya görünen adları. */
export function missingRequired(assignment: ImportAssignment): string[] {
  return IMPORT_COLUMNS.filter((c) => c.required && !assignment.includes(c.key)).map(
    (c) => c.label,
  );
}

/** Eşleştirmeye göre, sunucunun beklediği başlıklarla (noktalı virgül, tırnaklı) metin üretir. */
export function buildImportText(table: ImportTable, assignment: ImportAssignment): string {
  const quote = (v: string) => '"' + v.replace(/"/g, '""') + '"';
  const picked = IMPORT_COLUMNS.map((c) => ({ c, at: assignment.indexOf(c.key) }));
  const lines = [picked.map(({ c }) => quote(c.title)).join(';')];
  for (const cells of table.records)
    lines.push(picked.map(({ at }) => quote(at < 0 ? '' : (cells[at] ?? '').trim())).join(';'));
  return lines.join('\r\n');
}

export interface ParsedImport {
  /** Dosyada bulunamayan zorunlu sütunlar (varsa önizleme yapılmaz). */
  missingColumns: string[];
  rows: RawImportRow[];
}

/** Metni satırlara çevirir. İlk satır başlıktır; sütun sırası önemli değildir. */
export function parseImport(rawText: string): ParsedImport {
  const text = rawText.startsWith(BOM) ? rawText.slice(1) : rawText;
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const [header = [], ...body] = splitRecords(text, delimiter);
  const index = new Map(header.map((title, i) => [fold(title), i]));

  const missingColumns = IMPORT_COLUMNS.filter((c) => c.required && !index.has(fold(c.title))).map(
    (c) => c.title,
  );
  const rows: RawImportRow[] = [];
  body.forEach((cells, n) => {
    if (cells.every((c) => c.trim() === '')) return; // boş satırı atla
    const row = { line: n + 2 } as RawImportRow;
    for (const col of IMPORT_COLUMNS) {
      const at = index.get(fold(col.title));
      row[col.key] = at === undefined ? '' : (cells[at] ?? '').trim();
    }
    rows.push(row);
  });
  return { missingColumns, rows };
}

/** "Örnek dosya" içeriği (Türkçe Excel'in doğru açması için BOM + noktalı virgül). */
export function sampleImportCsv(): string {
  const lines = [
    IMPORT_COLUMNS.map((c) => c.title).join(';'),
    'ORNEK-001;Örnek Dokunmatik POS 15";265,00;Dokunmatik POS;FLEXYPOS;275,00;375,00;224,00;20;5',
    'ORNEK-002;Örnek Barkod Okuyucu;650,00;Barkod Okuyucular;;;;520,00;20;',
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** "1.250,50" ya da "1250.5" gibi yazılışları sayıya çevirir; geçersizse NaN. */
export function parseNumber(text: string): number {
  const t = text.trim();
  if (t === '') return Number.NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(normalized);
}
