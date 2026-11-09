import express from 'express';
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
  it('görüntüleme yetkisi yazma/silme vermez; sahibi kilitlemez', () => {
    expect(hasPermission(employee, 'products', 'read')).toBe(true);
    expect(hasPermission(employee, 'products', 'save')).toBe(false);
    expect(hasPermission(employee, 'products', 'delete')).toBe(false);
    expect(hasPermission(employee, 'users', 'read')).toBe(false);
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
  });
  it('çalışanın kimliğini koruyup işletmenin ortak veri sahibini sunucuda belirler', async () => {
    const member = {
      id: 2,
      businessId: 1,
      userId: 8,
      active: true,
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
    const invite = { id: 2, businessId: 1, userId: null, active: true };
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
      isletmeUyesi: { findUnique: vi.fn().mockResolvedValue({ id: 2, active: false }) },
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
    const rows = [
      { key: 'clientId', value: 'client' },
      { key: 'clientSecret', value: 'encrypted-secret' },
      { key: 'refreshToken', value: 'encrypted-refresh' },
      { key: 'expiresAt', value: '123' },
    ];
    const db = { isletmeAyari: { findMany: vi.fn().mockResolvedValue(rows) } };
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
  function app(ctx: AccessContext, tx: Record<string, unknown>) {
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
    server.use(createWorkspaceRouter(db as unknown as PrismaClient, testEnv(), hash));
    server.use(errorHandler(createLogger('silent')));
    return server;
  }
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
