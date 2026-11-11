import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../lib/http-error';
import type { WorkspaceChallenge } from '../modules/workspace/workspace.integrations';
import { APP_URL, buildTestApp, seedPasswordUser } from './helpers';

const json = { Origin: APP_URL, 'Content-Type': 'application/json' };

class FakeChallenge {
  calls: string[] = [];
  configCalls = 0;
  async enforce(email: string, token: unknown) {
    this.calls.push(`${email}:${String(token)}`);
    if (token !== 'ok')
      throw new HttpError(400, 'VALIDATION_ERROR', 'Robot doğrulamasını tamamlayın.');
  }
  async publicConfig() {
    this.configCalls += 1;
    return { provider: 'cloudflare', siteKey: 'test-site' } as const;
  }
}

const asChallenge = (fake: FakeChallenge) => fake as unknown as WorkspaceChallenge;

describe('e-posta akışında tek robot doğrulaması', () => {
  it('ilk adımda doğrulanınca kod adımında yeniden istemez', async () => {
    const fake = new FakeChallenge();
    const { app, mailer } = buildTestApp({ challenge: asChallenge(fake) });
    const agent = request.agent(app);

    const start = await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com', challengeToken: 'ok' });
    expect(start.status).toBe(200);
    expect(fake.calls).toHaveLength(1);
    expect(String(start.headers['set-cookie'])).toContain('gt_email_flow');
    expect(typeof start.body.flowToken).toBe('string');

    const verify = await agent
      .post('/api/auth/email/verify')
      .set(json)
      .send({ email: 'yeni@example.com', code: mailer.lastCode });
    expect(verify.status).toBe(200);
    // İkinci adımda sağlayıcıya tekrar gidilmedi.
    expect(fake.calls).toHaveLength(1);
  });

  it('akış cookie’si olmadan kod adımı doğrulama ister', async () => {
    const fake = new FakeChallenge();
    const { app, mailer } = buildTestApp({ challenge: asChallenge(fake) });

    await request(app)
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com', challengeToken: 'ok' });
    const verify = await request(app)
      .post('/api/auth/email/verify')
      .set(json)
      .send({ email: 'yeni@example.com', code: mailer.lastCode });

    expect(verify.status).toBe(400);
    expect(verify.body.error.message).toBe('Robot doğrulamasını tamamlayın.');
    expect(fake.calls).toHaveLength(2);
  });

  it('çerez engelliyse imzalı akış anahtarı ikinci doğrulamayı engeller', async () => {
    const fake = new FakeChallenge();
    const { app, mailer } = buildTestApp({ challenge: asChallenge(fake) });

    // Çerez saklamayan istemci: yalnızca yanıttaki akış anahtarını taşır.
    const start = await request(app)
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com', challengeToken: 'ok' });
    const flowToken = start.body.flowToken as string;
    expect(flowToken).toBeTruthy();

    const verify = await request(app)
      .post('/api/auth/email/verify')
      .set(json)
      .send({ email: 'yeni@example.com', code: mailer.lastCode, flowToken });
    expect(verify.status).toBe(200);
    expect(fake.calls).toHaveLength(1);
  });

  it('akış anahtarı doğru e-posta için robot ayarını da atlar', async () => {
    const fake = new FakeChallenge();
    const { app } = buildTestApp({ challenge: asChallenge(fake) });
    const start = await request(app)
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com', challengeToken: 'ok' });

    const config = await request(app)
      .post('/api/auth/robot')
      .set(json)
      .send({ email: 'yeni@example.com', flowToken: start.body.flowToken });
    expect(config.status).toBe(200);
    expect(config.body).toEqual({ challenge: null });
    expect(fake.configCalls).toBe(0);
  });

  it('başka e-postanın akış anahtarını kabul etmez', async () => {
    const fake = new FakeChallenge();
    const { app } = buildTestApp({ challenge: asChallenge(fake) });
    const start = await request(app)
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'birinci@example.com', challengeToken: 'ok' });

    const other = await request(app).post('/api/auth/email/verify').set(json).send({
      email: 'ikinci@example.com',
      code: '123456',
      flowToken: start.body.flowToken,
    });
    expect(other.status).toBe(400);
    expect(fake.calls).toHaveLength(2);
  });

  it('kod yeniden gönderilirken de doğrulama tekrar istenmez', async () => {
    const fake = new FakeChallenge();
    const { app } = buildTestApp({ challenge: asChallenge(fake) });
    const agent = request.agent(app);

    await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com', challengeToken: 'ok' });
    const resend = await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com' });

    expect(resend.status).toBe(200);
    expect(resend.body.step).toBe('code');
    expect(fake.calls).toHaveLength(1);
  });

  it('şifre adımında da ilk doğrulama yeterlidir', async () => {
    const fake = new FakeChallenge();
    const { app, repo } = buildTestApp({ challenge: asChallenge(fake) });
    await seedPasswordUser(repo, 'kullanici@example.com', 'TestSifre123!');
    const agent = request.agent(app);

    const start = await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'kullanici@example.com', challengeToken: 'ok' });
    expect(start.body.step).toBe('password');

    const login = await agent
      .post('/api/auth/login')
      .set(json)
      .send({ email: 'kullanici@example.com', password: 'TestSifre123!' });
    expect(login.status).toBe(200);
    expect(fake.calls).toHaveLength(1);
  });

  it('doğrulama geçilmiş e-posta için robot ayarı widget istemez', async () => {
    const fake = new FakeChallenge();
    const { app } = buildTestApp({ challenge: asChallenge(fake) });
    const agent = request.agent(app);
    await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'yeni@example.com', challengeToken: 'ok' });

    const config = await agent
      .post('/api/auth/robot')
      .set(json)
      .send({ email: 'yeni@example.com' });
    expect(config.status).toBe(200);
    expect(config.body).toEqual({ challenge: null });
    expect(fake.configCalls).toBe(0);
  });

  it('başka e-posta için ilk doğrulama yeniden istenir', async () => {
    const fake = new FakeChallenge();
    const { app } = buildTestApp({ challenge: asChallenge(fake) });
    const agent = request.agent(app);
    await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'birinci@example.com', challengeToken: 'ok' });

    const other = await agent
      .post('/api/auth/email/start')
      .set(json)
      .send({ email: 'ikinci@example.com' });
    expect(other.status).toBe(400);
    expect(fake.calls).toHaveLength(2);
  });
});
