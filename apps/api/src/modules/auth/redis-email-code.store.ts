import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { HttpError } from '../../lib/http-error';
import type { Logger } from '../../lib/logger';
import type { CodePolicy, CodeReservation, EmailCodeStore } from './email-code.store';

// Lua sayesinde eşzamanlı istekler bekleme/kota kontrolünü veya tek kullanımı aşamaz.
const RESERVE = `
local wait = redis.call('PTTL', KEYS[3])
if wait > 0 then return {0, math.ceil(wait / 1000), math.max(0, redis.call('TTL', KEYS[1]))} end
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - 3600000)
if redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[5]) then return {-1, 0, 0} end
redis.call('DEL', KEYS[1])
redis.call('HSET', KEYS[1], 'id', ARGV[1], 'hash', ARGV[2], 'attempts', 0)
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('SET', KEYS[3], ARGV[1], 'EX', ARGV[4])
redis.call('ZADD', KEYS[2], now, ARGV[1])
redis.call('EXPIRE', KEYS[2], 3600)
return {1, 0, 0}
`;

const VERIFY = `
local stored = redis.call('HGET', KEYS[1], 'hash')
if not stored then return 0 end
local attempts = tonumber(redis.call('HGET', KEYS[1], 'attempts') or '0')
if attempts >= tonumber(ARGV[2]) then redis.call('DEL', KEYS[1]) return 0 end
-- Sabit uzunluktaki hash'in tüm baytları karşılaştırılır.
local diff = 0
for i = 1, 64 do
  if string.byte(stored, i) ~= string.byte(ARGV[1], i) then diff = diff + 1 end
end
if diff == 0 then redis.call('DEL', KEYS[1]) return 1 end
attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
if attempts >= tonumber(ARGV[2]) then redis.call('DEL', KEYS[1]) end
return 0
`;

const DISCARD = `
if redis.call('HGET', KEYS[1], 'id') == ARGV[1] then redis.call('DEL', KEYS[1]) end
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
return 1
`;

export function createCodeRedisClient(url: string, logger: Logger) {
  const client = createClient({
    url,
    RESP: 2,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => (retries >= 5 ? false : Math.min(250 * (retries + 1), 3000)),
    },
  });
  // Bağlantı URL'si, e-posta veya kod loglanmaz.
  client.on('error', () => logger.error('Doğrulama kodu Redis bağlantısı kullanılamıyor.'));
  return client;
}

export class RedisEmailCodeStore implements EmailCodeStore {
  constructor(
    private readonly client: ReturnType<typeof createCodeRedisClient>,
    private readonly secret: string,
    private readonly prefix = 'gt:email-code:',
  ) {}

  private keys(email: string) {
    // Redis anahtarında dahi açık e-posta tutulmaz. Süslü parantez Cluster slotunu ortak tutar.
    const hash = createHmac('sha256', this.secret).update(email).digest('hex');
    const base = `${this.prefix}{${hash}}`;
    return [`${base}:code`, `${base}:quota`, `${base}:cooldown`];
  }

  private async run(script: string, keys: string[], args: string[]) {
    try {
      return await this.client
        .withCommandOptions({ timeout: 5000 })
        .eval(script, { keys, arguments: args });
    } catch {
      // Redis kesilirse MySQL veya süreç belleğine geri dönülmez.
      throw new HttpError(
        503,
        'EMAIL_UNAVAILABLE',
        'Doğrulama şu anda kullanılamıyor. Lütfen biraz sonra tekrar deneyin.',
      );
    }
  }

  async reserve(email: string, codeHash: string, policy: CodePolicy): Promise<CodeReservation> {
    const id = randomUUID();
    const result = await this.run(RESERVE, this.keys(email), [
      id,
      codeHash,
      String(policy.ttlSeconds),
      String(policy.resendSeconds),
      String(policy.maxPerHour),
    ]);
    if (!Array.isArray(result)) throw new Error('Geçersiz Redis yanıtı.');
    if (result[0] === -1) return { status: 'limited' };
    if (result[0] === 0)
      return {
        status: 'waiting',
        resendAfterSeconds: Number(result[1]),
        expiresInSeconds: Number(result[2]),
      };
    return { status: 'created', id };
  }

  async verify(email: string, codeHash: string, maxAttempts: number) {
    return (await this.run(VERIFY, [this.keys(email)[0]!], [codeHash, String(maxAttempts)])) === 1;
  }

  async discard(email: string, id: string) {
    const keys = this.keys(email);
    await this.run(DISCARD, [keys[0]!, keys[2]!], [id]);
  }
}
