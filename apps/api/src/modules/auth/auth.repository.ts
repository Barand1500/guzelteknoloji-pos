import type { PrismaClient } from '../../lib/prisma';
import type {
  AuthProvider,
  LoginMethod,
  EmailCodeRecord,
  SessionRecord,
  UserRecord,
} from './auth.types';

/**
 * Veri erişim sözleşmesi. Servis bu arayüze bağımlıdır; böylece testler
 * veritabanı olmadan bellek içi uygulamayla çalışabilir.
 */
export interface AuthRepository {
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findPasswordLogin(email: string): Promise<{ user: UserRecord; passwordHash: string } | null>;
  findUserByIdentity(provider: AuthProvider, providerUserId: string): Promise<UserRecord | null>;
  createUserWithIdentity(data: {
    email: string;
    emailVerifiedAt: Date;
    displayName: string | null;
    avatarUrl: string | null;
    provider: AuthProvider;
    providerUserId: string;
  }): Promise<UserRecord>;
  linkIdentity(data: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    email: string | null;
  }): Promise<void>;
  touchIdentity(provider: AuthProvider, providerUserId: string, at: Date): Promise<void>;
  createSession(data: {
    userId: string;
    loginMethod: LoginMethod;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<SessionRecord>;
  findActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<{ session: SessionRecord; user: UserRecord } | null>;
  touchSession(sessionId: string, at: Date): Promise<void>;
  revokeSessionByTokenHash(tokenHash: string, at: Date): Promise<void>;
  /** E-posta kodu akışı: kod kaydı en yeni olandan okunur. */
  findLatestLoginCode(email: string): Promise<EmailCodeRecord | null>;
  countLoginCodesSince(email: string, since: Date): Promise<number>;
  createLoginCode(data: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    ipAddress: string | null;
  }): Promise<EmailCodeRecord>;
  incrementLoginCodeAttempts(id: string): Promise<void>;
  consumeLoginCode(id: string, at: Date): Promise<void>;
  /** Kod doğrulanınca hesap yoksa oluşturulur (e-posta kanıtlanmıştır). */
  createVerifiedUser(data: { email: string; emailVerifiedAt: Date }): Promise<UserRecord>;
  markEmailVerified(userId: string, at: Date): Promise<void>;
  /** Yalnızca geliştirme seed betiği tarafından kullanılır. */
  upsertPasswordUser(data: {
    email: string;
    passwordHash: string;
    displayName: string | null;
  }): Promise<UserRecord>;
}

const userSelect = {
  id: true,
  email: true,
  emailVerifiedAt: true,
  displayName: true,
  avatarUrl: true,
  status: true,
} as const;

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserById(id: string) {
    return this.db.user.findUnique({ where: { id }, select: userSelect });
  }

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email }, select: userSelect });
  }

  async findPasswordLogin(email: string) {
    const row = await this.db.user.findUnique({
      where: { email },
      select: { ...userSelect, passwordCredential: { select: { passwordHash: true } } },
    });
    if (!row?.passwordCredential) return null;
    const { passwordCredential, ...user } = row;
    return { user, passwordHash: passwordCredential.passwordHash };
  }

  async findUserByIdentity(provider: AuthProvider, providerUserId: string) {
    const identity = await this.db.authIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      select: { user: { select: userSelect } },
    });
    return identity?.user ?? null;
  }

  createUserWithIdentity(data: Parameters<AuthRepository['createUserWithIdentity']>[0]) {
    return this.db.user.create({
      data: {
        email: data.email,
        emailVerifiedAt: data.emailVerifiedAt,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        identities: {
          create: {
            provider: data.provider,
            providerUserId: data.providerUserId,
            email: data.email,
            lastUsedAt: new Date(),
          },
        },
      },
      select: userSelect,
    });
  }

  async linkIdentity(data: Parameters<AuthRepository['linkIdentity']>[0]) {
    await this.db.authIdentity.create({ data: { ...data, lastUsedAt: new Date() } });
  }

  async touchIdentity(provider: AuthProvider, providerUserId: string, at: Date) {
    await this.db.authIdentity.update({
      where: { provider_providerUserId: { provider, providerUserId } },
      data: { lastUsedAt: at },
    });
  }

  createSession(data: Parameters<AuthRepository['createSession']>[0]) {
    return this.db.$transaction(async (tx) => {
      const session = await tx.session.create({
        data,
        select: { id: true, userId: true, expiresAt: true, lastSeenAt: true },
      });
      await tx.user.update({
        where: { id: data.userId },
        data: { lastLoginMethod: data.loginMethod, lastLoginAt: new Date() },
      });
      return session;
    });
  }

  async findActiveSession(tokenHash: string, now: Date) {
    const row = await this.db.session.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        lastSeenAt: true,
        user: { select: userSelect },
      },
    });
    if (!row) return null;
    const { user, ...session } = row;
    return { session, user };
  }

  async touchSession(sessionId: string, at: Date) {
    await this.db.session.update({ where: { id: sessionId }, data: { lastSeenAt: at } });
  }

  async revokeSessionByTokenHash(tokenHash: string, at: Date) {
    await this.db.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  findLatestLoginCode(email: string) {
    return this.db.emailLoginCode.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        codeHash: true,
        expiresAt: true,
        attempts: true,
        consumedAt: true,
        createdAt: true,
      },
    });
  }

  countLoginCodesSince(email: string, since: Date) {
    return this.db.emailLoginCode.count({ where: { email, createdAt: { gte: since } } });
  }

  createLoginCode(data: Parameters<AuthRepository['createLoginCode']>[0]) {
    return this.db.emailLoginCode.create({
      data,
      select: {
        id: true,
        email: true,
        codeHash: true,
        expiresAt: true,
        attempts: true,
        consumedAt: true,
        createdAt: true,
      },
    });
  }

  async incrementLoginCodeAttempts(id: string) {
    await this.db.emailLoginCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async consumeLoginCode(id: string, at: Date) {
    await this.db.emailLoginCode.update({ where: { id }, data: { consumedAt: at } });
  }

  createVerifiedUser(data: Parameters<AuthRepository['createVerifiedUser']>[0]) {
    return this.db.user.create({ data, select: userSelect });
  }

  async markEmailVerified(userId: string, at: Date) {
    await this.db.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: at },
    });
  }

  upsertPasswordUser(data: Parameters<AuthRepository['upsertPasswordUser']>[0]) {
    return this.db.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        displayName: data.displayName,
        passwordCredential: { create: { passwordHash: data.passwordHash } },
      },
      update: {
        passwordCredential: {
          upsert: {
            create: { passwordHash: data.passwordHash },
            update: { passwordHash: data.passwordHash },
          },
        },
      },
      select: userSelect,
    });
  }
}
