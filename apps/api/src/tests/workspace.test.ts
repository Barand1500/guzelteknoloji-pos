import express, { type Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { WORKSPACE_RESOURCES } from '@gt/shared';
import type { PrismaClient } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { errorHandler } from '../middleware/error-handler';
import {
  canGrant,
  hasPermission,
  WorkspaceAccess,
  type AccessContext,
} from '../modules/workspace/workspace.access';
import { WorkspaceSettings } from '../modules/workspace/workspace.settings';
import { requestPermission } from '../modules/workspace/workspace.middleware';
import { createWorkspaceRouter } from '../modules/workspace/workspace.routes';
import {
  mailConnectionMessage,
  mailTlsOptions,
  googleConnect,
  workspaceGoogleRedirect,
  workspaceGoogleReturn,
} from '../modules/workspace/workspace.connections';
import type { AuthService } from '../modules/auth/auth.service';
import { testEnv } from './helpers';

const owner: AccessContext = {
  business: { id: 1, name: 'İşletme' },
  user: { id: 7, name: 'Sahip', email: 'owner@example.com' },
  owner: true,
  ownerId: 7,
  permissions: [],
};
const employee: AccessContext = {
  ...owner,
  owner: false,
  user: { id: 8, name: 'Personel', email: 'staff@example.com' },
  permissions: [{ resource: 'products', read: true, save: false, delete: false }],
};
const user = {
  id: '8',
  email: 'staff@example.com',
  displayName: 'Personel',
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  status: 'ACTIVE' as const,
};
const hash = { hash: async () => '', verify: async () => true };

describe('İşletme yetkileri', () => {
  it('sepet önizlemesini yazma yetkisi gerektirmeyen okuma işlemi olarak tanır', () => {
    expect(requestPermission('/api/kampanyalar/hesapla', 'POST')).toEqual({ resource: 'campaigns', action: 'read' });
  });
  it('SEO uçlarını işletme ayarları yetkisine bağlar', () => {
    expect(requestPermission('/api/seo/urun', 'GET')).toEqual({ resource: 'settings', action: 'read' });
    expect(requestPermission('/api/seo/yonlendirme/1/sil', 'POST')).toEqual({ resource: 'settings', action: 'delete' });
  });
  it('görüntüleme yetkisi yazma/silme vermez; sahibi kilitlemez', () => {
    expect(hasPermission(employee, 'products', 'read')).toBe(true);
    expect(hasPermission(employee, 'products', 'save')).toBe(false);
    expect(hasPermission(employee, 'products', 'delete')).toBe(false);
    expect(hasPermission(employee, 'users', 'read')).toBe(false);
    expect(hasPermission(employee, 'orders', 'read')).toBe(false);
    expect(hasPermission(employee, 'customers', 'save')).toBe(false);
    expect(hasPermission(employee, 'dashboard', 'read')).toBe(false);
    for (const r of WORKSPACE_RESOURCES) expect(hasPermission(owner, r.key, 'delete')).toBe(true);
    expect(
      canGrant(employee, [{ resource: 'products', read: true, save: true, delete: false }]),
    ).toBe(false);
  });
  it('doğrudan API toplu silme isteğini de Sil olarak tanır', () => {
    expect(requestPermission('/api/stok/kartlar/toplu', 'POST', { islem: 'sil' })).toEqual({
      resource: 'products',
      action: 'delete',
    });
    expect(requestPermission('/api/markalar/42/sil', 'POST')).toEqual({
      resource: 'brands',
      action: 'delete',
    });
    expect(requestPermission('/api/katalog/kategoriler', 'GET')).toEqual({
      resource: 'categories',
      action: 'read',
    });
    expect(requestPermission('/api/stok/kartlar/1/guncelle', 'POST')).toEqual({
      resource: 'products',
      action: 'save',
    });
    expect(requestPermission('/api/siparisler', 'GET')).toEqual({
      resource: 'orders',
      action: 'read',
    });
    expect(requestPermission('/api/siparisler/2/durum', 'POST')).toEqual({
      resource: 'orders',
      action: 'save',
    });
    expect(requestPermission('/api/siparisler/iade', 'GET')).toEqual({
      resource: 'orders',
      action: 'read',
    });
    expect(requestPermission('/api/musteriler/2/sil', 'POST')).toEqual({
      resource: 'customers',
      action: 'delete',
    });
    expect(requestPermission('/api/anasayfa', 'GET')).toEqual({
      resource: 'dashboard',
      action: 'read',
    });
  });
  it('çalışanın kimliğini koruyup işletmenin ortak veri sahibini sunucuda belirler', async () => {
    const member = {
      id: 2,
      businessId: 1,
      userId: 8,
      durum: true,
      business: { id: 1, name: 'Ortak', ownerId: 7 },
      role: { permissions: [{ resource: 'products', read: true, save: false, delete: false }] },
    };
    const tx = {
      $queryRaw: vi.fn(),
      isletmeUyesi: {
        findUnique: vi.fn().mockResolvedValue(member),
        findUniqueOrThrow: vi.fn().mockResolvedValue(member),
      },
    };
    const db = {
      isletmeUyesi: tx.isletmeUyesi,
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const ctx = await new WorkspaceAccess(db as unknown as PrismaClient).resolve(user);
    expect(ctx.user.id).toBe(8);
    expect(ctx.ownerId).toBe(7);
    expect(ctx.owner).toBe(false);
    expect(hasPermission(ctx, 'products', 'read')).toBe(true);
    expect(hasPermission(ctx, 'roles', 'save')).toBe(false);
  });
  it('bekleyen daveti yalnızca doğrulanmış e-posta ile bağlar', async () => {
    const invite = { id: 2, businessId: 1, userId: null, durum: true };
    const member = {
      ...invite,
      userId: 8,
      business: { id: 1, name: 'Ortak', ownerId: 7 },
      role: null,
    };
    const tx = {
      $queryRaw: vi.fn(),
      isletmeUyesi: {
        findUnique: vi
          .fn()
          .mockImplementation(async ({ where }: { where: { email?: string } }) =>
            where.email ? invite : null,
          ),
        update: vi.fn().mockResolvedValue(member),
        findUniqueOrThrow: vi.fn().mockResolvedValue(member),
      },
    };
    const db = {
      isletmeUyesi: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const access = new WorkspaceAccess(db as unknown as PrismaClient);
    await expect(access.resolve({ ...user, emailVerifiedAt: null })).rejects.toMatchObject({
      status: 403,
    });
    expect(tx.isletmeUyesi.update).not.toHaveBeenCalled();
    const ctx = await access.resolve(user);
    expect(ctx.ownerId).toBe(7);
    expect(ctx.owner).toBe(false);
    expect(tx.isletmeUyesi.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { userId: 8 } });
  });
  it('kapatılan üye mevcut oturumla işletmeye erişemez', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      isletmeUyesi: { findUnique: vi.fn().mockResolvedValue({ id: 2, durum: false }) },
    };
    const db = {
      isletmeUyesi: tx.isletmeUyesi,
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    await expect(
      new WorkspaceAccess(db as unknown as PrismaClient).resolve(user),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('Ayar sırları', () => {
  it('sertifika istisnası yalnızca bağlantıda açıkça etkinleştirilirse uygulanır', () => {
    expect(mailTlsOptions('mail.example.com', {})).toEqual({
      servername: 'mail.example.com',
      rejectUnauthorized: true,
    });
    expect(
      mailTlsOptions('mail.example.com', { allowInvalidCertificate: 'false' }).rejectUnauthorized,
    ).toBe(true);
    expect(
      mailTlsOptions('mail.example.com', { allowInvalidCertificate: 'true' }).rejectUnauthorized,
    ).toBe(false);
  });
  it('pasif Google bağlantısı için OAuth akışı başlatmaz', async () => {
    await expect(
      googleConnect(
        {
          effective: async () => ({
            source: 'database',
            values: { enabled: 'false', clientId: 'client', clientSecret: 'secret' },
          }),
        } as unknown as WorkspaceSettings,
        owner,
        testEnv(),
        { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('aynı Google istemcisi girişte çalışan dönüş adresini kullanır, yabancı istemci ayrı kalır', async () => {
    const env = testEnv({
      GOOGLE_CLIENT_ID: 'working-client',
      GOOGLE_CLIENT_SECRET: 'working-secret',
    });
    const expected = env.google!.redirectUri;
    expect(workspaceGoogleRedirect(env, 'working-client')).toBe(expected);
    expect(workspaceGoogleRedirect(env, 'other-client')).toBe(
      `${env.APP_URL}/api/hesap/google/callback`,
    );
    const cookie = vi.fn();
    const url = new URL(
      await googleConnect(
        {
          effective: async () => ({
            source: 'database',
            values: { clientId: 'working-client', clientSecret: 'saved-secret' },
          }),
        } as unknown as WorkspaceSettings,
        owner,
        env,
        { cookie, clearCookie: vi.fn() } as unknown as Response,
      ),
    );
    expect(url.searchParams.get('redirect_uri')).toBe(expected);
    expect(url.searchParams.has('client_secret')).toBe(false);
    expect(JSON.parse(cookie.mock.calls[0]![1]).redirectUri).toBe(expected);
    expect(cookie.mock.calls[0]![2]).toMatchObject({ path: '/api', signed: true, httpOnly: true });
  });
  it('normal Google girişinin state bilgisi işletme akışına yönlendirilmez', async () => {
    const server = express();
    server.use((req, _res, next) => {
      req.signedCookies = { gt_business_google: JSON.stringify({ state: 'business-state' }) };
      next();
    });
    const auth = { getSession: vi.fn() };
    server.get(
      '/callback',
      workspaceGoogleReturn({} as PrismaClient, testEnv(), auth as unknown as AuthService),
      (_req, res) => res.json({ normalLogin: true }),
    );
    const normal = await request(server).get('/callback?state=normal-state');
    expect(normal.body).toEqual({ normalLogin: true });
    expect(auth.getSession).not.toHaveBeenCalled();
    const business = await request(server).get('/callback?state=business-state');
    expect(business.status).toBe(302);
    expect(business.headers.location).toContain('/uygulama/ayarlar/sosyal-giris?google=gecersiz');
  });
  it('posta bağlantı hatasını gizli yanıtları yansıtmadan açıklar', () => {
    expect(
      mailConnectionMessage({ code: 'ESOCKET', message: 'self-signed certificate' }),
    ).toContain('sertifikası');
    expect(mailConnectionMessage({ code: 'EAUTH', message: 'secret-server-response' })).toContain(
      'kullanıcı adı veya şifre',
    );
    expect(mailConnectionMessage({ code: 'ENOTFOUND' })).toContain('DNS');
    expect(mailConnectionMessage({ code: 'ETIMEDOUT' })).toContain('Portu');
    expect(mailConnectionMessage({ message: 'smtp-password' })).not.toContain('smtp-password');
  });
  it('sayfa şeffaflığını ilişkili ayar satırına yazar, geçersiz değeri reddeder', async () => {
    const upsert = vi.fn();
    const tx = {
      $queryRaw: vi.fn(),
      isletmeAyari: {
        upsert,
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ values: { brands: 'false', products: 'true' } })
          .mockResolvedValue({ values: { brands: 'true', products: 'true' } }),
      },
    };
    const db = { ...tx, $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) };
    const settings = new WorkspaceSettings(db as unknown as PrismaClient, 'key');
    await expect(settings.save(1, 'images', { values: { brands: 'yes' } })).rejects.toMatchObject({
      status: 400,
    });
    expect(upsert).not.toHaveBeenCalled();
    const result = await settings.save(1, 'images', { values: { brands: 'true' } });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          businessId: 1,
          section: 'images',
          values: { brands: 'true', products: 'true' },
        },
      }),
    );
    expect(result.values).toEqual({ brands: 'true', products: 'true' });
  });
  it('şifreyi şifreler, geri açar ve değiştirilmiş şifreli veriyi reddeder', () => {
    const settings = new WorkspaceSettings({} as PrismaClient, 'test-key');
    const encrypted = settings.encrypt('smtp-secret');
    expect(encrypted).not.toContain('smtp-secret');
    expect(settings.decrypt(encrypted)).toBe('smtp-secret');
    expect(() => settings.decrypt(encrypted.slice(0, -3) + 'AAA')).toThrow();
    expect(() =>
      new WorkspaceSettings({} as PrismaClient, 'different-key').decrypt(encrypted),
    ).toThrow();
  });
  it('API yanıtında şifreler ve OAuth tokenları bulunmaz', async () => {
    const db = {
      isletmeAyari: {
        findUnique: vi.fn().mockResolvedValue({
          values: {
            clientId: 'client',
            clientSecret: 'encrypted-secret',
            refreshToken: 'encrypted-refresh',
            expiresAt: '123',
          },
        }),
      },
    };
    const result = await new WorkspaceSettings(db as unknown as PrismaClient, 'key').read(
      1,
      'google',
    );
    expect(result.values).toEqual({ clientId: 'client' });
    expect(result.configured).toEqual(['clientSecret']);
    expect(result.googleConnected).toBe(true);
    expect(JSON.stringify(result)).not.toContain('encrypted');
  });
});

describe('Yönetim API sınırları', () => {
  function app(ctx: AccessContext, tx: Record<string, unknown>, env = testEnv()) {
    const db = {
      ...tx,
      $transaction: async (fn: (t: Record<string, unknown>) => Promise<unknown>) =>
        fn({ ...tx, $queryRaw: vi.fn() }),
    };
    const server = express();
    server.use(express.json());
    server.use((_req, res, next) => {
      res.locals.workspace = ctx;
      res.locals.auditChanges = [];
      next();
    });
    server.use(createWorkspaceRouter(db as unknown as PrismaClient, env, hash));
    server.use(errorHandler(createLogger('silent')));
    return server;
  }
  it('ortak sunucu ayarı kullanıldığını söylerken ortak şifreyi kullanıcıya döndürmez', async () => {
    const env = testEnv({
      SMTP_HOST: 'shared.example.com',
      SMTP_USER: 'shared-user',
      SMTP_PASS: 'server-secret',
      MAIL_FROM: 'shared@example.com',
    });
    const result = await request(
      app(owner, { isletmeAyari: { findUnique: vi.fn().mockResolvedValue(null) } }, env),
    ).get('/ayarlar/smtp');
    expect(result.status).toBe(200);
    expect(result.body.source).toBe('environment');
    expect(result.body.values).toEqual({});
    expect(result.body.configured).toEqual([]);
    expect(JSON.stringify(result.body)).not.toContain('server-secret');
    expect(JSON.stringify(result.body)).not.toContain('shared-user');
  });
  it('kayıtlı şifreyi yalnızca ayar yetkisiyle, önbelleksiz ve kendi işletmesinden gösterir', async () => {
    const encrypted = new WorkspaceSettings({} as PrismaClient, testEnv().COOKIE_SECRET).encrypt(
      'saved-secret',
    );
    const findUnique = vi.fn().mockResolvedValue({ values: { password: encrypted } });
    const denied = await request(app(employee, { isletmeAyari: { findUnique } })).post(
      '/ayarlar/smtp/gizli/password',
    );
    expect(denied.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
    const allowed = await request(app(owner, { isletmeAyari: { findUnique } })).post(
      '/ayarlar/smtp/gizli/password',
    );
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ value: 'saved-secret' });
    expect(allowed.headers['cache-control']).toBe('no-store');
    expect(findUnique).toHaveBeenCalledWith({
      where: { businessId_section: { businessId: owner.business.id, section: 'smtp' } },
    });
    const token = await request(app(owner, {})).post('/ayarlar/google/gizli/refreshToken');
    expect(token.status).toBe(400);
  });
  it('görüntüleyici kullanıcı yönetim listesini doğrudan çağıramaz', async () => {
    expect((await request(app(employee, {})).get('/kullanicilar')).status).toBe(403);
  });
  it('işletme sahibi silinemez veya pasifleştirilemez', async () => {
    const tx = { isletmeUyesi: { findFirst: vi.fn().mockResolvedValue({ id: 1, userId: 7 }) } };
    expect((await request(app(owner, tx)).post('/kullanicilar/1/sil').send({})).status).toBe(409);
    expect(
      (
        await request(app(owner, tx))
          .post('/kullanicilar/1')
          .send({ name: 'Sahip', roleId: 1, active: false })
      ).status,
    ).toBe(409);
  });
  it('rol yöneticisi kendi sahip olmadığı yetkiyi role veremez', async () => {
    const ctx = {
      ...employee,
      permissions: [
        ...employee.permissions,
        { resource: 'roles' as const, read: true, save: true, delete: false },
      ],
    };
    const result = await request(app(ctx, {}))
      .post('/roller')
      .send({
        name: 'Yüksek',
        permissions: [{ resource: 'users', read: true, save: true, delete: true }],
      });
    expect(result.status).toBe(403);
  });
  it('başka işletmeye ait rolü değiştiremez', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const result = await request(app(owner, { isletmeRolu: { findFirst } }))
      .post('/roller/999')
      .send({ name: 'Dış Rol', permissions: [] });
    expect(result.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 999, businessId: 1 } }),
    );
  });
});
