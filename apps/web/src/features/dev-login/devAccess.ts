/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ GEÇİCİ — GERÇEK GİRİŞ HAZIR OLUNCA BU KLASÖR (features/dev-login) SİLİNİR. ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * "Test Kullanıcısı Olarak Devam Et" butonu, kimlik doğrulama yapmadan uygulama ekranlarını
 * görmek içindir. Sunucuya hiçbir yetki vermez; yalnızca tarayıcı sekmesinde bir işaret tutar
 * (sekme kapanınca biter). Kaldırırken: bu klasör, LoginPage'deki <DevLoginButton />,
 * RequireAccess içindeki `hasDevAccess` kullanımı ve AppShell'deki `revokeDevAccess` silinir.
 */
const KEY = 'gt-dev-access';

export const hasDevAccess = (): boolean => sessionStorage.getItem(KEY) === '1';
export const grantDevAccess = (): void => sessionStorage.setItem(KEY, '1');
export const revokeDevAccess = (): void => sessionStorage.removeItem(KEY);
