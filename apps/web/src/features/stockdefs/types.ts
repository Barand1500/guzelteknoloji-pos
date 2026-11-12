/**
 * Tanımlamalar › Cari ve Stok Tanımları (4 sayfa): Cari Tipleri, Stok Tipleri, Fiyat Listeleri, Ölçü Birimleri.
 *
 * Sunucu sözleşmesi (uç yoksa 404 → ekranda örnek veri). `liste`: cari-tipleri | stok-tipleri | olcu-birimleri
 *  - GET  /api/cari-stok/:liste                      → NameItem[]  (olcu-birimleri için `shortName` de dolu)
 *  - POST /api/cari-stok/:liste                      gövde NameDraft → NameItem
 *  - POST /api/cari-stok/:liste/:id                  gövde NameDraft → NameItem
 *  - POST /api/cari-stok/:liste/:id/sil
 *  - GET  /api/cari-stok/fiyat-listeleri             → PriceList[]
 *  - POST /api/cari-stok/fiyat-listeleri             gövde PriceListDraft → PriceList
 *  - POST /api/cari-stok/fiyat-listeleri/:id         gövde PriceListDraft → PriceList
 *  - POST /api/cari-stok/fiyat-listeleri/:id/sil     (varsayılan liste silinemez)
 *  - POST /api/cari-stok/fiyat-listeleri/:id/varsayilan  (tek varsayılan liste vardır)
 * Fiyat listeleri ürünlerin fiyat sütunlarını belirler (Ürünler sayfasındaki "FİYAT / PERAKENDE / TOPTAN").
 */
export type DefList = 'cari-tipleri' | 'stok-tipleri' | 'olcu-birimleri';

export interface NameItem {
  id: string;
  name: string;
  /** Yalnızca ölçü birimlerinde: ADET, KG… */
  shortName: string;
}
export type NameDraft = Pick<NameItem, 'name' | 'shortName'>;

export type PriceListKind = 'general' | 'special';

/** Genel liste her zaman geçerlidir; özel liste (kampanya/dönem) başlangıç-bitiş tarihleri arasında geçerlidir. */
export interface PriceList {
  id: string;
  name: string;
  kind: PriceListKind;
  /** YYYY-MM-DD ya da null. */
  start: string | null;
  end: string | null;
  isDefault: boolean;
}
export type PriceListDraft = Pick<PriceList, 'name' | 'kind' | 'start' | 'end'>;

export interface StockDefsData {
  cari: NameItem[];
  stok: NameItem[];
  units: NameItem[];
  priceLists: PriceList[];
}

/** Hazır ölçü birimleri: tek dokunuşla eklenir. */
export const READY_UNITS: { name: string; shortName: string }[] = [
  { name: 'ADET', shortName: 'ADET' },
  { name: 'KOLİ', shortName: 'KOLİ' },
  { name: 'PAKET', shortName: 'PKT' },
  { name: 'KİLOGRAM', shortName: 'KG' },
  { name: 'GRAM', shortName: 'GR' },
  { name: 'LİTRE', shortName: 'LT' },
  { name: 'METRE', shortName: 'MT' },
  { name: 'DÜZİNE', shortName: 'DZN' },
  { name: 'ÇİFT', shortName: 'ÇFT' },
  { name: 'TAKIM', shortName: 'TKM' },
  { name: 'RULO', shortName: 'RLO' },
  { name: 'PALET', shortName: 'PLT' },
];

export type PeriodState = 'always' | 'upcoming' | 'running' | 'ended';

/** Özel listenin bugünkü durumu. */
export function periodState(list: PriceList, today: string): PeriodState {
  if (list.kind === 'general') return 'always';
  if (list.start && today < list.start) return 'upcoming';
  if (list.end && today > list.end) return 'ended';
  return 'running';
}

/** 0–100: özel listenin süresinin ne kadarı geçti (yalnızca iki tarih de varsa). */
export function periodProgress(list: PriceList, today: string): number | null {
  if (list.kind === 'general' || !list.start || !list.end) return null;
  const a = Date.parse(list.start);
  const b = Date.parse(list.end);
  const t = Date.parse(today);
  if (!(b > a)) return null;
  return Math.min(100, Math.max(0, ((t - a) / (b - a)) * 100));
}

export const formatDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
