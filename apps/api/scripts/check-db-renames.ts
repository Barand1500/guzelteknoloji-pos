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
  let userId: string = randomUUID();
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
  const [oldPassword] = await connection.query('SELECT * FROM sifre_bilgileri');
  let passwordlessId: string = randomUUID();
  await connection.query(
    'INSERT INTO kullanicilar (kimlik, eposta, guncelleme_zamani) VALUES (?, ?, NOW(3))',
    [passwordlessId, 'passwordless@example.com'],
  );
  const passwordMigration = await readFile(
    new URL(
      '../prisma/migrations/20261106130000_kullanici_sifre_birlestirme/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  for (const statement of passwordMigration.split(';').filter((part) => part.trim()))
    await connection.query(statement);
  const [mergedPassword] = await connection.query(
    'SELECT sifre_ozeti, sifre_olusturma_zamani, sifre_guncelleme_zamani FROM kullanicilar WHERE kimlik = ?',
    [userId],
  );
  assert.equal(mergedPassword.sifre_ozeti, oldPassword.sifre_ozeti);
  assert.deepEqual(mergedPassword.sifre_olusturma_zamani, oldPassword.olusturma_zamani);
  assert.deepEqual(mergedPassword.sifre_guncelleme_zamani, oldPassword.guncelleme_zamani);
  assert.equal((await connection.query("SHOW TABLES LIKE 'sifre_bilgileri'")).length, 0);
  const [passwordless] = await connection.query(
    'SELECT sifre_ozeti, sifre_olusturma_zamani, sifre_guncelleme_zamani FROM kullanicilar WHERE kimlik = ?',
    [passwordlessId],
  );
  assert.deepEqual(Object.values(passwordless), [null, null, null]);
  for (const name of [
    '20261105170000_stok_kartlari',
    '20261105190000_markalar',
    '20261106120000_bagimsiz_markalar',
    '20261106121000_hesaplanan_fiyatlar',
  ]) {
    const migration = await readFile(
      new URL('../prisma/migrations/' + name + '/migration.sql', import.meta.url),
      'utf8',
    );
    for (const statement of migration.split(';').filter((part) => part.trim()))
      await connection.query(statement);
  }
  const hashMigration = await readFile(
    new URL('../prisma/migrations/20261106140000_hash_alan_adlari/migration.sql', import.meta.url),
    'utf8',
  );
  for (const statement of hashMigration.split(';').filter((part) => part.trim()))
    await connection.query(statement);
  const [renamedPassword] = await connection.query(
    'SELECT sifre_hash FROM kullanicilar WHERE kimlik = ?',
    [userId],
  );
  assert.equal(renamedPassword.sifre_hash, oldPassword.sifre_ozeti);
  const redisMigration = await readFile(
    new URL(
      '../prisma/migrations/20261106150000_eposta_kodlari_redis/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  for (const statement of redisMigration.split(';').filter((part) => part.trim()))
    await connection.query(statement);
  assert.equal((await connection.query("SHOW TABLES LIKE 'eposta_giris_kodlari'")).length, 0);
  const numericMigration = await readFile(
    new URL(
      '../prisma/migrations/20261106160000_sirali_sayisal_kimlikler/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  for (const statement of numericMigration.split(';').filter((part) => part.trim()))
    await connection.query(statement);
  const [migratedUser] = await connection.query(
    'SELECT kimlik FROM kullanicilar WHERE eposta = ?',
    ['test@example.com'],
  );
  const [migratedPasswordless] = await connection.query(
    'SELECT kimlik FROM kullanicilar WHERE eposta = ?',
    ['passwordless@example.com'],
  );
  assert(Number.isInteger(migratedUser.kimlik));
  userId = String(migratedUser.kimlik);
  passwordlessId = String(migratedPasswordless.kimlik);
  url.pathname = '/' + database;
  const prisma = createPrismaClient(url.href);
  try {
    const repo = new PrismaAuthRepository(prisma);
    assert.equal((await repo.findPasswordLogin('test@example.com'))?.passwordHash, 'test-hash');
    for (const provider of ['GOOGLE', 'APPLE'] as const)
      assert.equal((await repo.findUserByIdentity(provider, 'test-' + provider))?.id, userId);
    assert.equal((await repo.findActiveSession('a'.repeat(64), new Date()))?.user.id, userId);
    assert.equal((await repo.findUserById(userId))?.status, 'ACTIVE');
    assert.equal(await repo.findPasswordLogin('passwordless@example.com'), null);
    await prisma.kullanici.delete({ where: { kimlik: Number(passwordlessId) } });
    await prisma.kullanici.update({
      where: { kimlik: Number(userId) },
      data: { durum: 'DEVRE_DISI' },
    });
    assert.equal((await repo.findUserByEmail('test@example.com'))?.status, 'DISABLED');
    await prisma.kullanici.update({ where: { kimlik: Number(userId) }, data: { durum: 'AKTIF' } });
    const at = new Date();
    await repo.markEmailVerified(userId, at);
    assert.equal((await repo.findUserById(userId))?.emailVerifiedAt?.getTime(), at.getTime());
    // SQL sürücüsüyle Prisma'nın saat dilimi dönüşümleri farklı olabilir.
    // Taşınan DATETIME değerini aynı bağlantı üzerinden karşılaştırırız.
    const [unchangedPassword] = await connection.query(
      'SELECT sifre_guncelleme_zamani FROM kullanicilar WHERE kimlik = ?',
      [userId],
    );
    assert.deepEqual(unchangedPassword.sifre_guncelleme_zamani, oldPassword.guncelleme_zamani);
    const verified = await repo.createVerifiedUser({
      email: 'new@example.com',
      emailVerifiedAt: at,
    });
    assert.equal(await repo.findPasswordLogin('new@example.com'), null);
    await repo.upsertPasswordUser({
      email: 'new@example.com',
      passwordHash: 'first',
      displayName: 'Yeni',
    });
    const firstPassword = await prisma.kullanici.findUniqueOrThrow({
      where: { kimlik: Number(verified.id) },
    });
    assert(firstPassword.sifreOlusturmaZamani);
    assert(firstPassword.sifreGuncellemeZamani);
    await repo.upsertPasswordUser({
      email: 'new@example.com',
      passwordHash: 'second',
      displayName: 'Yeni',
    });
    assert.equal((await repo.findPasswordLogin('new@example.com'))?.passwordHash, 'second');
    const secondPassword = await prisma.kullanici.findUniqueOrThrow({
      where: { kimlik: Number(verified.id) },
    });
    assert.equal(
      secondPassword.sifreOlusturmaZamani?.getTime(),
      firstPassword.sifreOlusturmaZamani.getTime(),
    );
    assert(secondPassword.sifreGuncellemeZamani! >= firstPassword.sifreGuncellemeZamani);
    const publicUser = await repo.findUserById(verified.id);
    assert(publicUser);
    for (const field of [
      'sifreHash',
      'passwordHash',
      'sifreOlusturmaZamani',
      'sifreGuncellemeZamani',
    ])
      assert.equal(Object.hasOwn(publicUser, field), false);
    const passwordUser = await repo.upsertPasswordUser({
      email: 'password@example.com',
      passwordHash: 'seed-hash',
      displayName: 'Şifreli',
    });
    assert.equal((await repo.findPasswordLogin('password@example.com'))?.passwordHash, 'seed-hash');
    await repo.linkIdentity({
      userId: verified.id,
      provider: 'APPLE',
      providerUserId: 'new-apple',
      email: verified.email,
    });
    await repo.touchIdentity('APPLE', 'new-apple', at);
    assert.equal((await repo.findUserByIdentity('APPLE', 'new-apple'))?.id, verified.id);
    const oauth = await repo.createUserWithIdentity({
      email: 'oauth@example.com',
      emailVerifiedAt: at,
      displayName: 'OAuth',
      avatarUrl: null,
      provider: 'GOOGLE',
      providerUserId: 'new-google',
    });
    assert.equal((await repo.findUserByIdentity('GOOGLE', 'new-google'))?.id, oauth.id);
    assert.equal(await repo.findPasswordLogin('oauth@example.com'), null);
    const oauthRow = await prisma.kullanici.findUniqueOrThrow({
      where: { kimlik: Number(oauth.id) },
    });
    assert.equal(oauthRow.sifreHash, null);
    assert.equal(oauthRow.sifreOlusturmaZamani, null);
    assert.equal(oauthRow.sifreGuncellemeZamani, null);
    const session = await repo.createSession({
      userId: verified.id,
      tokenHash: 'e'.repeat(64),
      expiresAt: new Date(Date.now() + 60000),
      loginMethod: 'EMAIL',
      ipAddress: null,
      userAgent: null,
    });
    assert.equal(
      (await prisma.kullanici.findUnique({ where: { kimlik: Number(verified.id) } }))
        ?.sonGirisYontemi,
      'EPOSTA',
    );
    const [physical] = await connection.query(
      'SELECT son_giris_yontemi FROM kullanicilar WHERE kimlik = ?',
      [verified.id],
    );
    assert.equal(physical.son_giris_yontemi, 'EMAIL');
    await repo.touchSession(session.id, at);
    assert.equal(
      (await repo.findActiveSession('e'.repeat(64), at))?.session.lastSeenAt.getTime(),
      at.getTime(),
    );
    await repo.revokeSessionByTokenHash('e'.repeat(64), at);
    assert.equal(await repo.findActiveSession('e'.repeat(64), at), null);
    await prisma.kullanici.deleteMany({
      where: { kimlik: { in: [verified.id, oauth.id, passwordUser.id].map(Number) } },
    });
    await repo.createSession({
      userId,
      tokenHash: 'c'.repeat(64),
      expiresAt: new Date(Date.now() + 60000),
      loginMethod: 'APPLE',
      ipAddress: null,
      userAgent: null,
    });
    assert.equal(
      (await prisma.kullanici.findUnique({ where: { kimlik: Number(userId) } }))?.sonGirisYontemi,
      'APPLE',
    );
    await assert.rejects(prisma.kullanici.create({ data: { eposta: 'test@example.com' } }));
    await prisma.kullanici.delete({ where: { kimlik: Number(userId) } });
    assert.equal(await prisma.girisKimligi.count(), 0);
    assert.equal(await prisma.oturum.count(), 0);
    assert.equal(await prisma.kullanici.count(), 0);
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
