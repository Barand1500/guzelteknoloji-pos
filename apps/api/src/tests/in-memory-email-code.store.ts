import { randomUUID } from 'node:crypto';
import { safeEqualHex } from '../lib/crypto';
import type { CodePolicy, CodeReservation, EmailCodeStore } from '../modules/auth/email-code.store';

/** Yalnızca testlerde kullanılır; sunucuda bellek deposuna geri dönüş yoktur. */
export class InMemoryEmailCodeStore implements EmailCodeStore {
  codes = new Map<string, { id: string; codeHash: string; expiresAt: number; attempts: number }>();
  private cooldowns = new Map<string, { id: string; until: number }>();
  private sends = new Map<string, number[]>();
  constructor(private readonly now = () => Date.now()) {}

  async reserve(email: string, codeHash: string, policy: CodePolicy): Promise<CodeReservation> {
    const now = this.now();
    const cooldown = this.cooldowns.get(email);
    if (cooldown && cooldown.until > now)
      return {
        status: 'waiting',
        resendAfterSeconds: Math.ceil((cooldown.until - now) / 1000),
        expiresInSeconds: Math.max(
          0,
          Math.ceil(((this.codes.get(email)?.expiresAt ?? now) - now) / 1000),
        ),
      };
    const sends = (this.sends.get(email) ?? []).filter((at) => at > now - 3600000);
    if (sends.length >= policy.maxPerHour) return { status: 'limited' };
    const id = randomUUID();
    this.sends.set(email, [...sends, now]);
    this.cooldowns.set(email, { id, until: now + policy.resendSeconds * 1000 });
    this.codes.set(email, { id, codeHash, expiresAt: now + policy.ttlSeconds * 1000, attempts: 0 });
    return { status: 'created', id };
  }
  async verify(email: string, codeHash: string, maxAttempts: number) {
    const record = this.codes.get(email);
    if (!record) return false;
    if (record.expiresAt <= this.now() || record.attempts >= maxAttempts) {
      this.codes.delete(email);
      return false;
    }
    if (safeEqualHex(record.codeHash, codeHash)) {
      this.codes.delete(email);
      return true;
    }
    if (++record.attempts >= maxAttempts) this.codes.delete(email);
    return false;
  }
  async discard(email: string, id: string) {
    if (this.codes.get(email)?.id === id) this.codes.delete(email);
    if (this.cooldowns.get(email)?.id === id) this.cooldowns.delete(email);
  }
}
