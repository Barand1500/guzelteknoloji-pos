export const WORKSPACE_RESOURCES = [
  { key: 'products', label: 'Ürünler' },
  { key: 'brands', label: 'Markalar' },
  { key: 'categories', label: 'Kategoriler' },
  { key: 'attributes', label: 'Özellikler' },
  { key: 'deals', label: 'Fırsatlar' },
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
    description: 'Şeffaf görsellerin hangi sayfalarda zeminsiz gösterileceğini seçin.',
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
    description: 'İşletme ve iletişim bilgileri',
    fields: [
      { key: 'name', label: 'İşletme Adı' },
      { key: 'phone', label: 'Telefon' },
      { key: 'address', label: 'Adres' },
      { key: 'website', label: 'Web Sitesi' },
    ],
  },
  {
    key: 'smtp',
    title: 'SMTP',
    description: 'İşletmenin giden e-posta bağlantısı',
    fields: [
      { key: 'host', label: 'Sunucu' },
      { key: 'port', label: 'Port', type: 'port' },
      { key: 'secure', label: 'Doğrudan TLS (465)', type: 'boolean' },
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
      { key: 'host', label: 'Sunucu' },
      { key: 'port', label: 'Port', type: 'port' },
      { key: 'username', label: 'Kullanıcı Adı' },
      { key: 'password', label: 'Şifre', type: 'secret' },
    ],
  },
  {
    key: 'google',
    title: 'Google',
    description: 'İşletmeye ait Google bağlantısı',
    fields: [
      { key: 'clientId', label: 'İstemci Kimliği' },
      { key: 'clientSecret', label: 'İstemci Anahtarı', type: 'secret' },
    ],
  },
] as const;
export type SettingsPage = (typeof SETTINGS_PAGES)[number]['key'];
export interface SettingsResult {
  values: Record<string, string>;
  configured: string[];
  googleConnected?: boolean;
}
