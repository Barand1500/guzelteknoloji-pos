import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { GoogleClaims, GoogleOidcClient } from '../modules/auth/google.client';
import { APP_URL, buildTestApp, cookiesFrom, seedPasswordUser } from './helpers';

const FLOW = {
  url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x',
  state: 'state-degeri-1234567890',
  nonce: 'nonce-degeri-1234567890',
  codeVerifier: 'v'.repeat(43),
};

function fakeGoogle(claims: Partial<GoogleClaims> = {}): GoogleOidcClient {
  return {
    createAuthRequest: vi.fn(async () => FLOW),
    exchangeCode: vi.fn(async (_query, expected) => {
      // Gerçek istemci gibi: state eşleşmezse reddet.
      if (expected.state !== FLOW.state) throw new Error('state uyuşmuyor');
      return {
        sub: 'google-sub-1',
        email: 'yeni@example.com',
        emailVerified: true,
        name: 'Yeni Kullanıcı',
        picture: null,
        ...claims,
      };
    }),
  };
}

const google = {
  GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'secret',
};

async function startFlow(agent: ReturnType<typeof request.agent>) {
  const res = await agent.get('/api/auth/google');
  expect(res.status).toBe(303);
  expect(res.headers.location).toBe(FLOW.url);
  return res;
}

describe('Google OAuth', () => {
  it("yapılandırma yoksa providers false döner ve /login'e hata koduyla yönlendirir", async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/auth/providers')).body).toEqual({
      google: false,
      apple: false,
    });
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_yapilandirilmamis`);
  });

  it('başlangıçta imzalı, HttpOnly ve dar yollu akış cookiesi koyar', async () => {
    const { app } = buildTestApp({ env: google, google: fakeGoogle() });
    const res = await startFlow(request.agent(app));
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/gt_oauth=s%3A/); // "s:" = imzalı
    expect(setCookie).toMatch(/Path=\/api\/auth\/google/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('yeni ve doğrulanmış e-postalı Google kullanıcısı için hesap ve oturum oluşturur', async () => {
    const { app, repo } = buildTestApp({ env: google, google: fakeGoogle() });
    const agent = request.agent(app);
    await startFlow(agent);

    const cb = await agent.get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    expect(cb.status).toBe(303);
    expect(cb.headers.location).toBe(`${APP_URL}/login`);
    expect(repo.identities).toHaveLength(1);
    expect(repo.sessions[0]?.loginMethod).toBe('GOOGLE');

    const me = await agent.get('/api/auth/me');
    expect(me.body.user.email).toBe('yeni@example.com');
  });

  it('akış cookiesi olmadan callback reddedilir', async () => {
    const g = fakeGoogle();
    const { app } = buildTestApp({ env: google, google: g });
    const res = await request(app).get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_dogrulama`);
    expect(g.exchangeCode).not.toHaveBeenCalled();
  });

  it('kurcalanmış (imzası bozuk) akış cookiesi reddedilir', async () => {
    const g = fakeGoogle();
    const { app } = buildTestApp({ env: google, google: g });
    const forged = encodeURIComponent(
      `s:${JSON.stringify({ state: FLOW.state, nonce: FLOW.nonce, codeVerifier: FLOW.codeVerifier })}.sahteimza`,
    );
    const res = await request(app)
      .get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`)
      .set('Cookie', `gt_oauth=${forged}`);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_dogrulama`);
    expect(g.exchangeCode).not.toHaveBeenCalled();
  });

  it('kullanıcı Google ekranında iptal ederse google_iptal döner', async () => {
    const { app } = buildTestApp({ env: google, google: fakeGoogle() });
    const agent = request.agent(app);
    await startFlow(agent);
    const res = await agent.get('/api/auth/google/callback?error=access_denied');
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_iptal`);
  });

  it('doğrulanmamış Google e-postasını reddeder', async () => {
    const { app, repo } = buildTestApp({
      env: google,
      google: fakeGoogle({ emailVerified: false }),
    });
    const agent = request.agent(app);
    await startFlow(agent);
    const res = await agent.get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_eposta_dogrulanmamis`);
    expect(repo.users.size).toBe(0);
  });

  it('aynı e-postalı mevcut hesabı OTOMATİK birleştirmez', async () => {
    const { app, repo } = buildTestApp({
      env: google,
      google: fakeGoogle({ email: 'kullanici@example.com' }),
    });
    await seedPasswordUser(repo);
    const agent = request.agent(app);
    await startFlow(agent);
    const res = await agent.get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_hesap_mevcut`);
    expect(repo.identities).toHaveLength(0);
    expect(
      cookiesFrom(res.headers['set-cookie']).some(
        (c) => c.startsWith('gt_session=') && c.length > 11,
      ),
    ).toBe(false);
  });

  it('şifreyle oturum açmış kullanıcı Google kimliğini açıkça bağlayabilir', async () => {
    const { app, repo } = buildTestApp({
      env: google,
      google: fakeGoogle({ email: 'farkli@gmail.com' }),
    });
    const user = await seedPasswordUser(repo);
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .set({ Origin: APP_URL, 'Content-Type': 'application/json' })
      .send({ email: 'kullanici@example.com', password: 'Dogru-Sifre-123' })
      .expect(200);

    await startFlow(agent);
    const res = await agent.get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    expect(res.headers.location).toBe(`${APP_URL}/login`);
    expect(repo.identities).toEqual([
      expect.objectContaining({ userId: user.id, providerUserId: 'google-sub-1' }),
    ]);
  });

  it('daha önce bağlanmış Google kimliği aynı kullanıcıyla giriş yapar', async () => {
    const { app, repo } = buildTestApp({ env: google, google: fakeGoogle() });
    const user = repo.addUser({
      email: 'eski@example.com',
      emailVerifiedAt: new Date(),
      displayName: null,
      avatarUrl: null,
    });
    repo.identities.push({ userId: user.id, provider: 'GOOGLE', providerUserId: 'google-sub-1' });

    const agent = request.agent(app);
    await startFlow(agent);
    await agent.get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user.id).toBe(user.id);
  });

  it('token doğrulaması başarısız olursa google_dogrulama döner', async () => {
    const g = fakeGoogle();
    g.exchangeCode = vi.fn(async () => {
      throw new Error('imza geçersiz');
    });
    const { app } = buildTestApp({ env: google, google: g });
    const agent = request.agent(app);
    await startFlow(agent);
    const res = await agent.get(`/api/auth/google/callback?code=kod&state=${FLOW.state}`);
    expect(res.headers.location).toBe(`${APP_URL}/login?hata=google_dogrulama`);
  });
});
