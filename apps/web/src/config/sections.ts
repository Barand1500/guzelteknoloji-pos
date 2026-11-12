import {
  BellRing,
  FolderTree,
  Coins,
  Megaphone,
  Percent,
  Receipt,
  Truck,
  Home,
  Images,
  Layers,
  LayoutTemplate,
  Package,
  Repeat2,
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
  Wallet,
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
  {
    ...soon('anasayfa', 'Anasayfa', Home, 255, 'Günün özeti'),
    soon: false,
    pages: [p('anasayfa', 'Anasayfa', `${APP_BASE}/anasayfa`, Home, 'Günün özeti')],
  },
  (() => {
    const gelen = p(
      'siparisler',
      'Gelen Siparişler',
      `${APP_BASE}/siparisler`,
      ShoppingBag,
      'Tüm siparişler',
    );
    const iade = p(
      'iade',
      'İade/Değişim',
      `${APP_BASE}/siparisler/iade`,
      Repeat2,
      'İade ve değişim talepleri',
    );
    return {
      id: 'siparisler',
      label: 'Siparişler',
      icon: ShoppingBag,
      hue: 28,
      tagline: 'Siparişler ve iadeler',
      home: gelen.path,
      pages: [gelen, iade],
      dock: { left: [gelen], right: [iade] },
      paths: [`${APP_BASE}/siparisler`],
    } satisfies Section;
  })(),
  (() => {
    const list = p(
      'musteriler',
      'Müşteriler',
      `${APP_BASE}/musteriler`,
      UserCog,
      'Müşteri listesi ve sayfaları',
    );
    return {
      id: 'musteriler',
      label: 'Müşteriler',
      icon: UserCog,
      hue: 172,
      tagline: 'Müşteri listesi',
      home: list.path,
      addButton: true,
      pages: [list],
      dock: { left: [], right: [] },
      paths: [`${APP_BASE}/musteriler`],
    } satisfies Section;
  })(),
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
  (() => {
    const sepet = p(
      'sepet-indirimi',
      'Sepet İndirimi',
      `${APP_BASE}/kampanyalar/sepet-indirimi`,
      Percent,
      'Tutara göre indirim',
    );
    const kargo = p(
      'ucretsiz-kargo',
      'Ücretsiz Kargo',
      `${APP_BASE}/kampanyalar/ucretsiz-kargo`,
      Truck,
      'Tutara göre kargo bedava',
    );
    return {
      id: 'kampanyalar',
      label: 'Kampanyalar',
      icon: Megaphone,
      hue: 320,
      tagline: 'İndirim ve ücretsiz kargo',
      home: sepet.path,
      addButton: true,
      pages: [sepet, kargo],
      dock: { left: [sepet], right: [kargo] },
      paths: [`${APP_BASE}/kampanyalar`],
    } satisfies Section;
  })(),
  (() => {
    const kargo = p(
      'kargo',
      'Kargo ve Nakliye',
      `${APP_BASE}/tanimlamalar/kargo`,
      Truck,
      'Firma, fiyat, lokasyon',
    );
    const para = p(
      'para-birimleri',
      'Para Birimleri',
      `${APP_BASE}/tanimlamalar/para-birimleri`,
      Coins,
      'Kur ve semboller',
    );
    const vergi = p(
      'vergiler',
      'Vergiler',
      `${APP_BASE}/tanimlamalar/vergiler`,
      Receipt,
      'Oranlar ve vergi daireleri',
    );
    const cariStok = p(
      'cari-stok',
      'Cari ve Stok Tanımları',
      `${APP_BASE}/tanimlamalar/cari-stok`,
      Layers,
      'Tipler, fiyat listeleri, birimler',
    );
    const odeme = p(
      'odeme-sekilleri',
      'Ödeme Şekilleri',
      `${APP_BASE}/tanimlamalar/odeme-sekilleri`,
      Wallet,
      'Sıra, simge, kurallar',
    );
    return {
      id: 'tanimlamalar',
      label: 'Tanımlamalar',
      icon: LayoutTemplate,
      hue: 205,
      tagline: 'Kargo, ödeme, vergi',
      home: kargo.path,
      addButton: true,
      pages: [kargo, para, vergi, cariStok, odeme],
      dock: { left: [], right: [] },
      paths: [`${APP_BASE}/tanimlamalar`],
    } satisfies Section;
  })(),
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
  soon('bildirimler', 'Bildirimler', BellRing, 45, 'Anlık bildirimler'),
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
