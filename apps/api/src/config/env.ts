import { z } from 'zod';
import path from 'node:path';

const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    /** Kullanıcının tarayıcıda açtığı web uygulamasının origin'i (ör. https://site.com). */
    APP_URL: z.url().transform((v) => new URL(v).origin),
    /** Ayrı domain dağıtımında API'ye istek atabilecek ek originler (virgülle ayrılmış). */
    CORS_ORIGINS: optionalString,

    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL zorunludur.')
      .refine((v) => v.startsWith('mysql://') || v.startsWith('mariadb://'), {
        message: 'DATABASE_URL mysql:// ile başlamalıdır.',
      }),
    /** Kalıcı görseller için dizin; production ortamında mutlak yol önerilir. */
    UPLOADS_DIR: z.string().trim().min(1).default('../../uploads'),

    /** OAuth akış cookie'sini imzalamak için kullanılır. */
    COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET en az 32 karakter olmalıdır.'),
    COOKIE_DOMAIN: optionalString,
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    /** Reverse proxy (CloudPanel/Nginx) arkasında gerçek istemci IP'si için hop sayısı. */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    APPLE_CLIENT_ID: optionalString,
    APPLE_CLIENT_SECRET: optionalString,
    APPLE_REDIRECT_URI: z.url().optional(),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    GOOGLE_REDIRECT_URI: z.url().optional(),
    ROBOT_PROVIDER: z.enum(['none', 'cloudflare', 'recaptcha']).optional(),
    TURNSTILE_SITE_KEY: optionalString,
    TURNSTILE_SECRET_KEY: optionalString,
    RECAPTCHA_SITE_KEY: optionalString,
    RECAPTCHA_SECRET_KEY: optionalString,

    /** Giriş kodu e-postaları için SMTP. Geliştirmede boşsa kod API konsoluna yazılır. */
    SMTP_HOST: optionalString,
    IMAP_HOST: optionalString,
    IMAP_PORT: z.coerce.number().int().min(1).max(65535).default(993),
    IMAP_USER: optionalString,
    IMAP_PASS: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    /** true: doğrudan TLS (genelde 465). false: STARTTLS (genelde 587). */
    SMTP_SECURE: booleanish.optional(),
    /**
     * Kendinden imzalı sertifika kullanan SMTP sunucusu için, o sertifikanın PEM dosyası.
     * Doğrulama KAPATILMAZ; yalnızca bu sertifika ek olarak güvenilir sayılır (sertifika sabitleme).
     */
    SMTP_TLS_CA_FILE: optionalString,
    /**
     * Yardım penceresinde gömülen destek formunun adresi (web ile AYNI değişken; kök .env'den okunur).
     * Buradan türetilen origin, CSP `frame-src` kuralına eklenir; yoksa iframe'e izin verilmez.
     */
    VITE_SUPPORT_FORM_URL: optionalString,
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    /** Gönderen adresi, ör. Güzel Teknoloji <destek@guzelteknoloji.com> */
    MAIL_FROM: optionalString,
    SMTP_FROM: optionalString,

    /** Giriş sonrası yönlendirilecek web yolu. */
    POST_LOGIN_PATH: z.string().startsWith('/').default('/login'),
    /** Derlenmiş web uygulaması klasörü; verilirse API aynı origin'den SPA'yı da sunar. */
    WEB_DIST_DIR: optionalString,
    RATE_LIMIT_ENABLED: booleanish.optional(),
  })
  .superRefine((env, ctx) => {
    const provider = env.ROBOT_PROVIDER;
    if (provider && provider !== 'none') {
      const keys =
        provider === 'cloudflare'
          ? [env.TURNSTILE_SITE_KEY, env.TURNSTILE_SECRET_KEY]
          : [env.RECAPTCHA_SITE_KEY, env.RECAPTCHA_SECRET_KEY];
      if (keys.some((key) => !key))
        ctx.addIssue({
          code: 'custom',
          path: ['ROBOT_PROVIDER'],
          message: 'Seçilen robot doğrulamasının site ve gizli anahtarını birlikte tanımlayın.',
        });
    }
    if (env.NODE_ENV === 'production' && !path.isAbsolute(env.UPLOADS_DIR)) {
      ctx.addIssue({
        code: 'custom',
        path: ['UPLOADS_DIR'],
        message: 'Production ortamında UPLOADS_DIR mutlak bir yol olmalıdır.',
      });
    }
    if (Boolean(env.APPLE_CLIENT_ID) !== Boolean(env.APPLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['APPLE_CLIENT_SECRET'],
        message: 'APPLE_CLIENT_ID ve APPLE_CLIENT_SECRET birlikte tanımlanmalıdır.',
      });
    }
    const hasId = Boolean(env.GOOGLE_CLIENT_ID);
    const hasSecret = Boolean(env.GOOGLE_CLIENT_SECRET);
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET birlikte tanımlanmalıdır.',
      });
    }
    if (env.SMTP_HOST && !env.MAIL_FROM && !env.SMTP_FROM) {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_FROM'],
        message: 'SMTP_HOST tanımlıysa MAIL_FROM da tanımlanmalıdır.',
      });
    }
    if (env.NODE_ENV === 'production' && !env.APP_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'Production ortamında APP_URL https olmalıdır.',
      });
    }
  });

export type RawEnv = z.infer<typeof envSchema>;

export interface Env extends RawEnv {
  isProduction: boolean;
  allowedOrigins: string[];
  /** Gömülü destek formunun origin'i (CSP frame-src) veya null. */
  supportFormOrigin: string | null;
  rateLimitEnabled: boolean;
  apple: { clientId: string; clientSecret: string; redirectUri: string } | null;
  google: { clientId: string; clientSecret: string; redirectUri: string } | null;
  imap: { host: string; port: number; user: string; pass: string } | null;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string | undefined;
    pass: string | undefined;
    from: string;
    caFile: string | undefined;
  } | null;
}

/** Yalnızca https adresler kabul edilir; geçersizse form çerçevelenemez (null). */
function supportFormOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const missing = issue.code === 'invalid_type' && issue.message.includes('undefined');
        const message = missing ? 'zorunlu değişken tanımlı değil.' : issue.message;
        return `  - ${issue.path.join('.') || '(kök)'}: ${message}`;
      })
      .join('\n');
    throw new Error(`Geçersiz ortam değişkenleri:\n${details}`);
  }
  const env = { ...result.data, MAIL_FROM: result.data.MAIL_FROM ?? result.data.SMTP_FROM };
  const extraOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => new URL(o).origin);

  return {
    ...env,
    isProduction: env.NODE_ENV === 'production',
    supportFormOrigin: supportFormOrigin(env.VITE_SUPPORT_FORM_URL),
    allowedOrigins: [...new Set([env.APP_URL, ...extraOrigins])],
    rateLimitEnabled: env.RATE_LIMIT_ENABLED ?? env.NODE_ENV !== 'test',
    imap:
      env.IMAP_HOST && env.IMAP_USER && env.IMAP_PASS
        ? { host: env.IMAP_HOST, port: env.IMAP_PORT, user: env.IMAP_USER, pass: env.IMAP_PASS }
        : null,
    smtp:
      env.SMTP_HOST && env.MAIL_FROM
        ? {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
            from: env.MAIL_FROM,
            caFile: env.SMTP_TLS_CA_FILE,
          }
        : null,
    apple:
      env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
        ? {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret: env.APPLE_CLIENT_SECRET,
            redirectUri: env.APPLE_REDIRECT_URI ?? `${env.APP_URL}/api/auth/apple/callback`,
          }
        : null,
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            redirectUri: env.GOOGLE_REDIRECT_URI ?? `${env.APP_URL}/api/auth/google/callback`,
          }
        : null,
  };
}
