/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca servis katmanı (features/attributes/services) içe aktarır.
 * Liste sırası = gösterim sırasıdır. Şablonların kategori kimlikleri category.mock.ts'dendir.
 */
import type { AttrGroup, AttrTemplate, AttrValue } from '../features/attributes/types';
import { slugify } from '../features/attributes/types';

type TemplateSeed = Omit<AttrTemplate, 'groupCount'>;
type GroupSeed = Omit<AttrGroup, 'valueCount'>;

const tpl = (
  id: string,
  name: string,
  categoryIds: string[],
  allProducts = false,
): TemplateSeed => ({
  id,
  name,
  allProducts,
  categoryIds,
});

export const templateSeeds: TemplateSeed[] = [
  tpl('t-pos', 'Dokunmatik POS', ['pos']),
  tpl('t-kiosk', 'Fiyatgör ve Kiosk', ['kiosk']),
  tpl('t-el', 'El Terminalleri', ['el-terminali']),
  tpl('t-yeni-nesil', 'Yeni Nesil Yazarkasa/POS', ['yeni-nesil']),
  tpl('t-fiziksel', 'Fiziksel Özellikler', [], true),
];

const grp = (
  id: string,
  templateId: string,
  name: string,
  extra: Partial<GroupSeed> = {},
): GroupSeed => ({
  id,
  templateId,
  name,
  kind: 'text',
  filter: false,
  multiple: false,
  variant: false,
  showOnImage: false,
  position: 'tl',
  size: 'medium',
  ...extra,
});

export const groupSeeds: GroupSeed[] = [
  grp('g-os', 't-pos', 'İşletim Sistemi (OS)', { filter: true }),
  grp('g-ekran', 't-pos', 'Ekran', { filter: true, multiple: true }),
  grp('g-cpu', 't-pos', 'İşlemci (CPU)', { variant: true }),
  grp('g-ram', 't-pos', 'Bellek (RAM)'),
  grp('g-disk', 't-pos', 'Depolama (DISK)'),
  grp('g-os-kiosk', 't-kiosk', 'İşletim Sistemi (OS)', { filter: true }),
  grp('g-renk', 't-fiziksel', 'Renk', { kind: 'color', filter: true, variant: true }),
  grp('g-materyal', 't-fiziksel', 'Materyal'),
  grp('g-agirlik', 't-fiziksel', 'Ağırlık'),
  grp('g-kutu', 't-fiziksel', 'Kutu İçeriği', {
    kind: 'image',
    multiple: true,
    showOnImage: true,
    position: 'br',
    size: 'small',
  }),
];

/** Resimli değerler için kodla çizilmiş küçük demo görselleri (yüklenmiş resim taklidi). */
function pic(fill: string, text: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${fill}"/>` +
    `<text x="32" y="38" text-anchor="middle" fill="#fff" font-weight="800" font-size="16" font-family="system-ui,sans-serif">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const val = (
  id: string,
  groupId: string,
  name: string,
  extra: { color?: string; imageUrl?: string } = {},
): AttrValue => ({
  id,
  groupId,
  code: slugify(name),
  name,
  color: extra.color ?? null,
  imageUrl: extra.imageUrl ?? null,
});

const textValues = (groupId: string, names: string[]) =>
  names.map((name, i) => val(`${groupId}-${i + 1}`, groupId, name));

export const valueSeeds: AttrValue[] = [
  ...textValues('g-os', ['Free DOS', 'Windows 10 IoT', 'Windows 11 Pro', 'Android']),
  ...textValues('g-ekran', ['10.1"', '12"', '15"', '15.6"']),
  ...textValues('g-cpu', ['Intel Celeron', 'Intel i3', 'Intel i5', 'Intel i7']),
  ...textValues('g-ram', ['4 GB', '8 GB', '16 GB']),
  ...textValues('g-disk', ['128 GB SSD', '256 GB SSD', '512 GB SSD']),
  ...textValues('g-os-kiosk', ['Android', 'Windows 10 IoT']),
  ...(
    [
      ['Siyah', '#000000'],
      ['Gümüş Gri', '#dddddd'],
      ['Titanyum Mavi', '#4f5380'],
      ['Rose Gold', '#dfbfa5'],
      ['Beyaz', '#fafafa'],
      ['Gri', '#d4d4d4'],
      ['Sarı', '#f9fb4d'],
      ['Turuncu', '#f57c00'],
      ['Kahverengi', '#8a5330'],
    ] as const
  ).map(([name, color], i) => val(`g-renk-${i + 1}`, 'g-renk', name, { color })),
  ...textValues('g-materyal', ['Plastik', 'Metal', 'Cam']),
  ...textValues('g-agirlik', ['1 kg', '2 kg', '5 kg']),
  val('g-kutu-1', 'g-kutu', 'Adaptör', { imageUrl: pic('#3f86c8', 'ADP') }),
  val('g-kutu-2', 'g-kutu', 'Güç Kablosu', { imageUrl: pic('#1f9d55', 'KBL') }),
  val('g-kutu-3', 'g-kutu', 'Kullanım Kılavuzu', { imageUrl: pic('#f08a14', 'KLV') }),
];
