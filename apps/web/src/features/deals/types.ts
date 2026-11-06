/** Hazır rozet şekilleri (renkli ikonlar); isteyen kendi görselini de yükleyebilir. */
export type DealIconKey = 'yeni' | 'cok-satan' | 'indirim' | 'firsat' | 'yildiz';

export type DealIcon = { type: 'preset'; key: DealIconKey } | { type: 'image'; url: string };

/** Rozetin ürün resmindeki yeri: üst/alt × sol/orta/sağ. */
export type DealPosition = 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br';

export type DealSize = 'small' | 'medium' | 'large';

export interface Deal {
  id: string;
  name: string;
  icon: DealIcon;
  /** Rozetin üzerinde yazan kısa yazı (ör. "YENİ", "%10"). */
  badgeText: string;
  active: boolean;
  /** Kapalıysa fırsat yalnızca etiket olarak kullanılır; ürün resminin üstünde rozet çıkmaz. */
  showOnImage: boolean;
  position: DealPosition;
  size: DealSize;
  seoTitle: string;
  seoDescription: string;
  /** Bu fırsatı kullanan ürün sayısı (sunucudan hesaplanır). */
  productCount: number;
}

/** Fırsat ekleme/düzenleme formunun değerleri. */
export type DealDraft = Omit<Deal, 'id' | 'productCount'>;

/** "Ürünlere Tanımla" ekranında listelenen ürünün kısa özeti. Bir ürünün birden çok fırsatı olabilir. */
export interface DealProductRef {
  id: string;
  code: string;
  name: string;
  barcode: string;
  dealIds: string[];
}

export const PRESETS: { key: DealIconKey; label: string; text: string }[] = [
  { key: 'yeni', label: 'Yeni', text: 'YENİ' },
  { key: 'cok-satan', label: 'Çok Satan', text: 'ÇOK SATAN' },
  { key: 'indirim', label: 'İndirim', text: '%' },
  { key: 'firsat', label: 'Fırsat', text: 'FIRSAT' },
  { key: 'yildiz', label: 'Yıldız', text: '★' },
];

export const POSITIONS: { value: DealPosition; label: string }[] = [
  { value: 'tl', label: 'Üst Sol' },
  { value: 'tc', label: 'Üst Orta' },
  { value: 'tr', label: 'Üst Sağ' },
  { value: 'bl', label: 'Alt Sol' },
  { value: 'bc', label: 'Alt Orta' },
  { value: 'br', label: 'Alt Sağ' },
];

export const SIZES: { value: DealSize; label: string }[] = [
  { value: 'small', label: 'Küçük' },
  { value: 'medium', label: 'Orta' },
  { value: 'large', label: 'Büyük' },
];

export const positionLabel = (p: DealPosition) => POSITIONS.find((x) => x.value === p)?.label ?? '';
export const sizeLabel = (s: DealSize) => SIZES.find((x) => x.value === s)?.label ?? '';

export const emptyDealDraft = (): DealDraft => ({
  name: '',
  icon: { type: 'preset', key: 'yeni' },
  badgeText: 'YENİ',
  active: true,
  showOnImage: true,
  position: 'tl',
  size: 'medium',
  seoTitle: '',
  seoDescription: '',
});
