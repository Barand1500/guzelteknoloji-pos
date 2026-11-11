import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { APP_URL, buildTestApp, seedPasswordUser } from './helpers';

const json = { Origin: APP_URL, 'Content-Type': 'application/json' };
const start = (app: Parameters<typeof request>[0], email: string) =>
  request(app).post('/api/auth/email/start').set(json).send({ email });
const verify = (app: Parameters<typeof request>[0], email: string, code: string) =>
  request(app).post('/api/auth/email/verify').set(json).send({ email, code });

describe('POST /api/auth/email/start', () => {
  it('şifresi olan kayıtlı hesap için "password" adımını döndürür, kod göndermez', async () => {
    const { app, repo, mailer } = buildTestApp();
    await seedPasswordUser(repo);
    const res = await start(app, 'Kullanici@Example.com');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ step: 'password', flowToken: expect.any(String) });
    expect(mailer.sent).toHaveLength(0);
  });

  it('kayıtlı olmayan e-postaya kod gönderir ve "code" adımını döndürür', async () => {
    const { app, mailer } = buildTestApp();
    const res = await start(app, 'yeni@example.com');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      step: 'code',
      resendAfterSeconds: 60,
      expiresInSeconds: 600,
      flowToken: expect.any(String),
    });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toBe('yeni@example.com');
    expect(mailer.lastCode).toMatch(/^\d{6}$/);
  });

  it('geçici kod deposunda yalnızca hash bulunur', async () => {
    const { app, codes, mailer } = buildTestApp();
    await start(app, 'yeni@example.com');
    expect(codes.codes.get('yeni@example.com')!.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(codes.codes.get('yeni@example.com')!.codeHash).not.toContain(mailer.lastCode);
  });

  it('bekleme süresi dolmadan tekrar istenirse yeni kod göndermez', async () => {
    const { app, mailer } = buildTestApp();
    await start(app, 'yeni@example.com');
    const again = await start(app, 'yeni@example.com');
    expect(again.body.step).toBe('code');
    expect(again.body.resendAfterSeconds).toBeLessThanOrEqual(60);
    expect(mailer.sent).toHaveLength(1);
  });

  it('e-posta gönderilemezse 503 EMAIL_UNAVAILABLE döner', async () => {
    const { app, mailer } = buildTestApp();
    mailer.fail = true;
    const res = await start(app, 'yeni@example.com');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_UNAVAILABLE');
    mailer.fail = false;
    const retry = await start(app, 'yeni@example.com');
    expect(retry.status).toBe(200);
    expect(mailer.sent).toHaveLength(1);
  });

  it('geçersiz e-postayı reddeder', async () => {
    const { app } = buildTestApp();
    const res = await start(app, 'gecersiz');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('izinli olmayan Origin ile reddedilir', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/auth/email/start')
      .set({ Origin: 'https://kotu.example', 'Content-Type': 'application/json' })
      .send({ email: 'a@b.co' });
    expect(res.status).toBe(403);
  });

  it('hız sınırına takılır', async () => {
    const { app } = buildTestApp({ env: { RATE_LIMIT_ENABLED: 'true' } });
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await start(app, 'hedef@example.com')).status;
    expect(last).toBe(429);
  });
});

describe('POST /api/auth/email/verify', () => {
  it('doğru kodla hesap oluşturur, doğrulanmış işaretler ve oturum açar', async () => {
    const { app, repo, mailer } = buildTestApp();
    const agent = request.agent(app);
    await agent.post('/api/auth/email/start').set(json).send({ email: 'yeni@example.com' });

    const res = await agent
      .post('/api/auth/email/verify')
      .set(json)
      .send({ email: 'yeni@example.com', code: mailer.lastCode });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('yeni@example.com');
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect([...repo.users.values()][0]!.emailVerifiedAt).not.toBeNull();

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
  });

  it('kod tek kullanımlıktır', async () => {
    const { app, mailer, codes } = buildTestApp();
    await start(app, 'yeni@example.com');
    const code = mailer.lastCode;
    expect((await verify(app, 'yeni@example.com', code)).status).toBe(200);
    expect(codes.codes.size).toBe(0);
    const second = await verify(app, 'yeni@example.com', code);
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('CODE_INVALID');
  });

  it('yanlış kodu reddeder; 5 yanlış denemeden sonra doğru kod bile geçersiz olur', async () => {
    const { app, mailer } = buildTestApp();
    await start(app, 'yeni@example.com');
    const real = mailer.lastCode;
    const wrong = real === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      expect((await verify(app, 'yeni@example.com', wrong)).status).toBe(400);
    }
    expect((await verify(app, 'yeni@example.com', real)).status).toBe(400);
  });

  it('süresi dolmuş kodu reddeder', async () => {
    const { app, codes, mailer } = buildTestApp();
    await start(app, 'yeni@example.com');
    codes.codes.get('yeni@example.com')!.expiresAt = Date.now() - 1000;
    expect((await verify(app, 'yeni@example.com', mailer.lastCode)).status).toBe(400);
  });

  it('başka e-posta için istenen kod kabul edilmez', async () => {
    const { app, mailer } = buildTestApp();
    await start(app, 'yeni@example.com');
    const res = await verify(app, 'baska@example.com', mailer.lastCode);
    expect(res.status).toBe(400);
  });

  it('kodu 6 haneli olmayan istek doğrulama hatası döner', async () => {
    const { app } = buildTestApp();
    const res = await verify(app, 'yeni@example.com', '12ab');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('pasif hesap kodla giriş yapamaz', async () => {
    const { app, repo, mailer } = buildTestApp();
    repo.addUser({
      email: 'pasif@example.com',
      emailVerifiedAt: null,
      displayName: null,
      avatarUrl: null,
      status: 'DISABLED',
    });
    await start(app, 'pasif@example.com');
    expect((await verify(app, 'pasif@example.com', mailer.lastCode)).status).toBe(400);
  });

  it('şifresiz mevcut hesap (ör. Google ile açılmış) kodla girer, yeni hesap açılmaz', async () => {
    const { app, repo, mailer } = buildTestApp();
    const user = repo.addUser({
      email: 'google@example.com',
      emailVerifiedAt: new Date(),
      displayName: 'G',
      avatarUrl: null,
    });
    await start(app, 'google@example.com');
    const res = await verify(app, 'google@example.com', mailer.lastCode);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(repo.users.size).toBe(1);
  });
});

describe('Apple ile giriş', () => {
  it("yapılandırılmadığı için /login'e hata koduyla yönlendirir, oturum açmaz", async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/auth/apple');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=apple_yapilandirilmamis`);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect((await request(app).get('/api/auth/providers')).body).toEqual({
      google: false,
      apple: false,
    });
  });
});
