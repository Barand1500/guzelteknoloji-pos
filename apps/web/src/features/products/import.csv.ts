/**
 * Ürün aktarımı için CSV sütunları ve ayrıştırma. XLSX dosyaları ekranda aynı metin biçimine çevrilir.
 */
export const IMPORT_COLUMNS = [
  { key: 'code', title: 'Stok Kodu', required: true },
  { key: 'name', title: 'Ürün Adı', required: true },
  { key: 'price1', title: 'Fiyat 1', required: true },
  { key: 'category', title: 'Kategori', required: false },
  { key: 'brand', title: 'Marka', required: false },
  { key: 'price2', title: 'Fiyat 2', required: false },
  { key: 'price3', title: 'Fiyat 3', required: false },
  { key: 'cost', title: 'Alış Fiyatı', required: false },
  { key: 'vat', title: 'KDV', required: false },
  { key: 'stock', title: 'Stok', required: false },
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
