import { FolderTree, Package, SlidersHorizontal, Tags, type LucideIcon } from 'lucide-react';

/** Uygulama yolları tek yerden yönetilir; sayfa eklerken yalnızca burası ve App.tsx değişir. */
export const APP_BASE = '/uygulama';
export const STOCK_CREATE_PATH = `${APP_BASE}/stok-karti/yeni`;
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

/** Üst çubukta gösterilen sayfa başlıkları. */
export const PAGE_TITLES: Record<string, string> = {
  [STOCK_CREATE_PATH]: 'Yeni Stok Kartı',
  ...Object.fromEntries([...navLeft, ...navRight].map((i) => [i.path, i.label])),
};
