/** Rozetin ürün resmindeki yeri: üst/alt × sol/orta/sağ. */
export type DealPosition = 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br';

export type DealSize = 'small' | 'medium' | 'large';

export interface Deal {
  id: string;
  name: string;
  /** Yüklenen ikonun (rozetin) adresi; yoksa ürün resminde rozet çıkmaz. */
  iconUrl: string | null;
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
  iconUrl: null,
  active: true,
  showOnImage: true,
  position: 'tl',
  size: 'medium',
  seoTitle: '',
  seoDescription: '',
});
