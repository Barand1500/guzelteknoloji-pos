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
/** Alt sayfa: Toplu Görsel Yükleme (Fırsatlar gibi Ürünler altındadır). */
export const BULK_IMAGES_PATH = `${PRODUCTS_PATH}/toplu-gorsel`;
export const BRANDS_PATH = `${APP_BASE}/markalar`;
/** Alt sayfa: Toplu Logo Yükleme (Markalar altındadır). */
export const BULK_LOGOS_PATH = `${BRANDS_PATH}/toplu-logo`;
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
  [`${APP_BASE}/profil`]: 'Profil',
  [`${APP_BASE}/kullanicilar`]: 'Kullanıcılar',
  [`${APP_BASE}/roller`]: 'Roller',
  [`${APP_BASE}/ayarlar`]: 'Ayarlar',
  [`${APP_BASE}/ayarlar/general`]: 'Genel Ayarlar',
  [`${APP_BASE}/ayarlar/images`]: 'Görsel Ayarları',
  [`${APP_BASE}/ayarlar/entegrasyonlar`]: 'Entegrasyonlar',
  [`${APP_BASE}/ayarlar/smtp`]: 'SMTP Ayarları',
  [`${APP_BASE}/ayarlar/imap`]: 'IMAP Ayarları',
  [`${APP_BASE}/ayarlar/google`]: 'Google Ayarları',
  [`${APP_BASE}/ayarlar/cloudflare`]: 'Cloudflare',
  [`${APP_BASE}/ayarlar/whatsapp`]: 'WhatsApp',
  [`${APP_BASE}/ayarlar/recaptcha`]: 'Google reCAPTCHA',
  [`${APP_BASE}/loglar`]: 'Log Kayıtları',
  [STOCK_CREATE_PATH]: 'Yeni Stok Kartı',
  [DEALS_PATH]: 'Fırsatlar',
  [BULK_IMAGES_PATH]: 'Toplu Görsel',
  [BULK_LOGOS_PATH]: 'Toplu Logo',
  [`${APP_BASE}/anasayfa`]: 'Anasayfa',
  [`${APP_BASE}/siparisler`]: 'Siparişler',
  [`${APP_BASE}/musteriler`]: 'Müşteriler',
  [`${APP_BASE}/kampanyalar`]: 'Kampanyalar',
  [`${APP_BASE}/tanimlamalar`]: 'Tanımlamalar',
  [`${APP_BASE}/bildirimler`]: 'Mobil Bildirimler',
  [`${APP_BASE}/seo`]: 'Seo',
  ...Object.fromEntries([...navLeft, ...navRight].map((i) => [i.path, i.label])),
};
