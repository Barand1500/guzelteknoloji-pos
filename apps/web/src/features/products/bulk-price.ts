/** Toplu fiyat değişikliğinin önizleme ve deneme verisi hesabı (sunucudaki hesabın aynısı, sayılarla). */
export type BulkPriceMode = 'yuzde_artir' | 'yuzde_azalt' | 'tutar_ekle' | 'tutar_cikar' | 'ayarla';
export type BulkRounding = 'yok' | '0.1' | '0.5' | '1' | '5';
export type BulkVat = 'dahil' | 'haric';

export interface BulkPriceChange {
  mod: BulkPriceMode;
  /** Oran (%) ya da tutar (TL). */
  value: number;
  /** Hesap KDV dahil mi hariç mi fiyat üzerinden yapılsın. */
  kdv: BulkVat;
  yuvarla: BulkRounding;
}

/** Yuvarlama adımları ve açıklamaları (arayüz listesi). */
export const ROUNDING_STEPS: {
  value: Exclude<BulkRounding, 'yok'>;
  label: string;
  hint: string;
}[] = [
  { value: '0.1', label: '0,10 ₺', hint: 'En yakın 10 kuruş' },
  { value: '0.5', label: '0,50 ₺', hint: 'En yakın yarım lira' },
  { value: '1', label: '1 ₺', hint: 'En yakın tam lira' },
  { value: '5', label: '5 ₺', hint: 'En yakın 5 lira' },
];

/**
 * KDV HARİÇ bir tutarın yeni değeri (ya da sıfırın altına düşecekse null). Değişim, seçilen dayanağa
 * (KDV dahil/hariç) uygulanır; sonuç seçilen adıma yuvarlanır.
 */
export function newExclPrice(
  excl: number,
  vatPercent: number,
  change: BulkPriceChange,
): number | null {
  const toBasis = change.kdv === 'dahil' ? 1 + vatPercent / 100 : 1;
  const base = excl * toBasis;
  let target =
    change.mod === 'yuzde_artir'
      ? base * (1 + change.value / 100)
      : change.mod === 'yuzde_azalt'
        ? base * (1 - change.value / 100)
        : change.mod === 'tutar_ekle'
          ? base + change.value
          : change.mod === 'tutar_cikar'
            ? base - change.value
            : change.value;
  if (change.yuvarla !== 'yok') {
    const step = Number(change.yuvarla);
    target = Math.round(target / step + Number.EPSILON) * step;
  }
  if (target < 0) return null;
  return target / toBasis;
}

/** Kısa özet: "%10 zam", "5 ₺ indirim"… */
export function describeChange(mod: BulkPriceMode, value: string): string {
  const v = value === '' ? '…' : value;
  switch (mod) {
    case 'yuzde_artir':
      return `%${v} zam`;
    case 'yuzde_azalt':
      return `%${v} indirim`;
    case 'tutar_ekle':
      return `${v} ₺ zam`;
    case 'tutar_cikar':
      return `${v} ₺ indirim`;
    default:
      return `${v} ₺ yeni fiyat`;
  }
}
