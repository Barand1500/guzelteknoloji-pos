import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import mariadb from 'mariadb';
import { createPrismaClient } from '../src/lib/prisma';
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository';

// Yalnizca ayri, yerel test sunucusu kabul edilir; canli veritabani kullanilmaz.
const raw = process.env.DB_MIGRATION_TEST_URL;
if (!raw) throw new Error('DB_MIGRATION_TEST_URL gerekli (yerel test sunucusu).');
const url = new URL(raw);
assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'Yerel test sunucusu gerekli.');
const database = 'pos_rename_test_' + randomUUID().replaceAll('-', '');
const connection = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
});
let created = false;
try {
  await connection.query(
    'CREATE DATABASE ' + database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  );
  created = true;
  await connection.query('USE ' + database);
  for (const name of [
    '20261104000000_init',
    '20261104120000_email_login_code',
    '20261105000000_login_methods',
  ]) {
    const sql = await readFile(
      new URL('../prisma/migrations/' + name + '/migration.sql', import.meta.url),
      'utf8',
    );
    for (const statement of sql.split(';').filter((part) => part.trim()))
      await connection.query(statement);
  }
  const userId = randomUUID();
  await connection.query(
    'INSERT INTO User (id, email, displayName, updatedAt, lastLoginMethod, lastLoginAt) VALUES (?, ?, ?, NOW(3), ?, NOW(3))',
    [userId, 'test@example.com', 'Test', 'EMAIL'],
  );
  await connection.query(
    'INSERT INTO PasswordCredential (userId, passwordHash, updatedAt) VALUES (?, ?, NOW(3))',
    [userId, 'test-hash'],
  );
  for (const provider of ['GOOGLE', 'APPLE'])
    await connection.query(
      'INSERT INTO AuthIdentity (id, userId, provider, providerUserId, updatedAt) VALUES (?, ?, ?, ?, NOW(3))',
      [randomUUID(), userId, provider, 'test-' + provider],
    );
  await connection.query(
    'INSERT INTO Session (id, userId, tokenHash, expiresAt, loginMethod) VALUES (?, ?, ?, DATE_ADD(NOW(3), INTERVAL 1 DAY), ?)',
    [randomUUID(), userId, 'a'.repeat(64), 'EMAIL'],
  );
  await connection.query(
    'INSERT INTO EmailLoginCode (id, email, codeHash, expiresAt, attempts) VALUES (?, ?, ?, DATE_ADD(NOW(3), INTERVAL 1 DAY), ?)',
    [randomUUID(), 'test@example.com', 'b'.repeat(64), 2],
  );
  const tables = [
    ['User', 'kullanicilar'],
    ['PasswordCredential', 'sifre_bilgileri'],
    ['AuthIdentity', 'giris_kimlikleri'],
    ['Session', 'oturumlar'],
    ['EmailLoginCode', 'eposta_giris_kodlari'],
  ];
  const snapshot = async (table: string) => {
    const rows = await connection.query('SELECT * FROM ' + table);
    return rows.map((row: Record<string, unknown>) => JSON.stringify(Object.values(row))).sort();
  };
  const before = await Promise.all(tables.map(([old]) => snapshot(old!)));
  const sql = await readFile(
    new URL(
      '../prisma/migrations/20261105150000_turkce_veritabani_adlari/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  for (const statement of sql.split(';').filter((part) => part.trim()))
    await connection.query(statement);
  for (const [i, [, table]] of tables.entries())
    assert.deepEqual(await snapshot(table!), before[i], table + ' data preserved');
  url.pathname = '/' + database;
  const prisma = createPrismaClient(url.href);
  try {
    const repo = new PrismaAuthRepository(prisma);
    assert.equal((await repo.findPasswordLogin('test@example.com'))?.passwordHash, 'test-hash');
    for (const provider of ['GOOGLE', 'APPLE'] as const)
      assert.equal((await repo.findUserByIdentity(provider, 'test-' + provider))?.id, userId);
    assert.equal((await repo.findLatestLoginCode('test@example.com'))?.attempts, 2);
    assert.equal((await repo.findActiveSession('a'.repeat(64), new Date()))?.user.id, userId);
    await repo.createSession({
      userId,
      tokenHash: 'c'.repeat(64),
      expiresAt: new Date(Date.now() + 60000),
      loginMethod: 'APPLE',
      ipAddress: null,
      userAgent: null,
    });
    assert.equal(
      (await prisma.user.findUnique({ where: { id: userId } }))?.lastLoginMethod,
      'APPLE',
    );
    await assert.rejects(prisma.user.create({ data: { email: 'test@example.com' } }));
    await prisma.user.delete({ where: { id: userId } });
    assert.equal(await prisma.authIdentity.count(), 0);
    assert.equal(await prisma.session.count(), 0);
    assert.equal(await prisma.passwordCredential.count(), 0);
    console.log(
      'PASS: MySQL migration, all row values, Prisma queries, login methods, unique constraints and cascading relations.',
    );
  } finally {
    await prisma.$disconnect();
  }
} finally {
  // Yalnizca bu calistirmada olusturulan rastgele test veritabani temizlenir.
  if (created) await connection.query('DROP DATABASE ' + database);
  await connection.end();
}
