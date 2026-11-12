/**
 * Tanımlamalar › Resmi Tatil Günleri. Resmî tatiller ücretsiz bir genel API'den gelir (Nager.Date:
 * https://date.nager.at/api/v3/PublicHolidays/{yıl}/TR — anahtar gerekmez, dinî bayramlar dahil); işletmeye özel
 * tatiller (köprü günü, sayım, tadilat…) elle eklenir.
 *
 * Sunucu sözleşmesi (uç yoksa 404 → tarayıcı resmî tatilleri API'den doğrudan çeker, özel tatiller yalnızca ekranda):
 *  - GET  /api/resmi-tatiller?yil=2026        → { official: OfficialDay[], custom: CustomHoliday[] }
 *                                                (official: sunucunun API'den çekip önbelleğe aldığı günler)
 *  - POST /api/resmi-tatiller                 gövde CustomDraft → CustomHoliday
 *  - POST /api/resmi-tatiller/:id             gövde CustomDraft → CustomHoliday
 *  - POST /api/resmi-tatiller/:id/sil
 */
export interface OfficialDay {
  /** YYYY-MM-DD */
  date: string;
  /** "Kurban Bayramı 1. Gün" */
  name: string;
  /** Tarihi henüz kesin değil (dinî bayramlarda ilerideki yıllar için). */
  tentative: boolean;
}

export interface CustomHoliday {
  id: string;
  name: string;
  start: string;
  end: string;
}
export type CustomDraft = Pick<CustomHoliday, 'name' | 'start' | 'end'>;

/** Takvimde tek parça: art arda günlerden oluşan tatil (Kurban Bayramı 4 gün) ya da özel tatil. */
export interface Block {
  key: string;
  name: string;
  start: string;
  end: string;
  days: number;
  source: 'official' | 'custom';
  /** Özel tatilin kimliği. */
  id?: string;
  tentative: boolean;
}

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function todayIso() {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

/** İki gün arası fark (gün). */
export const diffDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** 0 = Pazartesi … 6 = Pazar. */
export const weekdayOf = (day: string) => (new Date(day + 'T00:00:00').getDay() + 6) % 7;

/** Nager.Date yanıtı → günler. "(Tentative Date)" eki "tahmini" işaretine çevrilir. */
export function parseNager(json: unknown): OfficialDay[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((h): h is { date: string; localName: string } => typeof h?.date === 'string' && typeof h?.localName === 'string')
    .map((h) => ({
      date: h.date,
      name: h.localName.replace(/\s*\(Tentative Date\)\s*/i, '').trim(),
      tentative: /tentative/i.test(h.localName),
    }));
}

/** "Kurban Bayramı 3. Gün" → "Kurban Bayramı". */
const baseName = (name: string) => name.replace(/\s+\d+\.\s*Gün$/i, '').trim();

/** Resmî günleri art arda ve aynı adlı olanları birleştirir; özel tatilleri ekler; tarihe göre sıralar. */
export function groupBlocks(official: OfficialDay[], custom: CustomHoliday[]): Block[] {
  const days = [...official].sort((a, b) => a.date.localeCompare(b.date));
  const blocks: Block[] = [];
  for (const d of days) {
    const name = baseName(d.name);
    const last = blocks[blocks.length - 1];
    if (last && last.source === 'official' && last.name === name && diffDays(last.end, d.date) === 1) {
      last.end = d.date;
      last.days += 1;
    } else {
      blocks.push({ key: `o-${d.date}`, name, start: d.date, end: d.date, days: 1, source: 'official', tentative: d.tentative });
    }
  }
  for (const c of custom)
    blocks.push({
      key: `c-${c.id}`,
      name: c.name,
      start: c.start,
      end: c.end,
      days: diffDays(c.start, c.end) + 1,
      source: 'custom',
      id: c.id,
      tentative: false,
    });
  return blocks.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Köprü önerisi: tatil Perşembe'de bitiyorsa Cuma, Salı'da başlıyorsa Pazartesi izin verilirse hafta sonuyla
 * birleşip uzun tatil olur. Varsa önerilen gün ve toplam gün sayısı döner.
 */
export function bridgeFor(block: Block, taken: Set<string>): { day: string; total: number } | null {
  if (block.source !== 'official') return null;
  if (weekdayOf(block.end) === 3) {
    const day = addDays(block.end, 1);
    if (!taken.has(day)) return { day, total: block.days + 3 };
  }
  if (weekdayOf(block.start) === 1) {
    const day = addDays(block.start, -1);
    if (!taken.has(day)) return { day, total: block.days + 3 };
  }
  return null;
}

/** Çevrimdışıyken gösterilen yedek (2026 resmî günleri). */
export const FALLBACK_2026: OfficialDay[] = [
  ['2026-01-01', 'Yılbaşı'],
  ['2026-03-20', 'Ramazan Bayramı 1. Gün'],
  ['2026-03-21', 'Ramazan Bayramı 2. Gün'],
  ['2026-03-22', 'Ramazan Bayramı 3. Gün'],
  ['2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'],
  ['2026-05-01', 'İşçi Bayramı'],
  ['2026-05-19', "Atatürk'ü Anma, Gençlik ve Spor Bayramı"],
  ['2026-05-27', 'Kurban Bayramı 1. Gün'],
  ['2026-05-28', 'Kurban Bayramı 2. Gün'],
  ['2026-05-29', 'Kurban Bayramı 3. Gün'],
  ['2026-05-30', 'Kurban Bayramı 4. Gün'],
  ['2026-07-15', 'Demokrasi ve Millî Birlik Günü'],
  ['2026-08-30', 'Zafer Bayramı'],
  ['2026-10-29', 'Cumhuriyet Bayramı'],
].map(([date, name]) => ({ date: date!, name: name!, tentative: false }));

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const formatDay = (day: string) =>
  new Date(day + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
export const formatRange = (start: string, end: string) =>
  start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
