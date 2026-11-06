import { createApp } from '../app';
import { parseEnv } from '../config/env';
import { createLogger } from '../lib/logger';
import { argon2Hasher } from '../lib/password';
import type { Mailer } from '../lib/mailer';
import type { GoogleOidcClient } from '../modules/auth/google.client';
import { InMemoryAuthRepository } from './in-memory-repository';
import { InMemoryEmailCodeStore } from './in-memory-email-code.store';

export const APP_URL = 'http://localhost:5173';

/** Gönderilen kodları bellekte tutan sahte mailer. */
export class FakeMailer implements Mailer {
  sent: { to: string; code: string }[] = [];
  fail = false;
  async sendLoginCode(to: string, code: string) {
    if (this.fail) throw new Error('smtp down');
    this.sent.push({ to, code });
  }
  get lastCode() {
    return this.sent[this.sent.length - 1]?.code ?? '';
  }
}

export function testEnv(overrides: Record<string, string | undefined> = {}) {
  return parseEnv({
    NODE_ENV: 'test',
    APP_URL,
    DATABASE_URL: 'mysql://user:pass@localhost:3306/test',
    REDIS_URL: 'redis://localhost:6379',
    COOKIE_SECRET: 'test-cookie-secret-that-is-long-enough-123',
    LOG_LEVEL: 'silent',
    ...overrides,
  });
}

export function buildTestApp(
  options: {
    env?: Record<string, string | undefined>;
    google?: GoogleOidcClient | null;
    apple?: GoogleOidcClient | null;
    repo?: InMemoryAuthRepository;
    mailer?: FakeMailer;
  } = {},
) {
  const env = testEnv(options.env);
  const repo = options.repo ?? new InMemoryAuthRepository();
  const mailer = options.mailer ?? new FakeMailer();
  const codes = new InMemoryEmailCodeStore();
  const app = createApp({
    env,
    logger: createLogger('silent'),
    repo,
    codes,
    hasher: argon2Hasher,
    mailer,
    google: options.google ?? null,
    apple: options.apple ?? null,
  });
  return { app, repo, env, mailer, codes };
}

export async function seedPasswordUser(
  repo: InMemoryAuthRepository,
  email = 'kullanici@example.com',
  password = 'Dogru-Sifre-123',
) {
  return repo.upsertPasswordUser({
    email,
    passwordHash: await argon2Hasher.hash(password),
    displayName: 'Test Kullanıcı',
  });
}

/** Set-Cookie başlıklarından "ad=değer" çiftlerini döndürür. */
export function cookiesFrom(header: string | string[] | undefined): string[] {
  const list = Array.isArray(header) ? header : header ? [header] : [];
  return list.map((c) => c.split(';')[0] ?? '');
}
