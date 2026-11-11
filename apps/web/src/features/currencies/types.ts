/**
 * Tanımlamalar › Para Birimleri.
 *
 * Sunucu sözleşmesi (uç yoksa 404 → ekranda örnek veri):
 *  - GET  /api/para-birimleri                     → Currency[]
 *  - POST /api/para-birimleri                     gövde CurrencyDraft → Currency (yeni)
 *  - POST /api/para-birimleri/:id                 gövde CurrencyDraft → Currency (güncelle)
 *  - POST /api/para-birimleri/:id/sil
 *  - POST /api/para-birimleri/:id/aktiflik        gövde { active }
 *  - POST /api/para-birimleri/:id/guncelle        → Currency (kuru Merkez Bankası'ndan şimdi çeker)
 *  - GET  /api/para-birimleri/kur?kod=USD&tip=efektifSatis → { rate: number }  (kaydetmeden önceki önizleme)
 * `auto: true` iken sunucu kuru `apiUrl`'den (varsayılan TCMB today.xml) `rateType` alanına göre günceller; elle
 * kur girişi kapalıdır. Yeni para birimi her zaman aktif başlar.
 */
export type RateType = 'dovizAlis' | 'dovizSatis' | 'efektifAlis' | 'efektifSatis';

export const RATE_TYPES: { value: RateType; label: string; factor: number }[] = [
  { value: 'dovizAlis', label: 'Döviz Alış', factor: 1 },
  { value: 'dovizSatis', label: 'Döviz Satış', factor: 1.003 },
  { value: 'efektifAlis', label: 'Efektif Alış', factor: 0.995 },
  { value: 'efektifSatis', label: 'Efektif Satış', factor: 1.007 },
];

export const DEFAULT_API = 'https://www.tcmb.gov.tr/kurlar/today.xml';

export interface Currency {
  id: string;
  name: string;
  shortName: string;
  symbol: string;
  /** Ana para birimi (TL): kuru 1'dir, silinemez, otomatik güncellenmez. */
  base: boolean;
  rateType: RateType;
  /** true: kur Merkez Bankası'ndan gelir (elle giriş kapalı). */
  auto: boolean;
  /** 1 birimin ana para birimi karşılığı. */
  rate: number;
  apiUrl: string;
  active: boolean;
}

export type CurrencyDraft = Pick<
  Currency,
  'name' | 'shortName' | 'symbol' | 'rateType' | 'auto' | 'rate' | 'apiUrl'
>;

export const emptyCurrencyDraft = (): CurrencyDraft => ({
  name: '',
  shortName: '',
  symbol: '',
  rateType: 'efektifSatis',
  auto: true,
  rate: 0,
  apiUrl: DEFAULT_API,
});

/** Hızlı seçim: sembol seçilince ad ve kısa ad kendiliğinden dolar. `base` TCMB'deki yaklaşık kurdur (örnek). */
export const CATALOG: { symbol: string; name: string; code: string; base: number }[] = [
  { symbol: '$', name: 'ABD Doları', code: 'USD', base: 50.2 },
  { symbol: '€', name: 'Euro', code: 'EUR', base: 55.9 },
  { symbol: '£', name: 'İngiliz Sterlini', code: 'GBP', base: 64.3 },
  { symbol: '¥', name: 'Japon Yeni', code: 'JPY', base: 0.335 },
  { symbol: '₽', name: 'Rus Rublesi', code: 'RUB', base: 0.55 },
  { symbol: '₼', name: 'Azerbaycan Manatı', code: 'AZN', base: 29.5 },
  { symbol: '₹', name: 'Hindistan Rupisi', code: 'INR', base: 0.6 },
  { symbol: '₩', name: 'Güney Kore Wonu', code: 'KRW', base: 0.036 },
  { symbol: '﷼', name: 'Suudi Riyali', code: 'SAR', base: 13.4 },
];

/** Örnek (sahte) Merkez Bankası kuru: gerçek önizleme sunucudan gelir. */
export function mockRate(code: string, type: RateType): number | null {
  const base = CATALOG.find((c) => c.code === code.toUpperCase())?.base;
  if (!base) return null;
  const factor = RATE_TYPES.find((t) => t.value === type)!.factor;
  return Math.round(base * factor * 10000) / 10000;
}

/** 50,3000 → "50,30" (gereksiz sıfırsız, en çok 4 hane). */
export const formatRate = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
