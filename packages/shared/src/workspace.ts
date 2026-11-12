export const WORKSPACE_RESOURCES = [
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
    description: 'İşletme, iletişim ve site bilgileri',
    fields: [
      { key: 'name', label: 'İşletme Adı' },
      { key: 'phone', label: 'Telefon / GSM' },
      { key: 'address', label: 'Adres' },
      { key: 'website', label: 'Site URL' },
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
}
