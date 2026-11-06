import type { DealPosition, DealSize } from '../deals/types';

/** Değerlerin nasıl görüneceği: yazı, renk kutusu ya da resim. (Renk ve resim birlikte olmaz.) */
export type ValueKind = 'text' | 'color' | 'image';

/**
 * Şablon: bir ya da birkaç kategoriye bağlı özellik takımı (ör. "Dokunmatik POS"). Kategoriye bağlı
 * olmayan ortak şablon "tüm ürünlerde kullan" (allProducts) ile işaretlenir.
 */
export interface AttrTemplate {
  id: string;
  name: string;
  allProducts: boolean;
  categoryIds: string[];
  /** Şablondaki grup sayısı (sunucudan hesaplanır). */
  groupCount: number;
}

export interface TemplateDraft {
  name: string;
  allProducts: boolean;
  categoryIds: string[];
}

/** Grup: şablonun içindeki başlık (ör. "İşletim Sistemi (OS)"). */
export interface AttrGroup {
  id: string;
  templateId: string;
  name: string;
  kind: ValueKind;
  /** Mağazada filtre olarak gösterilsin. */
  filter: boolean;
  /** Bir üründe birden çok değer seçilebilsin. */
  multiple: boolean;
  /** Her seçim ayrı ürün çeşidi (varyant) oluştursun. */
  variant: boolean;
  /** Yalnızca resimli gruplarda: seçilen resim ürün resminin üzerinde de gösterilsin. */
  showOnImage: boolean;
  position: DealPosition;
  size: DealSize;
  /** Gruptaki özellik sayısı (sunucudan hesaplanır). */
  valueCount: number;
}

export type GroupDraft = Omit<AttrGroup, 'id' | 'valueCount'>;

/** Özellik (değer): grubun içindeki seçenek (ör. "Free DOS", "Siyah"). */
export interface AttrValue {
  id: string;
  groupId: string;
  /** Adından otomatik üretilir, istenirse düzenlenir. */
  code: string;
  name: string;
  /** Renkli gruplarda renk (#rrggbb). */
  color: string | null;
  /** Resimli gruplarda görselin adresi. */
  imageUrl: string | null;
}

export type ValueDraft = Omit<AttrValue, 'id' | 'groupId'>;

export const KIND_OPTIONS: { value: ValueKind; label: string }[] = [
  { value: 'text', label: 'Yazı' },
  { value: 'color', label: 'Renk' },
  { value: 'image', label: 'Resim' },
];

export const kindLabel = (k: ValueKind) => KIND_OPTIONS.find((o) => o.value === k)?.label ?? '';

export const emptyTemplateDraft = (): TemplateDraft => ({
  name: '',
  allProducts: false,
  categoryIds: [],
});

export const emptyGroupDraft = (templateId: string): GroupDraft => ({
  templateId,
  name: '',
  kind: 'text',
  filter: false,
  multiple: false,
  variant: false,
  showOnImage: false,
  position: 'tl',
  size: 'medium',
});

export const emptyValueDraft = (): ValueDraft => ({
  code: '',
  name: '',
  color: null,
  imageUrl: null,
});

/** Adı koda çevirir: "Titanyum Mavi" → "titanyum-mavi" (Türkçe harfler sadeleşir). */
export function slugify(name: string): string {
  const map: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };
  return name
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
