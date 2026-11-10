import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { WorkspaceSettings } from '../modules/workspace/workspace.settings';
import { createWorkspaceMailer } from '../modules/workspace/workspace.mailer';
import { testEnv } from './helpers';

const mocks = vi.hoisted(() => ({ send: vi.fn(), close: vi.fn(), transport: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.transport } }));
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '46.197.176.53', family: 4 }]),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue({});
  mocks.transport.mockReturnValue({ sendMail: mocks.send, close: mocks.close });
});

function fixture(
  values: Record<string, string>,
  member: { businessId: number; active: boolean } | null = { businessId: 4, active: true },
) {
  const env = testEnv({
    SMTP_HOST: 'shared.example.com',
    SMTP_USER: 'shared-user',
    SMTP_PASS: 'shared-secret',
    MAIL_FROM: 'shared@example.com',
    GOOGLE_CLIENT_ID: 'shared-google',
    GOOGLE_CLIENT_SECRET: 'shared-google-secret',
    IMAP_HOST: 'imap.shared.com',
    IMAP_USER: 'imap-user',
    IMAP_PASS: 'imap-secret',
  });
  const crypt = new WorkspaceSettings({} as PrismaClient, env.COOKIE_SECRET);
  const db = {
    isletmeUyesi: { findUnique: vi.fn().mockResolvedValue(member) },
    isletmeAyari: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          Object.entries(values).map(([key, value]) => ({
            key,
            value: crypt.isSecret(key) ? crypt.encrypt(value) : value,
          })),
        ),
    },
  };
  const fallback = { sendLoginCode: vi.fn().mockResolvedValue(undefined) };
  return {
    env,
    db,
    fallback,
    settings: new WorkspaceSettings(db as unknown as PrismaClient, env.COOKIE_SECRET),
    mailer: createWorkspaceMailer(
      env,
      db as unknown as PrismaClient,
      fallback,
      createLogger('silent'),
    ),
  };
}
describe('İşletme bağlantı önceliği ve gerçek gönderim yolu', () => {
  it('işletme belirlenemeyen girişte ortak posta hizmetini kullanır', async () => {
    const f = fixture({}, null);
    await f.mailer.sendLoginCode('new@example.com', '123456', 10);
    expect(f.fallback.sendLoginCode).toHaveBeenCalledWith('new@example.com', '123456', 10);
    expect(f.db.isletmeAyari.findMany).not.toHaveBeenCalled();
    expect(mocks.transport).not.toHaveBeenCalled();
  });
  it('işletmenin ayarı yoksa env hizmetine döner', async () => {
    const f = fixture({ secure: 'false' });
    await f.mailer.sendLoginCode('owner@example.com', '123456', 10);
    expect(f.fallback.sendLoginCode).toHaveBeenCalled();
    expect(mocks.transport).not.toHaveBeenCalled();
  });
  it('alıcı üyeliğinin SMTP ayarıyla gerçekten sendMail çağırır ve sertifika tercihini uygular', async () => {
    const f = fixture({
      host: 'tenant.example.com',
      port: '587',
      username: 'tenant-user',
      password: 'tenant-secret',
      from: 'tenant@example.com',
      allowInvalidCertificate: 'true',
    });
    await f.mailer.sendLoginCode('Owner@Example.com', '123456', 10);
    expect(f.db.isletmeUyesi.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
      select: { businessId: true, active: true },
    });
    expect(f.db.isletmeAyari.findMany).toHaveBeenCalledWith({
      where: { businessId: 4, section: 'smtp' },
    });
    expect(mocks.transport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: 'tenant-user', pass: 'tenant-secret' },
        requireTLS: true,
        tls: { servername: 'tenant.example.com', rejectUnauthorized: false },
      }),
    );
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'tenant@example.com', to: 'Owner@Example.com' }),
    );
    expect(f.fallback.sendLoginCode).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
  it('eksik işletme bilgisi env şifresiyle tamamlanmaz', async () => {
    const f = fixture({ host: 'tenant.example.com' });
    await expect(f.mailer.sendLoginCode('owner@example.com', '123456', 10)).rejects.toThrow(
      'eksik',
    );
    expect(f.fallback.sendLoginCode).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('gönderim hatasında başka SMTP hesabına sessiz geçiş yapmaz', async () => {
    const f = fixture({ host: 'tenant.example.com', from: 'tenant@example.com' });
    mocks.send.mockRejectedValueOnce(Object.assign(new Error('rejected'), { code: 'EAUTH' }));
    await expect(f.mailer.sendLoginCode('owner@example.com', '123456', 10)).rejects.toThrow(
      'rejected',
    );
    expect(f.fallback.sendLoginCode).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
  it.each(['smtp', 'imap', 'google'] as const)(
    '%s ayarı yokken env kullanır, kendi bilgisi varsa ona öncelik verir',
    async (section) => {
      const shared = fixture({});
      const result = await shared.settings.effective(4, section, shared.env);
      expect(result.source).toBe('environment');
      expect(Object.keys(result.values).length).toBeGreaterThan(0);
      const own = fixture(
        section === 'google' ? { clientId: 'tenant-google' } : { host: 'tenant-host' },
      );
      const chosen = await own.settings.effective(4, section, own.env);
      expect(chosen.source).toBe('database');
      expect(chosen.values.password).toBeUndefined();
      expect(chosen.values.clientSecret).toBeUndefined();
    },
  );
});
