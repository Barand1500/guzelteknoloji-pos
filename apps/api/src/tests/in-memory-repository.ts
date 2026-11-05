import { randomUUID } from 'node:crypto';
import type { AuthRepository } from '../modules/auth/auth.repository';
import type {
  AuthProvider,
  EmailCodeRecord,
  SessionRecord,
  UserRecord,
} from '../modules/auth/auth.types';

interface StoredSession extends SessionRecord {
  tokenHash: string;
  revokedAt: Date | null;
}

/** Testler için AuthRepository'nin bellek içi uygulaması (Prisma davranışını taklit eder). */
export class InMemoryAuthRepository implements AuthRepository {
  users = new Map<string, UserRecord>();
  passwords = new Map<string, string>();
  identities: { userId: string; provider: AuthProvider; providerUserId: string }[] = [];
  sessions: StoredSession[] = [];
  codes: EmailCodeRecord[] = [];

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }

  async findPasswordLogin(email: string) {
    const user = await this.findUserByEmail(email);
    const passwordHash = user ? this.passwords.get(user.id) : undefined;
    return user && passwordHash ? { user, passwordHash } : null;
  }

  async findUserByIdentity(provider: AuthProvider, providerUserId: string) {
    const identity = this.identities.find(
      (i) => i.provider === provider && i.providerUserId === providerUserId,
    );
    return identity ? (this.users.get(identity.userId) ?? null) : null;
  }

  async createUserWithIdentity(data: Parameters<AuthRepository['createUserWithIdentity']>[0]) {
    if (await this.findUserByEmail(data.email)) throw new Error('unique: email');
    const user = this.addUser({
      email: data.email,
      emailVerifiedAt: data.emailVerifiedAt,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    });
    this.identities.push({
      userId: user.id,
      provider: data.provider,
      providerUserId: data.providerUserId,
    });
    return user;
  }

  async linkIdentity(data: Parameters<AuthRepository['linkIdentity']>[0]) {
    if (await this.findUserByIdentity(data.provider, data.providerUserId)) {
      throw new Error('unique: identity');
    }
    this.identities.push(data);
  }

  async touchIdentity() {}

  async createSession(data: Parameters<AuthRepository['createSession']>[0]) {
    const session: StoredSession = {
      id: randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      lastSeenAt: new Date(),
      revokedAt: null,
    };
    this.sessions.push(session);
    return session;
  }

  async findActiveSession(tokenHash: string, now: Date) {
    const session = this.sessions.find(
      (s) => s.tokenHash === tokenHash && !s.revokedAt && s.expiresAt > now,
    );
    const user = session ? this.users.get(session.userId) : undefined;
    return session && user ? { session, user } : null;
  }

  async touchSession(sessionId: string, at: Date) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) session.lastSeenAt = at;
  }

  async revokeSessionByTokenHash(tokenHash: string, at: Date) {
    for (const s of this.sessions) if (s.tokenHash === tokenHash && !s.revokedAt) s.revokedAt = at;
  }

  async findLatestLoginCode(email: string) {
    const list = this.codes.filter((c) => c.email === email);
    return list.length ? list[list.length - 1]! : null;
  }

  async countLoginCodesSince(email: string, since: Date) {
    return this.codes.filter((c) => c.email === email && c.createdAt >= since).length;
  }

  async createLoginCode(data: Parameters<AuthRepository['createLoginCode']>[0]) {
    const record: EmailCodeRecord = {
      id: randomUUID(),
      email: data.email,
      codeHash: data.codeHash,
      expiresAt: data.expiresAt,
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.codes.push(record);
    return record;
  }

  async incrementLoginCodeAttempts(id: string) {
    const c = this.codes.find((x) => x.id === id);
    if (c) c.attempts += 1;
  }

  async consumeLoginCode(id: string, at: Date) {
    const c = this.codes.find((x) => x.id === id);
    if (c) c.consumedAt = at;
  }

  async createVerifiedUser(data: Parameters<AuthRepository['createVerifiedUser']>[0]) {
    return this.addUser({
      email: data.email,
      emailVerifiedAt: data.emailVerifiedAt,
      displayName: null,
      avatarUrl: null,
    });
  }

  async markEmailVerified(userId: string, at: Date) {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, emailVerifiedAt: at });
  }

  async upsertPasswordUser(data: Parameters<AuthRepository['upsertPasswordUser']>[0]) {
    const user =
      (await this.findUserByEmail(data.email)) ??
      this.addUser({
        email: data.email,
        displayName: data.displayName,
        emailVerifiedAt: null,
        avatarUrl: null,
      });
    this.passwords.set(user.id, data.passwordHash);
    return user;
  }

  addUser(data: Omit<UserRecord, 'id' | 'status'> & { status?: UserRecord['status'] }) {
    const user: UserRecord = { id: randomUUID(), status: 'ACTIVE', ...data };
    this.users.set(user.id, user);
    return user;
  }
}
