import express from 'express';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { WorkspaceSettings } from '../modules/workspace/workspace.settings';
import {
  WorkspaceChallenge,
  verifyRobot,
  whatsappRequest,
  whatsappWebhook,
} from '../modules/workspace/workspace.integrations';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';
import { testEnv } from './helpers';
import { createAuthRouter } from '../modules/auth/auth.routes';
import type { AuthService } from '../modules/auth/auth.service';

afterEach(() => vi.unstubAllGlobals());
const whatsapp = {
  enabled: 'true',
  appId: '123456789',
  appSecret: 'app-secret',
  phoneNumberId: '987654321',
  accessToken: 'private-token',
  verifyToken: 'verify-private',
  apiVersion: 'v25.0',
};
function database(values: Record<string, string>, section = 'whatsapp') {
  const settings = new WorkspaceSettings({} as PrismaClient, testEnv().COOKIE_SECRET);
  const findMany = vi
    .fn()
    .mockImplementation(({ where }: { where: { businessId: number; section: string } }) =>
      Promise.resolve(
        where.businessId === 1 && where.section === section
          ? Object.entries(values).map(([key, value]) => ({
              key,
              value: settings.isSecret(key) ? settings.encrypt(value) : value,
            }))
          : [],
      ),
    );
  const create = vi.fn().mockResolvedValue({});
  return {
    isletmeAyari: { findMany },
    islemKaydi: { create },
    isletmeUyesi: { findUnique: vi.fn().mockResolvedValue({ businessId: 1, active: true }) },
  };
}

describe('işletme entegrasyonları', () => {
  it('yeni gizli anahtarları şifreli saklar ve normal okumada yalnızca tanımlı olduklarını döndürür', async () => {
    const db = database(whatsapp);
    const settings = new WorkspaceSettings(db as unknown as PrismaClient, testEnv().COOKIE_SECRET);
    const result = await settings.read(1, 'whatsapp');
    expect(result.configured).toEqual(
      expect.arrayContaining(['appSecret', 'accessToken', 'verifyToken']),
    );
    expect(JSON.stringify(result)).not.toMatch(/app-secret|private-token|verify-private/);
    expect((await settings.values(1, 'whatsapp', true)).accessToken).toBe('private-token');
    expect(await settings.values(2, 'whatsapp', true)).toEqual({});
  });
  it('eksik bağlantının etkinleşmesini engeller ve iki robot sağlayıcısını birlikte açmaz', async () => {
    const upsert = vi.fn();
    const tx = {
      $queryRaw: vi.fn(),
      isletmeAyari: { findMany: vi.fn().mockResolvedValue([]), upsert },
    };
    const db = { ...tx, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx) };
    const settings = new WorkspaceSettings(db as unknown as PrismaClient, 'secret');
    await expect(
      settings.save(1, 'cloudflare', { values: { enabled: 'true' } }),
    ).rejects.toMatchObject({ status: 400 });
    expect(upsert).not.toHaveBeenCalled();
    await settings.save(1, 'cloudflare', {
      values: { enabled: 'true', siteKey: 'site', secretKey: 'secret' },
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId_section_key: { businessId: 1, section: 'recaptcha', key: 'enabled' } },
        update: { value: 'false' },
      }),
    );
    const secretCall = upsert.mock.calls.find(([arg]) => arg.create.key === 'secretKey')![0];
    expect(secretCall.create.value).not.toBe('secret');
  });
  it('robot yanıtını sunucuda ve doğru alan adı için doğrular; başarısızlığı kabul etmez', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true, hostname: 'localhost' }))),
      );
    vi.stubGlobal('fetch', fetch);
    await verifyRobot(
      'cloudflare',
      { siteKey: 'public', secretKey: 'private' },
      'token',
      'localhost',
    );
    expect(fetch.mock.calls[0]![0]).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    await expect(
      verifyRobot(
        'cloudflare',
        { siteKey: 'public', secretKey: 'private' },
        'token',
        'other.example',
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      verifyRobot('recaptcha', { siteKey: 'public', secretKey: 'private' }, '', 'localhost'),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('giriş uçları robot doğrulamasından geçmeden kimlik doğrulama servisini çağırmaz', async () => {
    const env = testEnv();
    const db = database({ enabled: 'true', siteKey: 'public', secretKey: 'private' }, 'cloudflare');
    const service = { startEmail: vi.fn(), loginWithPassword: vi.fn(), verifyEmailCode: vi.fn() };
    const server = express();
    server.use(express.json());
    server.use(
      createAuthRouter({
        env,
        service: service as unknown as AuthService,
        google: null,
        logger: createLogger('silent'),
        challenge: new WorkspaceChallenge(db as unknown as PrismaClient, env),
      }),
    );
    server.use(errorHandler(createLogger('silent')));
    for (const path of ['/email/start', '/login', '/email/verify']) {
      const response = await request(server)
        .post(path)
        .send({ email: 'user@example.com', password: 'password123', code: '123456' });
      expect(response.status).toBe(400);
      expect(response.body.error.challenge).toEqual({ provider: 'cloudflare', siteKey: 'public' });
      expect(JSON.stringify(response.body)).not.toContain('private');
    }
    expect(service.startEmail).not.toHaveBeenCalled();
    expect(service.loginWithPassword).not.toHaveBeenCalled();
    expect(service.verifyEmailCode).not.toHaveBeenCalled();
  });
  it('girişte işletmeyi e-postanın üyeliğinden bulur; gizli anahtarı hata yanıtına eklemez', async () => {
    const db = database(
      { enabled: 'true', siteKey: 'public-site', secretKey: 'private-secret' },
      'cloudflare',
    );
    const challenge = new WorkspaceChallenge(db as unknown as PrismaClient, testEnv());
    await expect(challenge.enforce('USER@Example.com', undefined)).rejects.toMatchObject({
      challenge: { provider: 'cloudflare', siteKey: 'public-site' },
    });
    expect(db.isletmeUyesi.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'user@example.com' } }),
    );
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true, hostname: 'localhost' })));
    vi.stubGlobal('fetch', fetch);
    await challenge.enforce('user@example.com', 'fresh-token');
    expect(fetch).toHaveBeenCalledTimes(1);
    db.isletmeUyesi.findUnique.mockResolvedValueOnce(null);
    await challenge.enforce('new@example.com', undefined);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('WhatsApp bağlantı testinde mesaj göndermez; normal mesajda OTP şablonu kullanmaz', async () => {
    const fetch = vi
      .fn()
      .mockImplementation((_url, init) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              init.method === 'GET'
                ? { id: whatsapp.phoneNumberId }
                : { messages: [{ id: 'message' }] },
            ),
          ),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    await whatsappRequest(whatsapp);
    expect(fetch.mock.calls[0]![1].method).toBe('GET');
    expect(fetch.mock.calls[0]![1].body).toBeUndefined();
    await whatsappRequest(whatsapp, { to: '+905551234567', text: 'Merhaba' });
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toMatchObject({
      type: 'text',
      to: '905551234567',
      text: { body: 'Merhaba' },
    });
    expect(fetch.mock.calls[1]![0]).toContain(
      'https://graph.facebook.com/v25.0/987654321/messages',
    );
    expect(fetch.mock.calls[1]![0]).not.toContain('private-token');
  });
  it('Meta hatasının içeriğini ve belirteçleri kullanıcıya yansıtmaz', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: 'private-token' } }), { status: 401 }),
        ),
    );
    await expect(whatsappRequest(whatsapp)).rejects.toThrow('Bağlantı doğrulanamadı');
  });
  it('webhook doğrulama belirtecini, imzasını ve işletmenin telefon numarasını kontrol eder', async () => {
    const db = database(whatsapp);
    const server = express();
    server.use('/hook', whatsappWebhook(db as unknown as PrismaClient, testEnv()));
    server.use(errorHandler(createLogger('silent')));
    expect(
      (
        await request(server).get('/hook/1').query({
          'hub.mode': 'subscribe',
          'hub.verify_token': whatsapp.verifyToken,
          'hub.challenge': '12345',
        })
      ).text,
    ).toBe('12345');
    expect(
      (
        await request(server).get('/hook/2').query({
          'hub.mode': 'subscribe',
          'hub.verify_token': whatsapp.verifyToken,
          'hub.challenge': '12345',
        })
      ).status,
    ).toBe(403);
    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: whatsapp.phoneNumberId },
                messages: [{ text: { body: 'private conversation' } }],
              },
            },
          ],
        },
      ],
    });
    expect(
      (await request(server).post('/hook/1').set('Content-Type', 'application/json').send(body))
        .status,
    ).toBe(403);
    const signature =
      'sha256=' + createHmac('sha256', whatsapp.appSecret).update(body).digest('hex');
    expect(
      (
        await request(server)
          .post('/hook/1')
          .set('Content-Type', 'application/json')
          .set('x-hub-signature-256', signature)
          .send(body)
      ).status,
    ).toBe(200);
    expect(JSON.stringify(db.islemKaydi.create.mock.calls)).not.toContain('private conversation');
    expect(db.islemKaydi.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ businessId: 1 }) }),
    );
  });
});
