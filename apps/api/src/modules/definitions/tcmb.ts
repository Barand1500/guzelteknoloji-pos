import type { RateType } from '@gt/shared';
import { HttpError } from '../../lib/http-error';

/** TCMB günlük kur dosyası; istemciden gelen adres KULLANILMAZ (SSRF koruması). */
const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const CACHE_MS = 5 * 60 * 1000;

const TAGS: Record<RateType, string> = {
  dovizAlis: 'ForexBuying',
  dovizSatis: 'ForexSelling',
  efektifAlis: 'BanknoteBuying',
  efektifSatis: 'BanknoteSelling',
};

let cache: { at: number; xml: string } | null = null;

/** Test edilebilir saf ayrıştırıcı: ilgili para biriminin 1 birimlik ₺ karşılığını döndürür. */
export function parseTcmbRate(xml: string, code: string, type: RateType): number | null {
  const safe = code.replace(/[^A-Z]/gi, '').toUpperCase();
  if (!safe) return null;
  const block =
    new RegExp(`<Currency[^>]*CurrencyCode="${safe}"[\\s\\S]*?</Currency>`, 'i').exec(xml) ??
    new RegExp(`<Currency[^>]*Kod="${safe}"[\\s\\S]*?</Currency>`, 'i').exec(xml);
  if (!block) return null;
  const read = (tag: string): string | null => {
    const value = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i').exec(block[0])?.[1]?.trim();
    return value ? value : null;
  };
  const unitText = read('Unit') ?? '1';
  const unit = Number(unitText.replace(',', '.'));
  const primary = read(TAGS[type]);
  const fallback =
    type === 'efektifAlis' ? read('ForexBuying') : type === 'efektifSatis' ? read('ForexSelling') : null;
  const raw = primary ?? fallback;
  if (!raw) return null;
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  const perUnit = Number.isFinite(unit) && unit > 0 ? unit : 1;
  return Number((value / perUnit).toFixed(6));
}

async function loadXml(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.xml;
  let response: Response;
  try {
    response = await fetch(TCMB_URL, { signal: AbortSignal.timeout(6000) });
  } catch {
    throw new HttpError(502, 'INTERNAL_ERROR', 'Merkez Bankası kurlarına ulaşılamadı.');
  }
  if (!response.ok)
    throw new HttpError(502, 'INTERNAL_ERROR', 'Merkez Bankası kurlarına ulaşılamadı.');
  const xml = await response.text();
  cache = { at: Date.now(), xml };
  return xml;
}

/** 1 birim yabancı paranın ₺ karşılığı; bulunamazsa açık hata. */
export async function tcmbRate(code: string, type: RateType): Promise<number> {
  const xml = await loadXml();
  const rate = parseTcmbRate(xml, code, type);
  if (rate === null)
    throw new HttpError(
      502,
      'INTERNAL_ERROR',
      `${code.toUpperCase()} için kur bulunamadı. Kuru elle girin.`,
    );
  return rate;
}
