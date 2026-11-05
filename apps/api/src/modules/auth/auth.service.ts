import {
  CODE_LENGTH,
  normalizeEmail,
  type EmailStartResponse,
  type GoogleErrorCode,
  type LoginInput,
} from '@gt/shared';
import { randomInt } from 'node:crypto';
import { generateSessionToken, hashLoginCode, hashToken, safeEqualHex } from '../../lib/crypto';
import { HttpError } from '../../lib/http-error';
import type { Mailer } from '../../lib/mailer';
import type { PasswordHasher } from '../../lib/password';
import type { AuthRepository } from './auth.repository';
import type { GoogleClaims } from './google.client';
import type { IssuedSession, RequestMeta, SessionRecord, UserRecord } from './auth.types';

/** lastSeenAt her istekte değil, bu aralıktan seyrek güncellenir (gereksiz DB yazımı önlenir). */
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Kod kuralları: kısa ömürlü, tek kullanımlık, sınırlı deneme ve sınırlı gönderim. */
const CODE_TTL_SECONDS = 10 * 60;
const CODE_RESEND_SECONDS = 60;
const CODE_MAX_ATTEMPTS = 5;
const CODE_MAX_PER_HOUR = 5;

export const invalidCodeError = () =>
  // Kod yok / süresi dolmuş / yanlış / deneme hakkı bitmiş: hepsi için aynı mesaj.
  new HttpError(400, 'CODE_INVALID', 'Kod hatalı ya da süresi dolmuş.');

export class GoogleLoginError extends Error {
  constructor(public readonly code: GoogleErrorCode) {
    super(code);
    this.name = 'GoogleLoginError';
  }
}

export const invalidCredentialsError = () =>
  // Kullanıcı yok / şifre yanlış / hesap pasif durumlarında AYNI yanıt: hesap varlığı sızdırılmaz.
  new HttpError(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');

export interface AuthServiceDeps {
  repo: AuthRepository;
  hasher: PasswordHasher;
  mailer: Mailer;
  /** Kod özetlerini anahtarlamak için gizli değer (COOKIE_SECRET). */
  codeSecret: string;
  sessionTtlMs: number;
  now?: () => Date;
}

export class AuthService {
  private readonly repo: AuthRepository;
  private readonly hasher: PasswordHasher;
  private readonly mailer: Mailer;
  private readonly codeSecret: string;
  private readonly sessionTtlMs: number;
  private readonly now: () => Date;
  private dummyHash: Promise<string> | null = null;

  constructor(deps: AuthServiceDeps) {
    this.repo = deps.repo;
    this.hasher = deps.hasher;
    this.mailer = deps.mailer;
    this.codeSecret = deps.codeSecret;
    this.sessionTtlMs = deps.sessionTtlMs;
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * "E-Posta İle Devam Et" adım 1. Şifresi olan kayıtlı hesap → şifre adımı.
   * Aksi halde e-postaya kod gönderilir (kod adımı).
   * NOT: Bu uç nokta hesabın var olup olmadığını bilerek ayırt eder (ürün kararı);
   * kötüye kullanımı sıkı hız sınırı ve gönderim kotasıyla sınırlandırılır.
   */
  async startEmail(rawEmail: string, meta: RequestMeta): Promise<EmailStartResponse> {
    const email = normalizeEmail(rawEmail);
    if (await this.repo.findPasswordLogin(email)) return { step: 'password' };

    const now = this.now();
    const latest = await this.repo.findLatestLoginCode(email);
    if (latest && !latest.consumedAt && latest.expiresAt > now) {
      const elapsed = (now.getTime() - latest.createdAt.getTime()) / 1000;
      if (elapsed < CODE_RESEND_SECONDS) {
        // Bekleme süresi dolmadan yeniden gönderilmez; mevcut kod geçerlidir.
        return {
          step: 'code',
          resendAfterSeconds: Math.ceil(CODE_RESEND_SECONDS - elapsed),
          expiresInSeconds: Math.ceil((latest.expiresAt.getTime() - now.getTime()) / 1000),
        };
      }
    }

    const sentLastHour = await this.repo.countLoginCodesSince(
      email,
      new Date(now.getTime() - 60 * 60 * 1000),
    );
    if (sentLastHour >= CODE_MAX_PER_HOUR) {
      throw new HttpError(429, 'RATE_LIMITED', 'Çok fazla kod istendi. Lütfen daha sonra deneyin.');
    }

    // Kriptografik olarak güvenli rastgele 6 haneli kod (baştaki sıfırlar korunur).
    const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
    await this.repo.createLoginCode({
      email,
      codeHash: hashLoginCode(this.codeSecret, email, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_SECONDS * 1000),
      ipAddress: meta.ipAddress?.slice(0, 45) ?? null,
    });
    try {
      await this.mailer.sendLoginCode(email, code, CODE_TTL_SECONDS / 60);
    } catch {
      throw new HttpError(
        503,
        'EMAIL_UNAVAILABLE',
        'Doğrulama e-postası şu anda gönderilemiyor. Lütfen biraz sonra tekrar deneyin.',
      );
    }
    return {
      step: 'code',
      resendAfterSeconds: CODE_RESEND_SECONDS,
      expiresInSeconds: CODE_TTL_SECONDS,
    };
  }

  /** Kod doğru ise (e-posta sahipliği kanıtlanır) hesap yoksa oluşturulur ve oturum açılır. */
  async verifyEmailCode(
    rawEmail: string,
    code: string,
    meta: RequestMeta,
    previousToken?: string,
  ): Promise<IssuedSession> {
    const email = normalizeEmail(rawEmail);
    const now = this.now();
    const record = await this.repo.findLatestLoginCode(email);
    if (
      !record ||
      record.consumedAt ||
      record.expiresAt <= now ||
      record.attempts >= CODE_MAX_ATTEMPTS
    ) {
      throw invalidCodeError();
    }

    const expected = hashLoginCode(this.codeSecret, email, code);
    if (!safeEqualHex(record.codeHash, expected)) {
      await this.repo.incrementLoginCodeAttempts(record.id);
      throw invalidCodeError();
    }
    await this.repo.consumeLoginCode(record.id, now);

    let user = await this.repo.findUserByEmail(email);
    if (user) {
      if (user.status !== 'ACTIVE') throw invalidCodeError();
      if (!user.emailVerifiedAt) await this.repo.markEmailVerified(user.id, now);
    } else {
      user = await this.repo.createVerifiedUser({ email, emailVerifiedAt: now });
    }
    return this.rotateSession(user, meta, previousToken);
  }

  async loginWithPassword(
    input: LoginInput,
    meta: RequestMeta,
    previousToken?: string,
  ): Promise<IssuedSession> {
    const email = normalizeEmail(input.email);
    const record = await this.repo.findPasswordLogin(email);

    if (!record) {
      // Zamanlama saldırısıyla hesap varlığı anlaşılmasın diye sahte hash yine doğrulanır.
      await this.hasher.verify(await this.getDummyHash(), input.password);
      throw invalidCredentialsError();
    }

    const valid = await this.hasher.verify(record.passwordHash, input.password);
    if (!valid || record.user.status !== 'ACTIVE') throw invalidCredentialsError();

    return this.rotateSession(record.user, meta, previousToken);
  }

  /**
   * Google kimlik eşleştirme politikası (docs/auth-policy.md):
   * 1. (GOOGLE, sub) zaten bağlıysa o kullanıcı girer.
   * 2. Tarayıcıda aktif bir oturum varsa kimlik, oturumdaki kullanıcıya bağlanır (açık bağlama).
   * 3. E-posta Google tarafından doğrulanmamışsa reddedilir.
   * 4. Aynı e-postaya sahip hesap varsa OTOMATİK BİRLEŞTİRİLMEZ; kullanıcı önce
   *    e-postayla girip ardından Google ile devam ederek bağlamalıdır.
   * 5. Aksi halde yeni kullanıcı + kimlik oluşturulur.
   */
  async loginWithGoogle(
    claims: GoogleClaims,
    meta: RequestMeta,
    currentToken?: string,
  ): Promise<IssuedSession> {
    const now = this.now();
    const linkedUser = await this.repo.findUserByIdentity('GOOGLE', claims.sub);
    if (linkedUser) {
      if (linkedUser.status !== 'ACTIVE') throw new GoogleLoginError('google_dogrulama');
      await this.repo.touchIdentity('GOOGLE', claims.sub, now);
      return this.rotateSession(linkedUser, meta, currentToken);
    }

    const current = currentToken ? await this.getSession(currentToken) : null;
    if (current) {
      await this.repo.linkIdentity({
        userId: current.user.id,
        provider: 'GOOGLE',
        providerUserId: claims.sub,
        email: claims.email ? normalizeEmail(claims.email) : null,
      });
      return this.rotateSession(current.user, meta, currentToken);
    }

    if (!claims.email || !claims.emailVerified) {
      throw new GoogleLoginError('google_eposta_dogrulanmamis');
    }
    const email = normalizeEmail(claims.email);
    if (await this.repo.findUserByEmail(email)) {
      throw new GoogleLoginError('google_hesap_mevcut');
    }

    const user = await this.repo.createUserWithIdentity({
      email,
      emailVerifiedAt: now,
      displayName: claims.name?.slice(0, 120) ?? null,
      avatarUrl: claims.picture && claims.picture.length <= 2048 ? claims.picture : null,
      provider: 'GOOGLE',
      providerUserId: claims.sub,
    });
    return this.issueSession(user, meta);
  }

  async getSession(token: string): Promise<{ user: UserRecord; session: SessionRecord } | null> {
    const now = this.now();
    const found = await this.repo.findActiveSession(hashToken(token), now);
    if (!found || found.user.status !== 'ACTIVE') return null;

    if (now.getTime() - found.session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
      await this.repo.touchSession(found.session.id, now);
    }
    return found;
  }

  async logout(token: string): Promise<void> {
    await this.repo.revokeSessionByTokenHash(hashToken(token), this.now());
  }

  /** Session fixation'a karşı: girişte eski token iptal edilir ve her zaman yeni token üretilir. */
  private async rotateSession(user: UserRecord, meta: RequestMeta, previousToken?: string) {
    if (previousToken) await this.logout(previousToken);
    return this.issueSession(user, meta);
  }

  private async issueSession(user: UserRecord, meta: RequestMeta): Promise<IssuedSession> {
    const token = generateSessionToken();
    const expiresAt = new Date(this.now().getTime() + this.sessionTtlMs);
    await this.repo.createSession({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: meta.ipAddress?.slice(0, 45) ?? null,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
    });
    return { token, expiresAt, user };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(generateSessionToken());
    return this.dummyHash;
  }
}
