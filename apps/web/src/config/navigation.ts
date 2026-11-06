import { FolderTree, Package, SlidersHorizontal, Tags, type LucideIcon } from 'lucide-react';

/** Uygulama yolları tek yerden yönetilir; sayfa eklerken yalnızca burası ve App.tsx değişir. */
export const APP_BASE = '/uygulama';
export const STOCK_BASE = `${APP_BASE}/stok-karti`;
export const STOCK_CREATE_PATH = `${STOCK_BASE}/yeni`;
/** Aynı stok kartı ekranı: ürün dolu gelir (düzenleme). */
export const stockEditPath = (id: string, openBox?: string) =>
  `${STOCK_BASE}/${encodeURIComponent(id)}${openBox ? `?ac=${openBox}` : ''}`;
/** Aynı ekran: ürün dolu ama YENİ kayıt olarak açılır (kopya). */
export const stockCopyPath = (id: string) => `${STOCK_CREATE_PATH}?kopya=${encodeURIComponent(id)}`;
export const PRODUCTS_PATH = `${APP_BASE}/urunler`;
/** Alt sayfa: Ürünler sekmesinin altında olduğu için alt menüde Ürünler seçili kalır. */
export const DEALS_PATH = `${PRODUCTS_PATH}/firsatlar`;
/** Girişten sonra açılan ilk ekran: yeni stok kartı. */
export const APP_HOME_PATH = STOCK_CREATE_PATH;

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

/** Alt çubukta "+" düğmesinin solunda görünen sayfalar (sırayla). */
export const navLeft: readonly NavItem[] = [
  { id: 'urunler', label: 'Ürünler', path: `${APP_BASE}/urunler`, icon: Package },
  { id: 'kategoriler', label: 'Kategoriler', path: `${APP_BASE}/kategoriler`, icon: FolderTree },
];
/** Alt çubukta "+" düğmesinin sağında görünen sayfalar. */
export const navRight: readonly NavItem[] = [
  { id: 'markalar', label: 'Markalar', path: `${APP_BASE}/markalar`, icon: Tags },
  {
    id: 'ozellikler',
    label: 'Özellikler',
    path: `${APP_BASE}/ozellikler`,
    icon: SlidersHorizontal,
  },
];

/** Üst çubuk başlığı: bilinen sayfalar sabit, stok kartı düzenleme yolu ayrıca tanınır. */
export function pageTitle(pathname: string): string | undefined {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith(`${STOCK_BASE}/`)) return 'Stok Kartını Düzenle';
  return undefined;
}

/** Üst çubukta gösterilen sayfa başlıkları. */
export const PAGE_TITLES: Record<string, string> = {
  [STOCK_CREATE_PATH]: 'Yeni Stok Kartı',
  [DEALS_PATH]: 'Fırsatlar',
  ...Object.fromEntries([...navLeft, ...navRight].map((i) => [i.path, i.label])),
};
