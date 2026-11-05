import { GOOGLE_ERROR_CODES, type GoogleErrorCode } from '@gt/shared';
import { ApiError, NetworkError } from '../../../lib/http';

export const NETWORK_ERROR_MESSAGE =
  'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';

export const GOOGLE_NOT_CONFIGURED_MESSAGE =
  'Google ile giriş şu anda kullanılamıyor. Lütfen E-Posta ile devam edin.';

export const APPLE_NOT_CONFIGURED_MESSAGE =
  'Apple ile giriş şu anda kullanılamıyor. Lütfen E-Posta ile devam edin.';

/** Kullanıcıya gösterilecek Türkçe hata metni. İç ayrıntılar asla gösterilmez. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) return NETWORK_ERROR_MESSAGE;
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'E-Posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
      case 'RATE_LIMITED':
        return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
      case 'CODE_INVALID':
        return 'Kod hatalı ya da süresi dolmuş. Lütfen kontrol edip tekrar deneyin.';
      case 'EMAIL_UNAVAILABLE':
        return 'Doğrulama e-postası şu anda gönderilemiyor. Lütfen biraz sonra tekrar deneyin.';
      case 'VALIDATION_ERROR':
        return error.message;
      case 'FORBIDDEN_ORIGIN':
        return 'Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar deneyin.';
      default:
        return 'Şu anda giriş yapılamıyor. Lütfen biraz sonra tekrar deneyin.';
    }
  }
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}

const googleMessages: Record<GoogleErrorCode, string> = {
  google_yapilandirilmamis: GOOGLE_NOT_CONFIGURED_MESSAGE,
  google_iptal: 'Google ile giriş iptal edildi.',
  google_dogrulama: 'Google ile giriş doğrulanamadı. Lütfen tekrar deneyin.',
  google_eposta_dogrulanmamis:
    'Google hesabınızın e-posta adresi doğrulanmamış. Doğruladıktan sonra tekrar deneyin.',
  apple_dogrulama: 'Apple ile giriş doğrulanamadı. Lütfen tekrar deneyin.',
  apple_hesap_mevcut: 'Bu e-posta ile bir hesap zaten var. E-posta yöntemiyle giriş yapın.',
  apple_yapilandirilmamis: APPLE_NOT_CONFIGURED_MESSAGE,
  google_sunucu: 'Şu anda giriş yapılamıyor. Lütfen biraz sonra tekrar deneyin.',
  google_hesap_mevcut:
    'Bu e-posta ile kayıtlı bir hesap zaten var. Güvenliğiniz için önce e-posta ve şifrenizle giriş yapın; ardından Google ile devam ederek hesabınızı bağlayabilirsiniz.',
};

export function googleErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return (GOOGLE_ERROR_CODES as readonly string[]).includes(code)
    ? googleMessages[code as GoogleErrorCode]
    : 'Giriş tamamlanamadı. Lütfen tekrar deneyin.';
}
