import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import mariadb from 'mariadb';
import request from 'supertest';
import { createApp } from '../src/app';
import { parseEnv } from '../src/config/env';
import { hashToken } from '../src/lib/crypto';
import { createLogger } from '../src/lib/logger';
import { createPrismaClient } from '../src/lib/prisma';
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository';
import { PrismaStockRepository } from '../src/modules/stock/stock.repository';
import { stockFixture } from '../src/tests/stock.fixture';

const raw = process.env.DB_MIGRATION_TEST_URL;
if (!raw) throw new Error('DB_MIGRATION_TEST_URL gerekli.');
const url = new URL(raw);
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname),
  'Yalnızca ayrı yerel test sunucusu kullanılır.',
);
const database = 'pos_stock_test_' + randomUUID().replaceAll('-', '');
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
  const migrations = new URL('../prisma/migrations/', import.meta.url);
  for (const folder of (await readdir(migrations, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const sql = await readFile(new URL(folder.name + '/migration.sql', migrations), 'utf8');
    for (const statement of sql.split(';').filter((part) => part.trim()))
      await connection.query(statement);
  }
  url.pathname = '/' + database;
  const prisma = createPrismaClient(url.href);
  try {
    const env = parseEnv({
      NODE_ENV: 'test',
      APP_URL: 'http://localhost:5175',
      COOKIE_SECRET: 'local-test-secret-long-enough-123456',
      DATABASE_URL: url.href,
      LOG_LEVEL: 'silent',
    });
    const repo = new PrismaAuthRepository(prisma);
    const app = createApp({
      env,
      logger: createLogger('silent'),
      repo,
      hasher: { hash: async () => '', verify: async () => false },
      mailer: { sendLoginCode: async () => {} },
      google: null,
      stockRepo: new PrismaStockRepository(prisma),
    });
    const users = await Promise.all(
      ['one', 'two'].map((name) =>
        prisma.kullanici.create({ data: { eposta: name + '@example.com' } }),
      ),
    );
    const tokens = [randomUUID(), randomUUID()];
    for (const [index, user] of users.entries())
      await repo.createSession({
        userId: user.kimlik,
        loginMethod: 'EMAIL',
        tokenHash: hashToken(tokens[index]!),
        expiresAt: new Date(Date.now() + 3600000),
        ipAddress: null,
        userAgent: null,
      });
    const cookie = (index = 0) => 'gt_session=' + tokens[index];
    const post = (path: string, body: object, index = 0) =>
      request(app)
        .post('/api/stok' + path)
        .set('Cookie', cookie(index))
        .set('Origin', env.APP_URL)
        .send(body);
    assert.equal((await request(app).get('/api/stok/secenekler')).status, 401);
    assert.equal(
      (await request(app).post('/api/stok/kartlar').set('Cookie', cookie()).send({})).status,
      403,
    );
    assert.equal(
      (await request(app).get('/api/stok/secenekler').set('Cookie', cookie())).status,
      200,
    );
    const option = await post('/secenekler/ekle', { list: 'units', label: 'PALET' });
    assert.equal(option.status, 201);
    assert.equal(
      (await post('/secenekler/ekle', { list: 'units', label: 'palet' })).body.value,
      option.body.value,
    );
    const reloaded = await request(app).get('/api/stok/secenekler').set('Cookie', cookie());
    assert(reloaded.body.units.some((unit: { label: string }) => unit.label === 'PALET'));
    const draft = stockFixture();
    draft.units.fiyat!.push({
      ...structuredClone(draft.units.fiyat![0]!),
      id: 'second-row',
      unit: option.body.value,
      multiplier: '12',
      isMain: false,
      isDefault: false,
    });
    draft.units.perakende = structuredClone([draft.units.fiyat![0]!]);
    const payload = { requestId: randomUUID(), draft };
    const response = await post('/kartlar', payload);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const id = response.body.id as string;
    assert.equal((await post('/kartlar', payload)).body.id, id);
    const concurrentDraft = structuredClone(draft);
    concurrentDraft.code = 'CONCURRENT';
    for (const rows of Object.values(concurrentDraft.units))
      for (const row of rows) for (const barcode of row.barcodes) barcode.code = '8690000000002';
    const concurrentPayload = { requestId: randomUUID(), draft: concurrentDraft };
    const concurrent = await Promise.all([
      post('/kartlar', concurrentPayload),
      post('/kartlar', concurrentPayload),
    ]);
    assert(concurrent.every((r) => r.status === 201));
    assert.equal(concurrent[0]!.body.id, concurrent[1]!.body.id);
    assert.equal(
      (await post('/kartlar', { ...payload, draft: { ...draft, name: 'Farklı' } })).status,
      409,
    );
    assert.equal((await post('/kartlar', { requestId: randomUUID(), draft })).status, 409);
    const barcodeConflict = await post('/kartlar', {
      requestId: randomUUID(),
      draft: { ...draft, code: 'BARCODE-CONFLICT' },
    });
    assert.equal(barcodeConflict.status, 409);
    assert.match(barcodeConflict.body.error.message as string, /barkod/);
    assert.equal(
      (await post('/kartlar', { requestId: randomUUID(), draft: stockFixture() }, 1)).status,
      201,
    );
    const card = await request(app)
      .get('/api/stok/kartlar/' + id)
      .set('Cookie', cookie());
    assert.equal(card.status, 200);
    assert.equal(card.body.priceLists.length, 2);
    assert.equal(card.body.priceLists[0].units.length, 2);
    const unit = card.body.priceLists[0].units[0];
    assert.equal(unit.weight, '250');
    assert.equal(unit.weightUnit, 'g');
    assert.equal(unit.volume, '1.5');
    assert.equal(unit.barcodes[0].code, '8690000000001');
    const purchase = unit.prices.find((price: { side: string }) => price.side === 'alis');
    assert.equal(purchase.amount, '100.125');
    assert.equal(purchase.net, '90.1125');
    assert.equal(purchase.includingVat, '108.135');
    assert.equal(purchase.extras[0].amount, '50.5');
    assert.equal(purchase.extras[0].currency, 'EUR');
    assert.equal(
      unit.prices.find((price: { side: string }) => price.side === 'satis').excludingVat,
      '100',
    );
    assert.equal(
      (
        await request(app)
          .get('/api/stok/kartlar/' + id)
          .set('Cookie', cookie(1))
      ).status,
      404,
    );
    assert.equal((await post('/kartlar', { requestId: randomUUID(), draft }, 1)).status, 400); // Başkasının özel birimi kullanılamaz.
    const invalidDraft = {
      ...draft,
      code: 'ROLLBACK',
      units: { fiyat: [{ ...draft.units.fiyat![0]!, unit: 'missing' }] },
    };
    const before = await prisma.stokKarti.count();
    assert.equal(
      (await post('/kartlar', { requestId: randomUUID(), draft: invalidDraft })).status,
      400,
    );
    assert.equal(await prisma.stokKarti.count(), before);
    assert.equal((await post('/secenekler/kaldir', { list: 'units', value: 'adet' })).status, 400);
    assert.equal(
      (await post('/secenekler/kaldir', { list: 'units', value: option.body.value })).status,
      204,
    );
    assert.equal(
      (
        await request(app)
          .get('/api/stok/kartlar/' + id)
          .set('Cookie', cookie())
      ).status,
      200,
    );
    const expired = {
      requestId: randomUUID(),
      draft: {
        ...draft,
        code: 'EXPIRED',
        inventoryTracking: 'omur',
        shelfLifeDays: '30',
        riskDays: '5',
      },
    };
    // Pasif seçenek yeni kartta kullanılamaz; hiçbir parça yazılmaz.
    assert.equal((await post('/kartlar', expired)).status, 400);
    const plain = stockFixture();
    plain.units.fiyat![0]!.barcodes[0]!.code = '8690000000003';
    plain.inventoryTracking = 'omur';
    plain.shelfLifeDays = '30';
    plain.riskDays = '5';
    plain.code = 'DAYS';
    const saved = await post('/kartlar', { requestId: randomUUID(), draft: plain });
    assert.equal(saved.status, 201);
    const days = await prisma.stokKarti.findUniqueOrThrow({
      where: { kimlik: saved.body.id as string },
    });
    assert.equal(days.rafOmruGun, 30);
    assert.equal(days.altLimit, null);
    const large = stockFixture();
    large.code = 'LARGE';
    large.units.fiyat = Array.from({ length: 15 }, (_, index) => ({
      ...structuredClone(large.units.fiyat![0]!),
      id: 'large-' + index,
      isMain: index === 0,
      isDefault: index === 0,
      note: 'A'.repeat(600),
      barcodes: [],
    }));
    assert(JSON.stringify(large).length > 10240);
    assert.equal((await post('/kartlar', { requestId: randomUUID(), draft: large })).status, 201);
    const invalidSize = { requestId: randomUUID(), draft: { ...large, name: 'A'.repeat(600000) } };
    assert.equal((await post('/kartlar', invalidSize)).status, 413);
    const beforeFailure = {
      cards: await prisma.stokKarti.count(),
      units: await prisma.stokBirimi.count(),
      prices: await prisma.stokFiyati.count(),
    };
    await connection.query(
      "CREATE TRIGGER reject_stock_price BEFORE INSERT ON stok_fiyatlari FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced-test-failure'",
    );
    try {
      const rejected = stockFixture();
      rejected.code = 'DATABASE-ROLLBACK';
      rejected.units.fiyat![0]!.barcodes = [];
      assert.equal(
        (await post('/kartlar', { requestId: randomUUID(), draft: rejected })).status,
        500,
      );
      assert.deepEqual(
        {
          cards: await prisma.stokKarti.count(),
          units: await prisma.stokBirimi.count(),
          prices: await prisma.stokFiyati.count(),
        },
        beforeFailure,
      );
    } finally {
      await connection.query('DROP TRIGGER reject_stock_price');
    }
    if (process.env.STOCK_BROWSER_TEST === '1') {
      const server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const address = server.address();
      assert(address && typeof address !== 'string');
      try {
        await new Promise<void>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [
              fileURLToPath(
                new URL('../../../node_modules/@playwright/test/cli.js', import.meta.url),
              ),
              'test',
              'stock.persistence.spec.ts',
              '--workers=2',
            ],
            {
              cwd: fileURLToPath(new URL('../../web/', import.meta.url)),
              stdio: 'inherit',
              env: {
                ...process.env,
                STOCK_TEST_API_URL: 'http://127.0.0.1:' + address.port,
                STOCK_TEST_TOKEN: tokens[0]!,
              },
            },
          );
          child.on('error', reject);
          child.on('exit', (code) =>
            code === 0 ? resolve() : reject(new Error('Tarayıcı stok kayıt testi başarısız.')),
          );
        });
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
    console.log(
      'PASS: real MySQL + HTTP: migrations, persistent options, nested stock data, exact decimals, retries/concurrency, ownership, validation and atomic writes.',
    );
  } finally {
    await prisma.$disconnect();
  }
} finally {
  if (created) await connection.query('DROP DATABASE ' + database);
  await connection.end();
}
