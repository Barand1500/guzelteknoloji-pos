import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { MysqlEmailCodeStore } from '../modules/auth/mysql-email-code.store';

interface Row {
  kimlik: number;
  epostaHash: string;
  kodHash: string;
  gecerlilikBitisTarihi: Date;
  denemeSayisi: number;
  olusturmaTarihi: Date;
}

/** Yalnızca deponun kullandığı Prisma çağrılarını bellekte taklit eder (gerçek MySQL gerekmez). */
function fakePrisma() {
  const rows: Row[] = [];
  let seq = 0;
  const match = (row: Row, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([key, cond]) => {
      const value = row[key as keyof Row];
      if (cond instanceof Date || typeof cond !== 'object' || cond === null) return value === cond;
      const c = cond as { gt?: Date; lt?: Date };
      return (
        (c.gt === undefined || (value as Date) > c.gt) &&
        (c.lt === undefined || (value as Date) < c.lt)
      );
    });
  const model = {
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i]!, where)) rows.splice(i, 1);
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      rows
        .filter((r) => match(r, where))
        .sort((a, b) => b.olusturmaTarihi.getTime() - a.olusturmaTarihi.getTime()),
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      (await model.findMany({ where }))[0] ?? null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
      for (const r of rows) if (match(r, where)) Object.assign(r, data);
    },
    update: async ({ where, data }: { where: { kimlik: number }; data: Partial<Row> }) =>
      Object.assign(
        rows.find((r) => r.kimlik === where.kimlik)!,
        data,
      ),
    create: async ({ data }: { data: Omit<Row, 'kimlik' | 'denemeSayisi'> }) => {
      const row = { kimlik: ++seq, denemeSayisi: 0, ...data };
      rows.push(row);
      return row;
    },
  };
  const tx = { epostaGirisKodu: model, $queryRaw: async () => [{ ok: 1 }] };
  const prisma = { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  return { prisma: prisma as unknown as PrismaClient, rows };
}

const policy = { ttlSeconds: 600, resendSeconds: 60, maxAttempts: 3, maxPerHour: 3 };
const good = 'a'.repeat(64);
const bad = 'b'.repeat(64);

describe('MySQL giriş kodu deposu', () => {
  it('düz e-posta saklamaz; kod bir kez kullanılır', async () => {
    const { prisma, rows } = fakePrisma();
    const store = new MysqlEmailCodeStore(prisma, 'gizli', () => 1_000_000);
    expect((await store.reserve('a@b.com', good, policy)).status).toBe('created');
    expect(JSON.stringify(rows)).not.toContain('a@b.com');
    expect(await store.verify('a@b.com', good, 3)).toBe(true);
    expect(await store.verify('a@b.com', good, 3)).toBe(false);
  });

  it('bekleme süresinde "waiting", saatlik kotada "limited" döner', async () => {
    const { prisma } = fakePrisma();
    let now = 1_000_000;
    const store = new MysqlEmailCodeStore(prisma, 'gizli', () => now);
    await store.reserve('a@b.com', good, policy);
    now += 10_000;
    expect(await store.reserve('a@b.com', good, policy)).toMatchObject({
      status: 'waiting',
      resendAfterSeconds: 50,
    });
    for (let i = 0; i < 2; i++) {
      now += 61_000;
      await store.reserve('a@b.com', good, policy);
    }
    now += 61_000;
    expect((await store.reserve('a@b.com', good, policy)).status).toBe('limited');
  });

  it('yanlış deneme sınırında kod geçersiz olur; yeni kod eskisini iptal eder', async () => {
    const { prisma } = fakePrisma();
    let now = 1_000_000;
    const store = new MysqlEmailCodeStore(prisma, 'gizli', () => now);
    await store.reserve('a@b.com', good, policy);
    for (let i = 0; i < 3; i++) expect(await store.verify('a@b.com', bad, 3)).toBe(false);
    expect(await store.verify('a@b.com', good, 3)).toBe(false);

    now += 61_000;
    await store.reserve('a@b.com', good, policy);
    now += 61_000;
    await store.reserve('a@b.com', bad, policy);
    expect(await store.verify('a@b.com', good, 3)).toBe(false);
    expect(await store.verify('a@b.com', bad, 3)).toBe(true);
  });

  it('süresi dolan kod kabul edilmez; discard yalnızca o gönderimi siler', async () => {
    const { prisma, rows } = fakePrisma();
    let now = 1_000_000;
    const store = new MysqlEmailCodeStore(prisma, 'gizli', () => now);
    const first = await store.reserve('a@b.com', good, policy);
    now += 601_000;
    expect(await store.verify('a@b.com', good, 3)).toBe(false);

    now += 61_000;
    const second = await store.reserve('a@b.com', good, policy);
    if (first.status !== 'created' || second.status !== 'created') throw new Error('beklenmedik');
    await store.discard('a@b.com', second.id);
    expect(rows.map((r) => String(r.kimlik))).toEqual([first.id]);
  });
});
