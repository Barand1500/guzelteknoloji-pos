import { z } from 'zod';

/**
 * E-posta normalizasyonu: baştaki/sondaki boşluklar atılır ve tamamı küçük harfe çevrilir.
 * Gmail'deki nokta/“+etiket” gibi sağlayıcıya özgü kurallar bilinçli olarak UYGULANMAZ;
 * aksi halde farklı kişilere ait adresler yanlışlıkla aynı hesap sayılabilir.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const PASSWORD_MAX_LENGTH = 256;

const emailField = z
  .string({ error: 'E-posta adresinizi girin.' })
  .trim()
  .min(1, 'E-posta adresinizi girin.')
  .max(254, 'E-posta adresi çok uzun.')
  .pipe(z.email({ error: 'Geçerli bir e-posta adresi girin.' }));

/** Adım 1: yalnızca e-posta. Sunucu hesabın durumuna göre sonraki adımı söyler. */
export const emailStartSchema = z.object({ email: emailField });
export type EmailStartInput = z.infer<typeof emailStartSchema>;

export const CODE_LENGTH = 6;

/** E-postaya gönderilen tek kullanımlık doğrulama kodu. */
export const emailVerifySchema = z.object({
  email: emailField,
  code: z
    .string({ error: 'Doğrulama kodunu girin.' })
    .trim()
    .regex(new RegExp('^\\d{' + CODE_LENGTH + '}$'), `Kod ${CODE_LENGTH} haneli olmalıdır.`),
});
export type EmailVerifyInput = z.infer<typeof emailVerifySchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: 'Şifrenizi girin.' })
    .min(1, 'Şifrenizi girin.')
    // Aşırı uzun girdilerle hash maliyetini şişirme (DoS) denemelerini engeller.
    .max(PASSWORD_MAX_LENGTH, 'Şifre çok uzun.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface MeResponse {
  user: PublicUser;
}

export interface ProvidersResponse {
  google: boolean;
  apple: boolean;
}

/**
 * "E-Posta ile Devam Et" akışının sonraki adımı:
 *  - password: hesap kayıtlı ve şifresi var → şifre sorulur
 *  - code: hesap yok (ya da şifresi yok) → e-postaya kod gönderildi
 */
export type EmailStartResponse =
  { step: 'password' } | { step: 'code'; resendAfterSeconds: number; expiresInSeconds: number };

/** API'nin döndürdüğü makine-okunur hata kodları; kullanıcı metni ön yüzde üretilir. */
export const API_ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'CODE_INVALID',
  'EMAIL_UNAVAILABLE',
  'UNAUTHENTICATED',
  'FORBIDDEN_ORIGIN',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'CONFLICT',
  'FORBIDDEN',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

/** Sosyal giriş callback'inin /login'e yönlendirirken eklediği `hata` parametresi değerleri. */
export const GOOGLE_ERROR_CODES = [
  'google_yapilandirilmamis',
  'google_iptal',
  'google_dogrulama',
  'google_eposta_dogrulanmamis',
  'google_hesap_mevcut',
  'google_sunucu',
  'apple_yapilandirilmamis',
  'apple_dogrulama',
  'apple_hesap_mevcut',
] as const;
export type GoogleErrorCode = (typeof GOOGLE_ERROR_CODES)[number];
