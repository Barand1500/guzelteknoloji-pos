import { describe, expect, it } from 'vitest';
import { argon2Hasher } from '../lib/password';
import { testEnv } from './helpers';

describe('ortam değişkenleri', () => {
  it('zorunlu değişken eksikse açık hata verir', () => {
    expect(() => testEnv({ DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => testEnv({ COOKIE_SECRET: 'kisa' })).toThrow(/COOKIE_SECRET/);
  });

  it('Google yapılandırması opsiyoneldir, ama yarım bırakılamaz', () => {
    expect(testEnv().google).toBeNull();
    expect(() => testEnv({ GOOGLE_CLIENT_ID: 'x' })).toThrow(/GOOGLE_CLIENT_SECRET/);
    const env = testEnv({ GOOGLE_CLIENT_ID: 'x', GOOGLE_CLIENT_SECRET: 'y' });
    expect(env.google?.redirectUri).toBe('http://localhost:5173/api/auth/google/callback');
  });

  it('production ortamında https zorunludur', () => {
    expect(() => testEnv({ NODE_ENV: 'production' })).toThrow(/https/);
    expect(() =>
      testEnv({
        NODE_ENV: 'production',
        APP_URL: 'https://example.com',
        UPLOADS_DIR: '../../uploads',
      }),
    ).toThrow(/UPLOADS_DIR/);
  });
});

describe('şifre hash', () => {
  it('Argon2id kullanır ve doğru doğrular', async () => {
    const hash = await argon2Hasher.hash('Gizli-Sifre-123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await argon2Hasher.verify(hash, 'Gizli-Sifre-123')).toBe(true);
    expect(await argon2Hasher.verify(hash, 'yanlis')).toBe(false);
    expect(await argon2Hasher.verify('bozuk-hash', 'x')).toBe(false);
  });
});
