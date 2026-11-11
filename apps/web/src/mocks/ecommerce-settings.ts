/**
 * E-ticaret ayar ekranlarının ÖRNEK verileri.
 * Bu görevde backend yok: liste, form ve önizlemeler bu dosyadan beslenir; hiçbir kayıt sunucuya
 * gönderilmez. Gerçek API geldiğinde bu dosya silinecek ve ekranlar `services/` katmanına bağlanacak.
 */

export type LegalDocType =
  | 'yok'
  | 'kvkk'
  | 'uyelik'
  | 'mesafeli'
  | 'on-bilgilendirme'
  | 'tahsilat'
  | 'teslimat';

export const LEGAL_DOC_OPTIONS: readonly { value: LegalDocType; label: string }[] = [
  { value: 'yok', label: 'Bağlantı yok' },
  { value: 'kvkk', label: 'KVKK ve Aydınlatma Metni' },
  { value: 'mesafeli', label: 'Mesafeli Satış Sözleşmesi' },
  { value: 'on-bilgilendirme', label: 'Ön Bilgilendirme Formu' },
  { value: 'tahsilat', label: 'Tahsilat Sözleşmesi' },
  { value: 'teslimat', label: 'Teslimat, İptal ve İade Politikası' },
  { value: 'uyelik', label: 'Üyelik Sözleşmesi' },
];

export function legalDocLabel(value: LegalDocType): string | undefined {
  return LEGAL_DOC_OPTIONS.find((option) => option.value === value && value !== 'yok')?.label;
}

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  legal: LegalDocType;
  content: string;
}

const sampleContent =
  'Bu alan örnek içeriktir. Sayfa metni buraya yazılacak; kaydetme backend bağlantısı gelince açılacak.';

export const SITE_PAGES: readonly SitePage[] = [
  {
    id: '1',
    title: 'Üyelik Sözleşmesi',
    slug: 'uyelik-sozlesmesi',
    published: true,
    legal: 'uyelik',
    content: sampleContent,
  },
  {
    id: '2',
    title: 'Ön Bilgilendirme Formu',
    slug: 'on-bilgilendirme-formu',
    published: true,
    legal: 'on-bilgilendirme',
    content: sampleContent,
  },
  {
    id: '3',
    title: 'Mesafeli Satış Sözleşmesi',
    slug: 'mesafeli-satis-sozlesmesi',
    published: true,
    legal: 'mesafeli',
    content: sampleContent,
  },
  {
    id: '4',
    title: 'Teslimat, İptal Ve İade Politikası',
    slug: 'teslimat-iptal-iade-politikasi',
    published: true,
    legal: 'teslimat',
    content: sampleContent,
  },
  {
    id: '5',
    title: 'Tahsilat Sözleşmesi',
    slug: 'tahsilat-sozlesmesi',
    published: false,
    legal: 'tahsilat',
    content: sampleContent,
  },
  {
    id: '6',
    title: 'Hakkımızda',
    slug: 'hakkimizda',
    published: true,
    legal: 'yok',
    content: sampleContent,
  },
  {
    id: '7',
    title: 'Aydınlatma Metni',
    slug: 'aydinlatma-metni',
    published: true,
    legal: 'kvkk',
    content: sampleContent,
  },
  {
    id: '8',
    title: 'Gizlilik Politikası',
    slug: 'gizlilik-politikasi',
    published: true,
    legal: 'kvkk',
    content: sampleContent,
  },
  {
    id: '9',
    title: 'ETBİS Kayıt Belgesi',
    slug: 'etbis-kayit-belgesi',
    published: false,
    legal: 'yok',
    content: sampleContent,
  },
];

export type MenuGroupKey = 'ust' | 'alt' | 'alt1' | 'alt2' | 'alt3';

export const MENU_GROUPS: readonly { key: MenuGroupKey; label: string }[] = [
  { key: 'ust', label: 'Üst Menü' },
  { key: 'alt', label: 'Alt Menü' },
  { key: 'alt1', label: '1. Alt Menü Blok' },
  { key: 'alt2', label: '2. Alt Menü Blok' },
  { key: 'alt3', label: '3. Alt Menü Blok' },
];

export interface MenuEntry {
  id: string;
  group: MenuGroupKey;
  label: string;
  url: string;
  newTab: boolean;
  active: boolean;
}

export const MENU_ENTRIES: readonly MenuEntry[] = [
  { id: 'm1', group: 'ust', label: 'Ana Sayfa', url: '/', newTab: false, active: true },
  {
    id: 'm2',
    group: 'ust',
    label: 'Hakkımızda',
    url: '/sayfa/hakkimizda',
    newTab: false,
    active: true,
  },
  { id: 'm3', group: 'ust', label: 'MARKALAR', url: '/markalar', newTab: false, active: true },
  {
    id: 'm4',
    group: 'ust',
    label: 'Çok Satanlar',
    url: '/all-categories?firsat=cok-satanlar',
    newTab: false,
    active: true,
  },
  {
    id: 'm5',
    group: 'ust',
    label: 'Para Sayma Makineleri',
    url: '/ot-vt-urunleri/para-sayma-ve-kontrol/para-sayma-makineleri/',
    newTab: false,
    active: true,
  },
  {
    id: 'm6',
    group: 'ust',
    label: 'Yeni Nesil Yazarkasa/POS',
    url: '/ot-vt-urunleri/odeme-kaydediciler/yeni-nesil-yazarkasa-pos/',
    newTab: false,
    active: true,
  },
  {
    id: 'm7',
    group: 'alt',
    label: 'Gizlilik Politikası',
    url: '/sayfa/gizlilik-politikasi',
    newTab: false,
    active: true,
  },
  {
    id: 'm8',
    group: 'alt',
    label: 'İletişim',
    url: '/sayfa/iletisim',
    newTab: false,
    active: true,
  },
];

export interface Slide {
  id: string;
  title: string;
  description: string;
  link: string;
  active: boolean;
}

export const SLIDES: readonly Slide[] = [
  {
    id: 's1',
    title: 'El Terminalleri',
    description: 'Sahada hızlı satış için el terminalleri.',
    link: '/el-terminalleri',
    active: true,
  },
  {
    id: 's2',
    title: 'Teraziler',
    description: 'Terazi ve tartım çözümleri.',
    link: '/teraziler',
    active: true,
  },
  {
    id: 's3',
    title: 'ZHONGJI',
    description: 'ZHONGJI ürün grubu.',
    link: '/zhongji',
    active: true,
  },
];

export type WidgetType = 'slider' | 'banner' | 'kategori' | 'urun-raflari' | 'duyuru' | 'metin';

export const WIDGET_TYPES: readonly { value: WidgetType; label: string }[] = [
  { value: 'slider', label: 'Slider' },
  { value: 'banner', label: 'Banner' },
  { value: 'kategori', label: 'Kategori Vitrini' },
  { value: 'urun-raflari', label: 'Ürün Rafları' },
  { value: 'duyuru', label: 'Duyuru Şeridi' },
  { value: 'metin', label: 'Serbest Metin' },
];

export interface WidgetEntry {
  id: string;
  name: string;
  type: WidgetType;
  title: string;
  visible: boolean;
}

export const WIDGETS: readonly WidgetEntry[] = [];

export interface TemplateVariable {
  id: string;
  name: string;
  module: 'Kullanıcılar' | 'Siparişler' | 'Kampanyalar' | 'Sistem';
  type: 'E-Posta' | 'Sms';
  code: string;
  description: string;
}

export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  { id: '1', name: 'Kullanıcı Ekleme', module: 'Kullanıcılar', type: 'E-Posta', code: 'adsoyad, eposta, sifre', description: 'Yeni kullanıcıya gönderilen bilgilendirme.' },
  { id: '2', name: 'Kullanıcı Düzenleme', module: 'Kullanıcılar', type: 'E-Posta', code: 'adsoyad, eposta, sifre', description: 'Hesap bilgileri güncellendiğinde.' },
  { id: '3', name: 'Şifremi Unuttum', module: 'Kullanıcılar', type: 'E-Posta', code: 'yenilemekodu, adsoyad', description: 'Şifre yenileme bağlantısı.' },
  { id: '4', name: 'Uygulama - Şifremi Unuttum', module: 'Kullanıcılar', type: 'E-Posta', code: 'adsoyad, dogrulamakodu', description: 'Uygulamadan şifre yenileme.' },
  { id: '5', name: 'Uygulama - Şifremi Unuttum', module: 'Kullanıcılar', type: 'Sms', code: 'adsoyad, dogrulamakodu', description: 'SMS ile şifre yenileme.' },
  { id: '6', name: 'Uygulama - Üyeliksiz Sipariş Telefon Doğrulama', module: 'Kullanıcılar', type: 'Sms', code: 'dogrulamakodu, adsoyad', description: 'Üyeliksiz siparişte telefon doğrulama.' },
  { id: '7', name: 'Uygulama - Yeni Kayıt Telefon Doğrulama', module: 'Kullanıcılar', type: 'Sms', code: 'adsoyad, dogrulamakodu', description: 'Yeni kayıt telefon doğrulama.' },
  { id: '8', name: 'Uygulama - Yeni Kayıt', module: 'Kullanıcılar', type: 'E-Posta', code: 'sifre, adsoyad', description: 'Yeni kayıt bilgilendirmesi.' },
  { id: '9', name: 'Müşteri Ekleme', module: 'Kullanıcılar', type: 'E-Posta', code: 'adsoyad, eposta, sifre', description: 'Yeni müşteriye geçici şifre.' },
  { id: '10', name: 'Müşteri Düzenleme', module: 'Kullanıcılar', type: 'E-Posta', code: 'adsoyad, eposta, sifre', description: 'Müşteri bilgileri güncellendiğinde.' },
];