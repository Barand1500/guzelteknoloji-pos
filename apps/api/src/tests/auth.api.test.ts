import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { hashToken } from '../lib/crypto';
import { APP_URL, buildTestApp, cookiesFrom, seedPasswordUser } from './helpers';

const json = { Origin: APP_URL, 'Content-Type': 'application/json' };

describe('GET /api/health', () => {
  it('servis durumunu döndürür', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/auth/login', () => {
  it('doğru bilgilerle HttpOnly oturum cookiesi verir ve kullanıcıyı döndürür', async () => {
    const { app, repo } = buildTestApp();
    await seedPasswordUser(repo);

    const res = await request(app)
      .post('/api/auth/login')
      .set(json)
      .send({ email: '  Kullanici@Example.com ', password: 'Dogru-Sifre-123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'kullanici@example.com' });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/gt_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);

    // Veritabanında ham token değil, yalnızca özeti tutulur.
    const token = cookiesFrom(res.headers['set-cookie'])[0]!.split('=')[1]!;
    expect(repo.sessions[0]!.tokenHash).toBe(hashToken(token));
    expect(repo.sessions[0]!.tokenHash).not.toBe(token);
  });

  it('yanlış şifre ve olmayan hesap için AYNI yanıtı verir', async () => {
    const { app, repo } = buildTestApp();
    await seedPasswordUser(repo);

    const wrong = await request(app)
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'kullanici@example.com', password: 'yanlis' });
    const missing = await request(app)
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'yok@example.com', password: 'yanlis' });

    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body).toEqual(missing.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('pasif hesaba giriş izni vermez', async () => {
    const { app, repo } = buildTestApp();
    const user = await seedPasswordUser(repo);
    repo.users.set(user.id, { ...user, status: 'DISABLED' });
    const res = await request(app)
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'kullanici@example.com', password: 'Dogru-Sifre-123' });
    expect(res.status).toBe(401);
  });

  it('geçersiz e-postayı Türkçe doğrulama hatasıyla reddeder', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'gecersiz', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Geçerli bir e-posta adresi girin.',
    });
  });

  it('bozuk JSON gövdesini 400 ile reddeder', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/auth/login').set(json).send('{bozuk');
    expect(res.status).toBe(400);
  });

  it('izinli olmayan Origin ile gelen isteği reddeder (CSRF)', async () => {
    const { app, repo } = buildTestApp();
    await seedPasswordUser(repo);
    const res = await request(app)
      .post('/api/auth/login')
      .set({ Origin: 'https://kotu-site.example', 'Content-Type': 'application/json' })
      .send({ email: 'kullanici@example.com', password: 'Dogru-Sifre-123' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
  });

  it('Origin başlığı olmayan POST isteğini reddeder', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('tekrarlanan denemeleri hız sınırına takar', async () => {
    const { app } = buildTestApp({ env: { RATE_LIMIT_ENABLED: 'true' } });
    let last = 0;
    for (let i = 0; i < 9; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set(json)
        .send({ email: 'hedef@example.com', password: `deneme-${i}` });
      last = res.status;
    }
    expect(last).toBe(429);
  });

  it('girişte eski oturumu iptal eder (session rotation)', async () => {
    const { app, repo } = buildTestApp();
    await seedPasswordUser(repo);
    const agent = request.agent(app);
    const body = { email: 'kullanici@example.com', password: 'Dogru-Sifre-123' };

    await agent.post('/api/auth/login').set(json).send(body).expect(200);
    await agent.post('/api/auth/login').set(json).send(body).expect(200);

    expect(repo.sessions).toHaveLength(2);
    expect(repo.sessions[0]!.revokedAt).not.toBeNull();
    expect(repo.sessions[1]!.revokedAt).toBeNull();
  });
});

describe('GET /api/auth/me ve POST /api/auth/logout', () => {
  it('oturum yokken 401 döner', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('sahte cookie ile oturum açılamaz', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/auth/me').set('Cookie', 'gt_session=uydurma-token');
    expect(res.status).toBe(401);
  });

  it('giriş → me → çıkış → me akışı', async () => {
    const { app, repo } = buildTestApp();
    await seedPasswordUser(repo);
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'kullanici@example.com', password: 'Dogru-Sifre-123' })
      .expect(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('kullanici@example.com');
    expect(me.headers['cache-control']).toBe('no-store');

    await agent.post('/api/auth/logout').set({ Origin: APP_URL }).expect(204);
    expect(repo.sessions[0]!.revokedAt).not.toBeNull();

    await agent.get('/api/auth/me').expect(401);
  });

  it('süresi dolmuş oturumu kabul etmez', async () => {
    const { app, repo } = buildTestApp();
    await seedPasswordUser(repo);
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'kullanici@example.com', password: 'Dogru-Sifre-123' });
    repo.sessions[0]!.expiresAt = new Date(Date.now() - 1000);
    await agent.get('/api/auth/me').expect(401);
  });
});

describe('Bilinmeyen API yolu', () => {
  it('JSON 404 döner', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/yok');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('Güvenlik başlıkları', () => {
  it('CSP satır içi style niteliklerine izin verir ama script/style bloklarına vermez', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/health');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});

describe('CSP frame-src (gömülü destek formu)', () => {
  const csp = async (env?: Record<string, string>) => {
    const { app } = buildTestApp(env ? { env } : {});
    const res = await request(app).get('/api/health');
    return String(res.headers['content-security-policy']);
  };

  it("form adresi yoksa hiçbir iframe'e izin vermez", async () => {
    expect(await csp()).toContain("frame-src 'none'");
  });

  it("yalnızca yapılandırılan form origin'ine izin verir (yol ve sorgu eklenmez)", async () => {
    const header = await csp({
      VITE_SUPPORT_FORM_URL: 'https://destek.guzelteknoloji.com/form/destek?source=abc&embed=1',
    });
    expect(header).toMatch(/frame-src https:\/\/destek\.guzelteknoloji\.com(;|$)/);
    expect(header).not.toContain('source=abc');
    // Sayfanın kendisi çerçevelenemez.
    expect(header).toContain("frame-ancestors 'none'");
  });

  it('https olmayan adresi yok sayar', async () => {
    expect(await csp({ VITE_SUPPORT_FORM_URL: 'http://destek.example.com/form' })).toContain(
      "frame-src 'none'",
    );
  });
});
