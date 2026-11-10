import {
  BellRing,
  FolderTree,
  Home,
  Images,
  LayoutTemplate,
  Package,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { APP_BASE, BULK_IMAGES_PATH, DEALS_PATH, type NavItem } from './navigation';

/** Üst menüdeki bir bölüm içindeki sayfa (menüde kart olarak görünür). */
export interface SectionPage extends NavItem {
  hint: string;
}

/**
 * Üst menü bölümü ("sekme"). Alttaki çubuk (Dock) seçili bölüme göre değişir: `dock` o bölümün
 * alt çubuk sayfalarıdır. `soon`: sayfaları henüz yapılmadı, menüde "Yakında" görünür.
 */
export interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Renk tonu (0-360); menüdeki simge zemininde kullanılır. */
  hue: number;
  tagline: string;
  /** Bölüme girilince açılan ilk sayfa. */
  home: string;
  soon?: boolean;
  pages: readonly SectionPage[];
  dock: { left: readonly NavItem[]; right: readonly NavItem[] };
  /** Ortadaki "+" (yeni stok kartı / sayfaya göre ekle) düğmesi bu bölümde gösterilsin mi. */
  addButton?: boolean;
  /** Bu yollar bölüme aittir. */
  paths: readonly string[];
}

const p = (
  id: string,
  label: string,
  path: string,
  icon: LucideIcon,
  hint: string,
): SectionPage => ({
  id,
  label,
  path,
  icon,
  hint,
});

const urunler = p('urunler', 'Ürünler', `${APP_BASE}/urunler`, Package, 'Stok kartları');
const kategoriler = p(
  'kategoriler',
  'Kategoriler',
  `${APP_BASE}/kategoriler`,
  FolderTree,
  'Ağaç düzeni',
);
const markalar = p('markalar', 'Markalar', `${APP_BASE}/markalar`, Tags, 'Logo ve sıra');
const ozellikler = p(
  'ozellikler',
  'Özellikler',
  `${APP_BASE}/ozellikler`,
  SlidersHorizontal,
  'Şablon · grup · değer',
);

const ayarlar = p('ayarlar', 'Ayarlar', `${APP_BASE}/ayarlar`, Settings, 'Genel ve entegrasyonlar');
const kullanicilar = p(
  'kullanicilar',
  'Kullanıcılar',
  `${APP_BASE}/kullanicilar`,
  Users,
  'Ekip üyeleri',
);
const roller = p('roller', 'Roller', `${APP_BASE}/roller`, ShieldCheck, 'Yetkiler');
const loglar = p('loglar', 'Log Kayıtları', `${APP_BASE}/loglar`, ScrollText, 'Yapılan işlemler');

const soon = (
  id: string,
  label: string,
  icon: LucideIcon,
  hue: number,
  tagline: string,
): Section => ({
  id,
  label,
  icon,
  hue,
  tagline,
  home: `${APP_BASE}/${id}`,
  soon: true,
  pages: [p(id, label, `${APP_BASE}/${id}`, icon, 'Yakında')],
  dock: { left: [], right: [] },
  paths: [`${APP_BASE}/${id}`],
});

export const SECTIONS: readonly Section[] = [
  soon('anasayfa', 'Anasayfa', Home, 255, 'Günün özeti'),
  soon('siparisler', 'Siparişler', ShoppingBag, 28, 'Gelen siparişler'),
  soon('musteriler', 'Müşteriler', UserCog, 172, 'Müşteri listesi'),
  {
    id: 'urunler',
    label: 'Ürünler',
    icon: Tags,
    hue: 14,
    tagline: 'Stok, kategori, marka',
    home: urunler.path,
    addButton: true,
    pages: [
      urunler,
      kategoriler,
      markalar,
      ozellikler,
      p('firsatlar', 'Fırsatlar', DEALS_PATH, Sparkles, 'Rozet ve etiketler'),
      p('toplu-gorsel', 'Toplu Görsel', BULK_IMAGES_PATH, Images, 'Görselleri toplu yükle'),
    ],
    dock: { left: [urunler, kategoriler], right: [markalar, ozellikler] },
    paths: [
      `${APP_BASE}/urunler`,
      `${APP_BASE}/stok-karti`,
      `${APP_BASE}/kategoriler`,
      `${APP_BASE}/markalar`,
      `${APP_BASE}/ozellikler`,
    ],
  },
  soon('kampanyalar', 'Kampanyalar', Sparkles, 320, 'İndirim ve duyurular'),
  soon('tanimlamalar', 'Tanımlamalar', LayoutTemplate, 205, 'Kargo, ödeme, vergi'),
  {
    id: 'ayarlar',
    label: 'Ayarlar',
    icon: Settings,
    hue: 225,
    tagline: 'Genel ve yetkiler',
    home: ayarlar.path,
    pages: [ayarlar, kullanicilar, roller, loglar],
    dock: { left: [ayarlar, kullanicilar], right: [roller, loglar] },
    paths: [
      `${APP_BASE}/ayarlar`,
      `${APP_BASE}/kullanicilar`,
      `${APP_BASE}/roller`,
      `${APP_BASE}/loglar`,
      `${APP_BASE}/profil`,
    ],
  },
  soon('bildirimler', 'Mobil Bildirimler', BellRing, 45, 'Anlık bildirimler'),
  soon('seo', 'Seo', Search, 140, 'Arama motoru ayarları'),
];

export const DEFAULT_SECTION = SECTIONS.find((s) => s.id === 'urunler')!;

/** Yola göre bölüm; tanınmayan yollar (ör. fırsatlar, toplu görsel) Ürünler'e aittir. */
export function sectionFor(pathname: string): Section {
  const own = SECTIONS.find((s) =>
    s.paths.some((x) => pathname === x || pathname.startsWith(x + '/')),
  );
  return own ?? DEFAULT_SECTION;
}
