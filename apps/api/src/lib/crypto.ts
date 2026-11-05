import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256 bit rastgele, URL güvenli oturum token'ı. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Token yüksek entropili olduğu için yavaş hash gerekmez; SHA-256 yeterlidir.
 * DB sızsa bile ham token elde edilemez ve oturum ele geçirilemez.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * 6 haneli kodun uzayı küçüktür (10^6); düz hash DB sızıntısında anında kırılır.
 * Bu yüzden gizli anahtarla HMAC kullanılır ve e-posta da girdiye katılır.
 * (Asıl koruma: 10 dk ömür, 5 deneme sınırı ve tek kullanım.)
 */
export function hashLoginCode(secret: string, email: string, code: string): string {
  return createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

/** Zamanlama saldırılarına karşı sabit süreli hex karşılaştırması. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
