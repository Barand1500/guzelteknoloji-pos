import {
  Braces,
  Cable,
  FileText,
  Image,
  LayoutTemplate,
  Menu,
  Phone,
  Palette,
  Rss,
  Settings2,
  SlidersHorizontal,
  Type,
  type LucideIcon,
} from 'lucide-react';

/**
 * E-ticaret ayar ekranlarının tek kaynağı: yol, başlık, açıklama ve ikon burada durur.
 * Yeni bir ekran eklenince yalnızca bu liste ve App.tsx'teki `eticaret/*` route'u yeterlidir.
 */
export const ECOMMERCE_BASE = '/uygulama/ayarlar/eticaret';

export interface EcommercePage {
  key: string;
  /** Alt gezinmede görünen kısa ad. */
  label: string;
  /** Üst çubukta ve kart başlığında görünen ad. */
  title: string;
  /** Ekranın altındaki tek cümlelik açıklama. */
  description: string;
  icon: LucideIcon;
}

export const ECOMMERCE_PAGES: readonly EcommercePage[] = [
  {
    key: 'sistem',
    label: 'Sistem',
    title: 'Sistem Ayarları',
    description: 'Bildirimler, özel kodlar, uygulama linkleri ve kök dosyalar.',
    icon: Settings2,
  },
  {
    key: 'sayfalar',
    label: 'Sayfalar',
    title: 'Sayfalar',
    description: 'Hakkımızda, yardım ve yasal metin sayfaları.',
    icon: FileText,
  },
  {
    key: 'gorunum',
    label: 'Görünüm',
    title: 'Görünüm Ayarları',
    description: 'Site kimliği, görsel davranışları ve sistem seçenekleri.',
    icon: Palette,
  },
  {
    key: 'menu',
    label: 'Menü',
    title: 'Menü Yönetimi',
    description: 'Üst menü, alt menü ve alt menü blokları.',
    icon: Menu,
  },
  {
    key: 'sliderlar',
    label: 'Sliderlar',
    title: 'Sliderlar',
    description: 'Ana sayfa banner görselleri ve sıraları.',
    icon: Image,
  },
  {
    key: 'widgetlar',
    label: 'Widgetlar',
    title: 'Widget Yönetimi',
    description: 'Ana sayfadaki içerik bloklarının görünürlüğü.',
    icon: LayoutTemplate,
  },
  {
    key: 'header-yazi',
    label: 'Header Yazısı',
    title: 'Header Üst Yazı',
    description: 'Sitenin en üstündeki duyuru şeridi.',
    icon: Type,
  },
  {
    key: 'varsayilanlar',
    label: 'Varsayılanlar',
    title: 'Varsayılanlar',
    description: 'Yeni ürün, müşteri ve sistem için başlangıç değerleri.',
    icon: SlidersHorizontal,
  },
  {
    key: 'sablon-degiskenleri',
    label: 'Şablon Değişkenleri',
    title: 'Şablon Değişkenleri',
    description: 'E-posta ve SMS metinlerinde kullanılan dinamik alanlar.',
    icon: Braces,
  },
  {
    key: 'iletisim-bilgileri',
    label: 'İletişim',
    title: 'İletişim Bilgileri',
    description: 'İşletme iletişim bilgileri ve sosyal bağlantılar.',
    icon: Phone,
  },
  {
    key: 'erp',
    label: 'ERP',
    title: 'ERP Entegrasyonu',
    description: 'Harici ERP bağlantı bilgileri.',
    icon: Cable,
  },
  {
    key: 'google-meta-xml',
    label: 'Google & Meta XML',
    title: 'Google & Meta XML',
    description: 'Ürün kataloğunun kanallara aktarım durumu.',
    icon: Rss,
  },
];

export function ecommercePage(key: string): EcommercePage | undefined {
  return ECOMMERCE_PAGES.find((page) => page.key === key);
}

/** Bir ekranın alt sayfaları (form) için taban yol. */
export function ecommercePath(key: string, segment?: string): string {
  return `${ECOMMERCE_BASE}/${key}${segment ? `/${segment}` : ''}`;
}

/**
 * Üst çubuk başlığı: liste ve form ekranları ayrı adlandırılır.
 * Yol tanınmıyorsa `undefined` döner (AppShell başlığı gizler).
 */
export function ecommercePageTitle(pathname: string): string | undefined {
  if (!pathname.startsWith(ECOMMERCE_BASE)) return undefined;
  const [key] = pathname.slice(ECOMMERCE_BASE.length).replace(/^\/+/, '').split('/');
  if (!key) return 'E-Ticaret Ayarları';
  return ecommercePage(key)?.title;
}
