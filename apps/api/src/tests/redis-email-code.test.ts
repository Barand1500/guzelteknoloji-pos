import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLogger } from '../lib/logger';
import { createCodeRedisClient, RedisEmailCodeStore } from '../modules/auth/redis-email-code.store';

const url = process.env.REDIS_TEST_URL;
describe.skipIf(!url)('gerçek Redis doğrulama kodu deposu', () => {
  const prefix = `test:email-code:${randomUUID()}:`;
  const client = createCodeRedisClient(url ?? 'redis://127.0.0.1:6380', createLogger('silent'));
  const store = new RedisEmailCodeStore(client, 'test-secret', prefix);
  const policy = { ttlSeconds: 600, resendSeconds: 60, maxAttempts: 5, maxPerHour: 5 };
  const hash = 'a'.repeat(64);
  const wrong = 'b'.repeat(64);
  beforeAll(async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(url!).hostname))
      throw new Error('Yerel test Redis gerekli.');
    await client.connect();
  });
  afterAll(async () => {
    if (client.isReady) {
      const keys = await client.keys(`${prefix}*`);
      if (keys.length) await client.del(keys);
    }
    if (client.isOpen) await client.close();
  });
  it('yalnızca hash tutar; açık e-posta/IP yoktur, TTL 600 saniyedir', async () => {
    await store.reserve('private@example.com', hash, policy);
    const keys = await client.keys(`${prefix}*`);
    expect(keys.every((key) => !key.includes('@'))).toBe(true);
    const codeKey = keys.find((key) => key.endsWith(':code'))!;
    expect(await client.hGetAll(codeKey)).toEqual({ id: expect.any(String), hash, attempts: '0' });
    expect(await client.ttl(codeKey)).toBeGreaterThan(590);
    expect(await client.ttl(codeKey)).toBeLessThanOrEqual(600);
  });
  it('eşzamanlı gönderimlerde tek kod ayırır', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.reserve('send@example.com', hash, policy)),
    );
    expect(results.filter((r) => r.status === 'created')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'waiting')).toHaveLength(19);
  });
  it('eşzamanlı doğru doğrulamada yalnızca bir istek başarılı olur, kod silinir', async () => {
    const before = (await client.keys(`${prefix}*:code`)).length;
    await store.reserve('once@example.com', hash, policy);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.verify('once@example.com', hash, 5)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await store.verify('once@example.com', hash, 5)).toBe(false);
    expect((await client.keys(`${prefix}*:code`)).length).toBe(before);
  });
  it('5 yanlış denemede kodu siler; doğru kod da artık kabul edilmez', async () => {
    const before = (await client.keys(`${prefix}*:code`)).length;
    await store.reserve('attempt@example.com', hash, policy);
    for (let i = 0; i < 5; i++)
      expect(await store.verify('attempt@example.com', wrong, 5)).toBe(false);
    expect(await store.verify('attempt@example.com', hash, 5)).toBe(false);
    expect((await client.keys(`${prefix}*:code`)).length).toBe(before);
  });
  it('saatlik kota kod silinse bile korunur ve kendi TTL süresi vardır', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await store.reserve('quota@example.com', hash, policy);
      expect(result.status).toBe('created');
      if (result.status === 'created') await store.discard('quota@example.com', result.id);
    }
    expect((await store.reserve('quota@example.com', hash, policy)).status).toBe('limited');
    for (const key of await client.keys(`${prefix}*:quota`)) {
      expect(await client.ttl(key)).toBeGreaterThan(3500);
      expect(await client.ttl(key)).toBeLessThanOrEqual(3600);
    }
  });
  it('TTL dolunca kayıt fiziksel olarak silinir', async () => {
    const before = (await client.keys(`${prefix}*:code`)).length;
    await store.reserve('expire@example.com', hash, { ...policy, ttlSeconds: 1, resendSeconds: 1 });
    await setTimeout(1100);
    expect(await store.verify('expire@example.com', hash, 5)).toBe(false);
    expect((await client.keys(`${prefix}*:code`)).length).toBe(before);
  });
  it('yeniden gönderim eski kodu geçersiz kılar; eski SMTP hatası yeni kodu silemez', async () => {
    const old = await store.reserve('resend@example.com', hash, { ...policy, resendSeconds: 1 });
    await setTimeout(1100);
    await store.reserve('resend@example.com', wrong, policy);
    if (old.status === 'created') await store.discard('resend@example.com', old.id);
    expect(await store.verify('resend@example.com', hash, 5)).toBe(false);
    expect(await store.verify('resend@example.com', wrong, 5)).toBe(true);
  });
  it('Redis kapalıysa doğrulama veya gönderim başka depoya düşmez', async () => {
    const offline = createCodeRedisClient('redis://127.0.0.1:1', createLogger('silent'));
    const unavailable = new RedisEmailCodeStore(offline, 'test');
    await expect(unavailable.reserve('a@example.com', hash, policy)).rejects.toMatchObject({
      status: 503,
    });
    await expect(unavailable.verify('a@example.com', hash, 5)).rejects.toMatchObject({
      status: 503,
    });
  });
});
