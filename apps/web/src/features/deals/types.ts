/** Rozetin ürün resmindeki yeri: üst/alt × sol/orta/sağ. */
export type DealPosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

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
  { value: 'ml', label: 'Orta Sol' },
  { value: 'mr', label: 'Orta Sağ' },
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

const KEYWORDS: [RegExp, string][] = [
  [/(cok|çok)\s*sat|best\s*sell/i, 'Çok Satanlar'],
  [/yeni|new/i, 'Yeni Ürünler'],
  [/ucretsiz\s*kargo|ücretsiz\s*kargo|free\s*ship|kargo/i, 'Ücretsiz Kargo'],
  [/taksit/i, 'Taksit Fırsatı'],
  [/kampanya|campaign/i, 'Kampanya'],
  [/indirim|discount|sale|off\b/i, 'İndirim'],
  [/firsat|fırsat|deal/i, 'Fırsat'],
];

const titleCase = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ');

/**
 * Yüklenen ikondan ad önerisi: dosya adı (ve SVG ise içindeki yazılar) okunur. "%10", "10%",
 * "indirim-10" gibi bir sayı varsa "%10 İndirim"; "yeni", "çok satan", "kargo" gibi kelimeler
 * bilinen adlara; başka anlamlı bir dosya adı ise düzenlenmiş haline çevrilir. İpucu yoksa null
 * (öneri çıkmaz). Aynı ad varsa sonuna " 2" eklenir.
 */
export function suggestDealName(hint: string | null, taken: readonly string[] = []): string | null {
  if (!hint) return null;
  const text = hint
    .replace(/\.[a-z0-9]{2,4}(\s|$)/gi, '$1')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  let base: string | null = null;
  const percent = /%\s*([0-9]{1,3})|([0-9]{1,3})\s*%/.exec(text);
  const hasDiscountWord = /indirim|discount|sale|off\b/i.test(text);
  const bare = /(?:^|\s)([0-9]{1,2})(?:\s|$)|[a-zçğıöşü]([0-9]{1,2})$/i.exec(text);
  if (percent) base = `%${percent[1] ?? percent[2]} İndirim`;
  else if (hasDiscountWord && bare) base = `%${bare[1] ?? bare[2]} İndirim`;
  else {
    const hit = KEYWORDS.find(([re]) => re.test(text));
    if (hit) base = hit[1];
    else if (bare && /^[0-9]{1,2}$/.test(text.replace(/\s/g, '')))
      base = `%${bare[1] ?? bare[2]} İndirim`;
    else if (
      !/^(img|image|resim|ekran|screenshot|icon|ikon|rozet|badge|logo|untitled|adsiz|adsız|[0-9 ]+)/i.test(
        text,
      )
    )
      base = titleCase(text).slice(0, 60);
  }
  if (!base) return null;
  const used = new Set(taken.map((n) => n.toLocaleLowerCase('tr').trim()));
  let name = base;
  for (let n = 2; used.has(name.toLocaleLowerCase('tr')); n++) name = `${base} ${n}`;
  return name;
}

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
