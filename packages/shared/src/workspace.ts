export const WORKSPACE_RESOURCES = [
  { key: 'dashboard', label: 'Ana Sayfa' },
  { key: 'orders', label: 'Siparişler ve İadeler' },
  { key: 'customers', label: 'Müşteriler' },
  { key: 'products', label: 'Ürünler' },
  { key: 'brands', label: 'Markalar' },
  { key: 'categories', label: 'Kategoriler' },
  { key: 'attributes', label: 'Özellikler' },
  { key: 'deals', label: 'Fırsatlar' },
  { key: 'campaigns', label: 'Kampanyalar' },
  { key: 'notifications', label: 'Bildirimler' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'roles', label: 'Roller' },
  { key: 'settings', label: 'Ayarlar' },
  { key: 'logs', label: 'Log Kayıtları' },
] as const;
export type WorkspaceResource = (typeof WORKSPACE_RESOURCES)[number]['key'];
export type PermissionAction = 'read' | 'save' | 'delete';
export interface RolePermission {
  resource: WorkspaceResource;
  read: boolean;
  save: boolean;
  delete: boolean;
}
export interface WorkspaceContext {
  hasPassword?: boolean;
  business: { id: number; name: string };
  user: { id: number; name: string | null; email: string | null };
  owner: boolean;
  permissions: RolePermission[];
  imageAppearance?: Record<string, string>;
}
export interface WorkspaceRole {
  id: number;
  name: string;
  permissions: RolePermission[];
  users: number;
}
export interface WorkspaceMember {
  id: number;
  name: string;
  email: string;
  roleId: number | null;
  roleName: string;
  owner: boolean;
  active: boolean;
  pending: boolean;
}
export interface WorkspaceLog {
  id: number;
  user: string;
  section: string;
  action: string;
  target: string | null;
  time: string;
  status: string;
  changes: { field: string; before: string | null; after: string | null }[];
}
export const SETTINGS_PAGES = [
  {
    key: 'images',
    title: 'Görsel Ayarları',
    description: 'Görsellerin beyaz arka planının hangi sayfalarda temizleneceğini seçin.',
    fields: [
      { key: 'products', label: 'Ürünlerde Şeffaf Zemin', type: 'boolean' },
      { key: 'brands', label: 'Markalarda Şeffaf Zemin', type: 'boolean' },
      { key: 'categories', label: 'Kategorilerde Şeffaf Zemin', type: 'boolean' },
      { key: 'attributes', label: 'Özelliklerde Şeffaf Zemin', type: 'boolean' },
    ],
  },
  {
    key: 'general',
    title: 'Genel Ayarlar',
    description: 'Sistem kimliği, çalışma şekli ve bayi sözleşmesi',
    fields: [
      { key: 'name', label: 'Sistem Adı' },
      { key: 'webAdresi', label: 'Web Adresi' },
      { key: 'calismaSekli', label: 'Çalışma Şekli' },
      { key: 'acilisTarihi', label: 'Sistem Açılış Tarihi' },
      { key: 'binListesiUrl', label: 'BIN Listesi Linki' },
      { key: 'bayiSozlesmesi', label: 'Bayi Sözleşmesi' },
      { key: 'bayiSozlesmesiAdi', label: 'Bayi Sözleşmesi Dosya Adı' },
      { key: 'phone', label: 'Telefon / GSM' },
      { key: 'address', label: 'Adres' },
      { key: 'website', label: 'Sistem Adresi' },
      { key: 'iletisimEposta', label: 'İletişim E-postası' },
      { key: 'siteEposta', label: 'Site E-posta' },
      { key: 'firmaEposta', label: 'Firma E-posta' },
    ],
  },
  {
    key: 'smtp',
    title: 'SMTP',
    description: 'İşletmenin giden e-posta bağlantısı',
    fields: [
      { key: 'enabled', label: 'SMTP bağlantısı', type: 'boolean' },
      { key: 'host', label: 'Sunucu' },
      { key: 'port', label: 'Port', type: 'port' },
      { key: 'secure', label: 'Doğrudan TLS (465)', type: 'boolean' },
      {
        key: 'allowInvalidCertificate',
        label: 'Geçersiz TLS Sertifikasına İzin Ver',
        type: 'boolean',
      },
      { key: 'username', label: 'Kullanıcı Adı' },
      { key: 'password', label: 'Şifre', type: 'secret' },
      { key: 'from', label: 'Gönderen E-posta' },
      { key: 'bildirimEposta', label: 'Bildirim E-Posta Adresleri' },
    ],
  },
  {
    key: 'imap',
    title: 'IMAP',
    description: 'İşletmenin gelen e-posta bağlantısı',
    fields: [
      { key: 'enabled', label: 'IMAP bağlantısı', type: 'boolean' },
      { key: 'host', label: 'Sunucu' },
      { key: 'port', label: 'Port', type: 'port' },
      {
        key: 'allowInvalidCertificate',
        label: 'Geçersiz TLS Sertifikasına İzin Ver',
        type: 'boolean',
      },
      { key: 'username', label: 'Kullanıcı Adı' },
      { key: 'password', label: 'Şifre', type: 'secret' },
    ],
  },
  {
    key: 'google',
    title: 'Google',
    description: 'İşletmeye ait Google bağlantısı',
    fields: [
      { key: 'enabled', label: 'Google bağlantısı', type: 'boolean' },
      { key: 'clientId', label: 'İstemci Kimliği' },
      { key: 'clientSecret', label: 'İstemci Anahtarı', type: 'secret' },
    ],
  },
  {
    key: 'cloudflare',
    title: 'Cloudflare Turnstile',
    description: 'İşletmedeki kullanıcıların e-posta ile girişini robot isteklerine karşı korur.',
    fields: [
      { key: 'enabled', label: 'Doğrulamayı Etkinleştir', type: 'boolean' },
      { key: 'siteKey', label: 'Site Key' },
      { key: 'secretKey', label: 'Secret Key', type: 'secret' },
    ],
  },
  {
    key: 'recaptcha',
    title: 'Google reCAPTCHA',
    description: 'Google reCAPTCHA v2 “Ben robot değilim” doğrulaması.',
    fields: [
      { key: 'enabled', label: 'Doğrulamayı Etkinleştir', type: 'boolean' },
      { key: 'siteKey', label: 'Site Key' },
      { key: 'secretKey', label: 'Secret Key', type: 'secret' },
    ],
  },
  {
    key: 'whatsapp',
    title: 'Meta WhatsApp Cloud API',
    description: 'Meta hesabınıza ait WhatsApp bağlantısı ve mesajlaşma ayarları.',
    fields: [
      { key: 'enabled', label: 'WhatsApp Entegrasyonunu Etkinleştir', type: 'boolean' },
      { key: 'appId', label: 'Meta Uygulama Kimliği' },
      { key: 'appSecret', label: 'Uygulama Gizli Anahtarı', type: 'secret' },
      { key: 'phoneNumberId', label: 'Telefon Numarası Kimliği' },
      { key: 'accessToken', label: 'Erişim Belirteci', type: 'secret' },
      { key: 'verifyToken', label: 'Webhook Doğrulama Belirteci', type: 'secret' },
    ],
  },
  {
    key: 'sms',
    title: 'SMS',
    description: 'Netgsm üzerinden bildirim SMS’leri.',
    fields: [
      { key: 'enabled', label: 'SMS Entegrasyonunu Etkinleştir', type: 'boolean' },
      { key: 'apiUrl', label: 'API Adresi' },
      { key: 'username', label: 'API Kullanıcı Adı' },
      { key: 'password', label: 'API Parolası', type: 'secret' },
      { key: 'sender', label: 'Gönderici Başlığı' },
      { key: 'sanalNumara', label: 'Sanal Numara' },
      { key: 'bildirimNumara', label: 'Bildirim Numaraları' },
      { key: 'testNumber', label: 'Test Telefon Numarası' },
    ],
  },
  {
    key: 'site_iletisim',
    title: 'İletişim Bilgileri',
    description: 'İşletme iletişim bilgileri ve sosyal bağlantılar',
    fields: [
      { key: 'unvan', label: 'Ünvan' },
      { key: 'tip', label: 'Tip' },
      { key: 'vergiNo', label: 'Vergi Numarası' },
      { key: 'vergiDairesi', label: 'Vergi Dairesi' },
      { key: 'adres', label: 'Adres' },
      { key: 'eposta', label: 'E-Posta' },
      { key: 'telefon', label: 'Telefon' },
      { key: 'gsm', label: 'Gsm' },
      { key: 'fax', label: 'Fax' },
      { key: 'harita', label: 'Harita Iframe Kodu' },
      { key: 'yolTarifi', label: 'Yol Tarifi Linki' },
      { key: 'facebook', label: 'Facebook Linki' },
      { key: 'x', label: 'X Linki' },
      { key: 'instagram', label: 'Instagram Linki' },
      { key: 'youtube', label: 'Youtube Linki' },
      { key: 'pinterest', label: 'Pinterest Linki' },
      { key: 'subeler', label: 'Şubeler' },
    ],
  },
  {
    key: 'site_sms_sablonlari',
    title: 'SMS Şablonları',
    description: 'Hazır SMS metinleri',
    fields: [{ key: 'sablonlar', label: 'Şablonlar' }],
  },
  {
    key: 'site_eposta_sablonlari',
    title: 'E-Posta Şablonları',
    description: 'E-posta şablon adları, konuları ve içerikleri',
    fields: [{ key: 'sablonlar', label: 'Şablonlar' }],
  },
  {
    key: 'site_menu',
    title: 'Menü Blokları',
    description: 'Alt menü blok başlıkları',
    fields: [
      { key: 'alt1', label: '1. Alt Menü Blok Adı' },
      { key: 'alt2', label: '2. Alt Menü Blok Adı' },
      { key: 'alt3', label: '3. Alt Menü Blok Adı' },
    ],
  },
  {
    key: 'site_system',
    title: 'Site Sistem Ayarları',
    description: 'Bildirimler, özel kodlar, uygulama linkleri ve istatistik',
    fields: [
      { key: 'head', label: 'Head Kodu' },
      { key: 'body', label: 'Body Kodu' },
      { key: 'kod3', label: 'Etbis Kodu' },
      { key: 'kod4', label: 'TR Güvenlik Damgası Kodu' },
      { key: 'store', label: 'App Store Linki' },
      { key: 'play2', label: 'App Store MacOS Linki' },
      { key: 'play1', label: 'Google Play Linki' },
      { key: 'link4', label: 'Windows Store Linki' },
      { key: 'istatistik', label: 'İstatistik Kodu' },
    ],
  },
  {
    key: 'site_appearance',
    title: 'Site Görünüm Ayarları',
    description: 'Renk, görsel davranışı ve sistem seçenekleri',
    fields: [
      { key: 'color', label: 'Uygulama Ana Rengi' },
      { key: 'shape', label: 'Resim Gösterim Şekli' },
      { key: 'fit', label: 'Resim Boyutlandırma Şekli' },
      { key: 'logoId', label: 'Logo Görseli' },
      { key: 'faviconId', label: 'Favicon Görseli' },
      { key: 'popupId', label: 'Popup Görseli' },
      { key: 'popupLink', label: 'Popup Link' },
      { key: 'campaignId', label: 'Üst Kampanya Görseli' },
      { key: 'campaignLink', label: 'Üst Kampanya Linki' },
      { key: 'kargoHesaplanmasin', label: 'Kargo Hesaplanmasın', type: 'boolean' },
      { key: 'kdvDahilSat', label: 'KDV Dahil Sat', type: 'boolean' },
      { key: 'satisParaBirimiSite', label: 'Satış Para Birimi Site Geneli', type: 'boolean' },
      { key: 'katalogFiyat', label: 'Katalog Modu Fiyat Gösterimi', type: 'boolean' },
      { key: 'sanalPos', label: 'Sanal POS Hedef Kullanımı', type: 'boolean' },
      { key: 'googleGiris', label: 'Google Giriş', type: 'boolean' },
      { key: 'appleGiris', label: 'Apple Giriş', type: 'boolean' },
      { key: 'dinamikFiltre', label: 'Dinamik Filtre Gösterimi', type: 'boolean' },
      { key: 'serbestOdeme', label: 'Serbest Ödeme', type: 'boolean' },
      { key: 'krediYukleme', label: 'Kredi Yükleme', type: 'boolean' },
      { key: 'tumKampanyalar', label: 'Tüm Kampanyalar Anasayfada', type: 'boolean' },
      { key: 'karMarji', label: 'Kar Marjı', type: 'boolean' },
      { key: 'b2cBayilik', label: 'B2C Bayilik Başvuru', type: 'boolean' },
    ],
  },
  {
    key: 'site_defaults',
    title: 'Site Varsayılanları',
    description: 'Ürün, müşteri ve sistem varsayılanları',
    fields: [
      { key: 'kategori', label: 'Kategori' },
      { key: 'marka', label: 'Marka' },
      { key: 'stokTipi', label: 'Stok Tipi' },
      { key: 'alisParaBirimi', label: 'Alış Para Birimi' },
      { key: 'birim', label: 'Birim' },
      { key: 'paraBirimi', label: 'Para Birimi' },
      { key: 'kdv', label: 'KDV Oranı' },
      { key: 'kdvDahil', label: 'KDV Dahil', type: 'boolean' },
      { key: 'iadeGun', label: 'İade/Değişim Zamanı (Gün)' },
      { key: 'stokYok', label: 'Stok Olmama Yazısı' },
      { key: 'stokYokGorselId', label: 'Stok Olmama Görseli' },
      { key: 'cariTipi', label: 'Cari Tipi' },
      { key: 'fiyatTanimi', label: 'Fiyat Tanımı' },
      { key: 'fiyatSecimi', label: 'Fiyat Seçimi' },
      { key: 'musteriTipi', label: 'Müşteri Tipi' },
      { key: 'vergiDairesi', label: 'Vergi Dairesi' },
      { key: 'ulke', label: 'Ülke' },
      { key: 'stokGosterimi', label: 'Stok Gösterimi' },
      { key: 'satisParaBirimi', label: 'Satış Para Birimi' },
      { key: 'girisYonlendirme', label: 'Giriş Yönlendirme Adresi' },
    ],
  },
  {
    key: 'site_header',
    title: 'Site Header Yazısı',
    description: 'Sitenin üst bölümünde görünen header yazısı',
    fields: [{ key: 'text', label: 'Yazı' }],
  },
  {
    key: 'site_erp',
    title: 'ERP Entegrasyonu',
    description: 'Harici ERP bağlantı bilgileri',
    fields: [
      { key: 'enabled', label: 'ERP entegrasyonu', type: 'boolean' },
      { key: 'apiUrl', label: 'API URL' },
      { key: 'server', label: 'Sunucu' },
      { key: 'database', label: 'Veritabanı' },
      { key: 'username', label: 'Kullanıcı Adı' },
      { key: 'password', label: 'Şifre', type: 'secret' },
    ],
  },
  {
    key: 'site_xml',
    title: 'Google & Meta XML',
    description: 'Ürün kataloğu feed durumu',
    fields: [
      { key: 'enabled', label: 'XML feed', type: 'boolean' },
      { key: 'productUrlTemplate', label: 'Ürün URL şablonu' },
    ],
  },
] as const;
export type SettingsPage = (typeof SETTINGS_PAGES)[number]['key'];
export interface ChallengeConfig {
  provider: 'cloudflare' | 'recaptcha';
  siteKey: string;
}
export interface SettingsResult {
  values: Record<string, string>;
  configured: string[];
  googleConnected?: boolean;
  source?: 'database' | 'environment' | 'unconfigured';
  feedUrl?: string;
}

/** Formlar için gerekli, yönetim alanlarını içermeyen işletme tanımlamaları. */
export interface CommerceChoices {
  customerTypes: { id: string; name: string }[];
  priceLists: { id: string; name: string }[];
  payments: { id: string; name: string }[];
}
