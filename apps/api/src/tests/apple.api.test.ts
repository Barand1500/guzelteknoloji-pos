import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { APP_URL, buildTestApp, cookiesFrom } from './helpers';
const flow = {
  url: 'https://appleid.apple.com/auth/authorize',
  state: 's'.repeat(32),
  nonce: 'n'.repeat(32),
  codeVerifier: 'v'.repeat(43),
};
function client() {
  return {
    createAuthRequest: vi.fn(async () => flow),
    exchangeCode: vi.fn(async () => ({
      sub: 'apple-1',
      email: 'apple@example.com',
      emailVerified: true,
      name: null,
      picture: null,
    })),
  };
}
async function start(app: ReturnType<typeof buildTestApp>['app']) {
  const res = await request(app).get('/api/auth/apple');
  expect(String(res.headers['set-cookie'])).toContain('SameSite=None');
  expect(String(res.headers['set-cookie'])).toContain('Secure');
  return cookiesFrom(res.headers['set-cookie']).join('; ');
}
describe('Apple login', () => {
  it('accepts Apple form POST and records provider on the session', async () => {
    const apple = client();
    const { app, repo } = buildTestApp({ apple });
    const cookie = await start(app);
    const res = await request(app)
      .post('/api/auth/apple/callback')
      .set('Origin', 'https://appleid.apple.com')
      .set('Cookie', cookie)
      .type('form')
      .send({ code: 'code', state: flow.state });
    expect(res.headers.location).toBe(APP_URL + '/login');
    expect(repo.identities[0]?.provider).toBe('APPLE');
    expect(repo.sessions[0]?.loginMethod).toBe('APPLE');
  });
  it('rejects missing or mismatched state without exchanging tokens', async () => {
    const apple = client();
    const { app, repo } = buildTestApp({ apple });
    const cookie = await start(app);
    const res = await request(app)
      .post('/api/auth/apple/callback')
      .set('Cookie', cookie)
      .type('form')
      .send({ code: 'code', state: 'wrong' });
    expect(res.headers.location).toContain('apple_dogrulama');
    expect(apple.exchangeCode).not.toHaveBeenCalled();
    expect(repo.sessions).toHaveLength(0);
  });
  it('does not merge an existing email account automatically', async () => {
    const { app, repo } = buildTestApp({ apple: client() });
    repo.addUser({
      email: 'apple@example.com',
      emailVerifiedAt: new Date(),
      displayName: null,
      avatarUrl: null,
    });
    const cookie = await start(app);
    const res = await request(app)
      .post('/api/auth/apple/callback')
      .set('Cookie', cookie)
      .type('form')
      .send({ code: 'code', state: flow.state });
    expect(res.headers.location).toContain('apple_hesap_mevcut');
    expect(repo.sessions).toHaveLength(0);
  });
});
