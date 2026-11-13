import type { OfficialDayDto } from '@gt/shared';

/** Resmî tatiller Nager.Date'ten alınır (anahtarsız). Sonuç yılda bir kez önbelleğe alınır. */
const SOURCE = 'https://date.nager.at/api/v3/PublicHolidays';
const TTL = 6 * 60 * 60 * 1000;

type Cache = { at: number; days: OfficialDayDto[] };
const cache = new Map<number, Cache>();

/** Dış servis kapalıysa gösterilecek yedek (2026 resmî günleri). */
export const FALLBACK_2026: OfficialDayDto[] = [
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

/** Nager.Date yanıtı → günler; "(Tentative Date)" eki "tahmini" işaretine çevrilir. */
export function parseNager(json: unknown): OfficialDayDto[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter(
      (day): day is { date: string; localName: string } =>
        typeof day?.date === 'string' && typeof day?.localName === 'string',
    )
    .map((day) => ({
      date: day.date,
      name: day.localName.replace(/\s*\(Tentative Date\)\s*/i, '').trim(),
      tentative: /tentative/i.test(day.localName),
    }));
}

/**
 * Dış servis ile yerel listeyi birleştirir: aynı gün varsa dış servisin adı korunur.
 * Nager 2026 gibi bazı yıllarda dini bayramları henüz yayınlamıyor; elde olan günler eklenir.
 */
export function mergeOfficial(
  fromApi: OfficialDayDto[],
  local: OfficialDayDto[],
): OfficialDayDto[] {
  const byDate = new Map(fromApi.map((day) => [day.date, day]));
  for (const day of local) if (!byDate.has(day.date)) byDate.set(day.date, day);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Yılın resmî tatilleri. Dış servis yavaşsa/başarısızsa 2026 için yedek liste,
 * diğer yıllar için boş liste döner ve `offline` işaretlenir (ekran bunu söyler).
 */
export async function officialDays(
  year: number,
): Promise<{ official: OfficialDayDto[]; offline: boolean }> {
  const hit = cache.get(year);
  if (hit && Date.now() - hit.at < TTL) return { official: hit.days, offline: false };
  try {
    const response = await fetch(`${SOURCE}/${year}/TR`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Nager ${response.status}`);
    const days = mergeOfficial(
      parseNager(await response.json()),
      year === 2026 ? FALLBACK_2026 : [],
    );
    if (days.length === 0) throw new Error('Nager boş yanıt');
    cache.set(year, { at: Date.now(), days });
    return { official: days, offline: false };
  } catch {
    return { official: year === 2026 ? FALLBACK_2026 : [], offline: true };
  }
}
