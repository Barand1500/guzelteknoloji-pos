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

/** Tek dokunuşla ekleme şeridinde ek olarak çıkanlar (sembol formundaki hızlı seçimde yoktur). */
export const CATALOG_MORE: typeof CATALOG = [
  { symbol: 'Fr', name: 'İsviçre Frangı', code: 'CHF', base: 56.8 },
  { symbol: 'C$', name: 'Kanada Doları', code: 'CAD', base: 36.5 },
  { symbol: 'A$', name: 'Avustralya Doları', code: 'AUD', base: 32.8 },
  { symbol: '元', name: 'Çin Yuanı', code: 'CNY', base: 6.9 },
  { symbol: 'د.إ', name: 'BAE Dirhemi', code: 'AED', base: 13.7 },
  { symbol: 'QR', name: 'Katar Riyali', code: 'QAR', base: 13.8 },
  { symbol: 'KD', name: 'Kuveyt Dinarı', code: 'KWD', base: 164 },
  { symbol: '₪', name: 'İsrail Şekeli', code: 'ILS', base: 13.7 },
  { symbol: '₾', name: 'Gürcü Larisi', code: 'GEL', base: 18.5 },
  { symbol: '₴', name: 'Ukrayna Grivnası', code: 'UAH', base: 1.2 },
  { symbol: '₸', name: 'Kazak Tengesi', code: 'KZT', base: 0.1 },
  { symbol: 'zł', name: 'Polonya Zlotisi', code: 'PLN', base: 13.1 },
  { symbol: 'Kč', name: 'Çek Korunası', code: 'CZK', base: 2.2 },
  { symbol: 'lei', name: 'Romen Leyi', code: 'RON', base: 11.2 },
  { symbol: 'лв', name: 'Bulgar Levası', code: 'BGN', base: 28.6 },
  { symbol: 'kr', name: 'İsveç Kronu', code: 'SEK', base: 5.2 },
  { symbol: 'Nkr', name: 'Norveç Kronu', code: 'NOK', base: 4.9 },
  { symbol: 'Dkr', name: 'Danimarka Kronu', code: 'DKK', base: 7.5 },
  { symbol: 'R$', name: 'Brezilya Reali', code: 'BRL', base: 9.1 },
  { symbol: 'R', name: 'Güney Afrika Randı', code: 'ZAR', base: 2.7 },
];

/** Örnek (sahte) Merkez Bankası kuru: gerçek önizleme sunucudan gelir. */
export function mockRate(code: string, type: RateType): number | null {
  const base = [...CATALOG, ...CATALOG_MORE].find((c) => c.code === code.toUpperCase())?.base;
  if (!base) return null;
  const factor = RATE_TYPES.find((t) => t.value === type)!.factor;
  return Math.round(base * factor * 10000) / 10000;
}

/** 50,3000 → "50,30" (gereksiz sıfırsız, en çok 4 hane). */
export const formatRate = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
