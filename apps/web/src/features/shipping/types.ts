/**
 * Tanımlamalar › Kargo ve Nakliye. Referanstaki 9 sekme 3 anlaşılır gruba indi:
 *  - Firmalar   (Kargo Firmaları + her firmanın desi/ağırlık fiyatları)
 *  - Lokasyonlar (Ülke › İl › İlçe › Semt › Mahalle › Sokak; 5 açılır kutu yerine adım adım iniş)
 *  - Tanımlar   (Gönderi Tipleri, Kargo Tipleri, Alım Şekilleri, Teslimat Şekilleri, Teslimat Modelleri,
 *                 Ulaştırma Türleri, Yasak Kargolar: hepsi aynı basit liste)
 *
 * Sunucu sözleşmesi (hepsi POST ile yazar, gövde JSON; uç yoksa 404 → ekranda örnek veri):
 *  - GET  /api/kargo/firmalar                         → Carrier[]
 *  - POST /api/kargo/firmalar                         gövde CarrierDraft → Carrier
 *  - POST /api/kargo/firmalar/:id                     gövde CarrierDraft → Carrier
 *  - POST /api/kargo/firmalar/:id/sil
 *  - POST /api/kargo/firmalar/:id/fiyatlar            gövde PriceTable
 *  - GET  /api/kargo/lokasyonlar                      → LocationNode[] (düz liste, parentId ile ağaç)
 *  - POST /api/kargo/lokasyonlar                      gövde { parentId, name } → LocationNode (level sunucuda
 *                                                      üst düzeyden türetilir)
 *  - POST /api/kargo/lokasyonlar/:id                  gövde { name } → LocationNode
 *  - POST /api/kargo/lokasyonlar/:id/sil              (altındakilerle birlikte)
 *  - GET  /api/kargo/tanimlar/:liste                  → DefItem[]   (liste: ListKey)
 *  - POST /api/kargo/tanimlar/:liste                  gövde DefDraft → DefItem
 *  - POST /api/kargo/tanimlar/:liste/:id              gövde DefDraft → DefItem
 *  - POST /api/kargo/tanimlar/:liste/:id/sil
 */
export type PriceMode = 'desi' | 'weight';

/**
 * Fiyat basamağı. Başlangıç değeri yazılmaz: öncekinin bitişinin 1 fazlasıdır (ilk basamak 0'dan başlar),
 * böylece aralıklar çakışamaz. Son basamak her zaman açıktır (`to: null`, "N ve üzeri"); `perUnit` açıksa
 * önceki basamağın fiyatına her ek desi/kg için bu fiyat eklenir (referanstaki "kat sayı").
 */
export interface Tier {
  to: number | null;
  /** KDV hariç ₺. */
  price: number;
  perUnit: boolean;
}

export interface PriceTable {
  /** KDV oranı (%), tüm basamaklar için tek. */
  vat: number;
  desi: Tier[];
  weight: Tier[];
}

export interface Carrier {
  id: string;
  name: string;
  shortName: string;
  apiUrl: string;
  prices: PriceTable;
}
export type CarrierDraft = Pick<Carrier, 'name' | 'shortName' | 'apiUrl'>;
export const emptyCarrierDraft = (): CarrierDraft => ({ name: '', shortName: '', apiUrl: '' });

export const VAT_OPTIONS = [0, 1, 10, 20] as const;

export const emptyTiers = (): Tier[] => [{ to: null, price: 0, perUnit: false }];
export const emptyPrices = (): PriceTable => ({
  vat: 20,
  desi: emptyTiers(),
  weight: emptyTiers(),
});

/** i. basamağın başlangıcı. */
export const fromOf = (tiers: Tier[], i: number): number =>
  i === 0 ? 0 : (tiers[i - 1]?.to ?? 0) + 1;

/** Verilen desi/kg için KDV hariç ücret (basamak yoksa null). */
export function priceFor(tiers: Tier[], value: number): number | null {
  // Hiç fiyat girilmemiş tablo (varsayılan tek basamak, 0 TL) "ücretsiz" değil "tanımsız" sayılır.
  if (tiers.length === 1 && tiers[0]?.to === null && (tiers[0]?.price ?? 0) === 0) return null;
  if (tiers.length === 0 || value < 0) return null;
  const i = tiers.findIndex((t) => t.to === null || value <= t.to);
  const tier = tiers[i];
  if (!tier) return null;
  if (tier.to === null && tier.perUnit) {
    const prev = tiers[i - 1];
    const extra = Math.max(0, value - (prev?.to ?? 0));
    return Math.round(((prev?.price ?? 0) + extra * tier.price) * 100) / 100;
  }
  return tier.price;
}

export const withVat = (price: number, vat: number) =>
  Math.round(price * (1 + vat / 100) * 100) / 100;

/** Basamak değişince sonrakilerin bitişi çakışmasın diye yeniden düzenler. */
export function normalizeTiers(tiers: Tier[]): Tier[] {
  const out = tiers.map((t) => ({ ...t }));
  out.forEach((t, i) => {
    const last = i === out.length - 1;
    if (last) {
      t.to = null;
      return;
    }
    const start = fromOf(out, i);
    if (t.to === null || t.to < start) t.to = start;
  });
  return out;
}

/** Konum: düz liste; `level` 0 = Ülke … 5 = Sokak. */
export const LOCATION_PLURAL = [
  'Ülkeler',
  'İller',
  'İlçeler',
  'Semtler',
  'Mahalleler',
  'Sokaklar',
] as const;
export const LOCATION_LEVELS = ['Ülke', 'İl', 'İlçe', 'Semt', 'Mahalle', 'Sokak'] as const;
export interface LocationNode {
  id: string;
  parentId: string | null;
  name: string;
  level: number;
}

export type ListKey =
  | 'gonderi-tipleri'
  | 'kargo-tipleri'
  | 'alim-sekilleri'
  | 'teslimat-sekilleri'
  | 'teslimat-modelleri'
  | 'ulastirma-turleri'
  | 'yasak-kargolar';

/** `short: true` → Adı + Kısa adı; aksi halde Başlık + Metin. */
export const LIST_DEFS: { key: ListKey; label: string; one: string; short: boolean }[] = [
  { key: 'gonderi-tipleri', label: 'Gönderi Tipleri', one: 'Gönderi Tipi', short: true },
  { key: 'kargo-tipleri', label: 'Kargo Tipleri', one: 'Kargo Tipi', short: false },
  { key: 'alim-sekilleri', label: 'Alım Şekilleri', one: 'Alım Şekli', short: false },
  { key: 'teslimat-sekilleri', label: 'Teslimat Şekilleri', one: 'Teslimat Şekli', short: false },
  { key: 'teslimat-modelleri', label: 'Teslimat Modelleri', one: 'Teslimat Modeli', short: false },
  { key: 'ulastirma-turleri', label: 'Ulaştırma Türleri', one: 'Ulaştırma Türü', short: false },
  { key: 'yasak-kargolar', label: 'Yasak Kargolar', one: 'Yasak Kargo', short: false },
];

export interface DefItem {
  id: string;
  title: string;
  /** Yalnızca Gönderi Tipleri'nde kullanılır. */
  short: string;
  /** Diğer listelerde açıklama metni. */
  text: string;
}
export type DefDraft = Pick<DefItem, 'title' | 'short' | 'text'>;

export interface ShippingData {
  carriers: Carrier[];
  locations: LocationNode[];
  lists: Record<ListKey, DefItem[]>;
}
