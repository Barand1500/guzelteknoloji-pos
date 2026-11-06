import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, readdir, rmdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mariadb from 'mariadb';
import request from 'supertest';
import sharp from 'sharp';
import { PrismaBrandRepository } from '../src/modules/brands/brand.repository';
import { createApp } from '../src/app';
import { parseEnv } from '../src/config/env';
import { hashToken } from '../src/lib/crypto';
import { createLogger } from '../src/lib/logger';
import { createPrismaClient } from '../src/lib/prisma';
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository';
import { PrismaStockRepository } from '../src/modules/stock/stock.repository';
import { InMemoryEmailCodeStore } from '../src/tests/in-memory-email-code.store';
import { stockFixture } from '../src/tests/stock.fixture';

const raw = process.env.DB_MIGRATION_TEST_URL;
if (!raw) throw new Error('DB_MIGRATION_TEST_URL gerekli.');
const url = new URL(raw);
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname),
  'Yalnızca ayrı yerel test sunucusu kullanılır.',
);
const database = 'pos_stock_test_' + randomUUID().replaceAll('-', '');
const testUploads = await mkdtemp(path.join(tmpdir(), 'pos-uploads-test-'));
const connection = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
});
let created = false;
const legacyUserId = randomUUID();
const legacyBrandId = randomUUID();
const legacyCardId = randomUUID();
const legacyLogo = await sharp({
  create: { width: 2, height: 2, channels: 4, background: '#112233' },
})
  .webp()
  .toBuffer();
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
    if (folder.name === '20261106160000_sirali_sayisal_kimlikler') {
      const listOption = randomUUID();
      const unitOption = randomUUID();
      const listId = randomUUID();
      const unitId = randomUUID();
      const priceId = randomUUID();
      for (const [id, key] of [
        [listOption, 'priceLists'],
        [unitOption, 'units'],
      ])
        await connection.query(
          'INSERT INTO stok_secenekleri (kimlik, kullanici_kimligi, liste_turu, secenek_kodu, secenek_adi, ad_hash) VALUES (?, ?, ?, ?, ?, ?)',
          [id, legacyUserId, key, 'eski', 'Eski', 'c'.repeat(64)],
        );
      await connection.query(
        'INSERT INTO stok_fiyat_listeleri (kimlik, stok_karti_kimligi, fiyat_listesi_kimligi, sira) VALUES (?, ?, ?, 0)',
        [listId, legacyCardId, listOption],
      );
      await connection.query(
        'INSERT INTO stok_birimleri (kimlik, stok_fiyat_listesi_kimligi, birim_kimligi, sira, carpan, ana_birim, varsayilan_birim, agirlik_birimi) VALUES (?, ?, ?, 0, 1, 1, 1, ?)',
        [unitId, listId, unitOption, 'kg'],
      );
      await connection.query(
        'INSERT INTO stok_fiyatlari (kimlik, stok_birimi_kimligi, fiyat_yonu, girilen_fiyat, para_birimi, kdv_dahil_girildi) VALUES (?, ?, ?, ?, ?, 0)',
        [priceId, unitId, 'satis', '25.500000', 'TRY'],
      );
      await connection.query(
        'INSERT INTO stok_ek_fiyatlari (kimlik, stok_fiyati_kimligi, sira, tutar, para_birimi) VALUES (?, ?, 0, ?, ?)',
        [randomUUID(), priceId, '5.000000', 'TRY'],
      );
      await connection.query(
        'INSERT INTO stok_barkodlari (kimlik, stok_birimi_kimligi, barkod_turu, barkod) VALUES (?, ?, ?, ?)',
        [randomUUID(), unitId, 'EAN13', '8690000000001'],
      );
    }
    if (folder.name === '20261105190000_markalar') {
      await connection.query(
        'INSERT INTO kullanicilar (kimlik, eposta, guncelleme_zamani) VALUES (?, ?, NOW(3))',
        [legacyUserId, 'legacy@example.com'],
      );
      const typeId = randomUUID();
      const kindId = randomUUID();
      for (const [id, key] of [
        [legacyBrandId, 'brands'],
        [typeId, 'stockTypes'],
        [kindId, 'stockKinds'],
      ])
        await connection.query(
          'INSERT INTO stok_secenekleri (kimlik, kullanici_kimligi, liste_turu, secenek_kodu, secenek_adi, ad_ozeti) VALUES (?, ?, ?, ?, ?, ?)',
          [id, legacyUserId, key, 'eski', 'Eski Marka', 'a'.repeat(64)],
        );
      await connection.query(
        'INSERT INTO stok_kartlari (kimlik, kullanici_kimligi, kayit_istegi_kimligi, kayit_istegi_ozeti, stok_tipi_kimligi, stok_nevi_kimligi, marka_kimligi, envanter_takibi, guncelleme_zamani) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3))',
        [
          legacyCardId,
          legacyUserId,
          randomUUID(),
          'b'.repeat(64),
          typeId,
          kindId,
          legacyBrandId,
          'normal',
        ],
      );
    }
    const sql = await readFile(new URL(folder.name + '/migration.sql', migrations), 'utf8');
    for (const statement of sql.split(';').filter((part) => part.trim()))
      await connection.query(statement);
    if (folder.name === '20261105190000_markalar')
      await connection.query(
        'UPDATE markalar SET logo_verisi = ?, logo_ozeti = ?, aciklama = ? WHERE kimlik = ?',
        [legacyLogo, 'c'.repeat(64), 'Legacy description', legacyBrandId],
      );
  }
  url.pathname = '/' + database;
  assert.equal((await connection.query("SHOW TABLES LIKE 'isletmeler'")).length, 0);
  assert.equal(
    (await connection.query("SHOW COLUMNS FROM kullanicilar LIKE 'isletme_kimligi'")).length,
    0,
  );
  const prisma = createPrismaClient(url.href);
  try {
    const brandRepo = new PrismaBrandRepository(prisma, testUploads);
    await brandRepo.migrateLegacyLogos();
    await brandRepo.migrateLegacyLogos();
    assert.equal((await connection.query("SHOW TABLES LIKE 'eposta_giris_kodlari'")).length, 0);
    const migratedUser = await prisma.kullanici.findUniqueOrThrow({
      where: { eposta: 'legacy@example.com' },
    });
    const migratedBrand = await prisma.marka.findFirstOrThrow({
      where: { kullaniciKimligi: migratedUser.kimlik, markaKodu: 'eski' },
    });
    const migratedCard = await prisma.stokKarti.findFirstOrThrow({
      where: { kullaniciKimligi: migratedUser.kimlik },
    });
    const migratedList = await prisma.stokFiyatListesi.findFirstOrThrow({
      where: { stokKartiKimligi: migratedCard.kimlik },
      include: {
        birimler: { include: { barkodlar: true, fiyatlar: { include: { ekFiyatlar: true } } } },
      },
    });
    assert.equal(migratedList.birimler[0]?.barkodlar[0]?.barkod, '8690000000001');
    assert.equal(migratedList.birimler[0]?.fiyatlar[0]?.girilenFiyat?.toString(), '25.5');
    assert.equal(migratedList.birimler[0]?.fiyatlar[0]?.ekFiyatlar[0]?.tutar?.toString(), '5');
    const legacyBrand = (await brandRepo.list(String(migratedUser.kimlik)))[0]!;
    assert.equal(legacyBrand.id, String(migratedBrand.kimlik));
    assert.equal(legacyBrand.name, 'Eski Marka');
    assert.equal(legacyBrand.productCount, 1);
    assert.equal(legacyBrand.description, 'Legacy description');
    assert.deepEqual(
      (await brandRepo.logo(String(migratedUser.kimlik), String(migratedBrand.kimlik))).data,
      legacyLogo,
    );
    const movedLegacy = await prisma.marka.findUniqueOrThrow({
      where: { kimlik: migratedBrand.kimlik },
    });
    assert.equal(movedLegacy.logoVerisi, null);
    assert(movedLegacy.logoDosyasi);
    assert.deepEqual(
      await readFile(path.join(testUploads, 'markalar', movedLegacy.logoDosyasi)),
      legacyLogo,
    );
    assert.equal(
      (await prisma.stokKarti.findUniqueOrThrow({ where: { kimlik: migratedCard.kimlik } }))
        .markaKimligi,
      migratedBrand.kimlik,
    );
    assert(await prisma.marka.findUnique({ where: { kimlik: migratedBrand.kimlik } }));
    await prisma.kullanici.delete({ where: { kimlik: migratedUser.kimlik } });
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
      codes: new InMemoryEmailCodeStore(),
      hasher: { hash: async () => '', verify: async () => false },
      mailer: { sendLoginCode: async () => {} },
      google: null,
      stockRepo: new PrismaStockRepository(prisma),
      brandRepo,
    });
    const users = await Promise.all(
      ['one', 'two'].map((name) =>
        prisma.kullanici.create({ data: { eposta: name + '@example.com' } }),
      ),
    );
    const tokens = [randomUUID(), randomUUID()];
    for (const [index, user] of users.entries())
      await repo.createSession({
        userId: String(user.kimlik),
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
    const brandGet = (path = '', index = 0) =>
      request(app)
        .get('/api/markalar' + path)
        .set('Cookie', cookie(index));
    const brandPost = (path: string, body: object = {}, index = 0) =>
      request(app)
        .post('/api/markalar' + path)
        .set('Cookie', cookie(index))
        .set('Origin', env.APP_URL)
        .send(body);
    assert.equal((await request(app).get('/api/markalar')).status, 401);
    assert.equal(
      (await request(app).post('/api/markalar').set('Cookie', cookie()).send({})).status,
      403,
    );
    assert.deepEqual((await brandGet()).body, []);
    const logo = await sharp({
      create: { width: 2, height: 2, channels: 4, background: '#ff6600' },
    })
      .png()
      .toBuffer();
    const brandDraft = {
      name: 'İnci',
      description: 'Türkçe açıklama',
      logoUrl: 'data:image/png;base64,' + logo.toString('base64'),
      active: true,
      seoTitle: 'İnci ürünleri',
      seoDescription: 'Kaliteli ürünler',
    };
    const firstBrand = await brandPost('', brandDraft);
    assert.match(firstBrand.body.id, /^[1-9]\d*$/);
    assert.equal(firstBrand.status, 201, JSON.stringify(firstBrand.body));
    const brandId = firstBrand.body.id as string;
    const logoPath = new URL(firstBrand.body.logoUrl as string, env.APP_URL).pathname;
    const logoResponse = await brandGet(logoPath.replace('/api/markalar', ''));
    const base64Logo = await brandGet('/' + brandId + '/logo?bicim=base64');
    assert.equal(base64Logo.status, 200);
    assert.equal(base64Logo.body.mimeType, 'image/png');
    assert.deepEqual(
      Buffer.from((base64Logo.body.dataUrl as string).split(',')[1]!, 'base64'),
      logoResponse.body,
    );
    const downloadedLogo = await brandGet('/' + brandId + '/logo?indir=1');
    assert.equal(downloadedLogo.status, 200);
    assert.match(downloadedLogo.headers['content-disposition'] as string, /^attachment;/);
    assert.equal(logoResponse.status, 200);
    assert.equal(logoResponse.headers['content-type'], 'image/png');
    assert.deepEqual(logoResponse.body, logo);
    const savedBrand = await prisma.marka.findUniqueOrThrow({ where: { kimlik: Number(brandId) } });
    assert.equal(savedBrand.logoVerisi, null);
    assert(savedBrand.logoDosyasi);
    assert.deepEqual(
      await readFile(path.join(testUploads, 'markalar', savedBrand.logoDosyasi)),
      logo,
    );
    assert.deepEqual(
      (await new PrismaBrandRepository(prisma, testUploads).logo(String(users[0]!.kimlik), brandId))
        .data,
      logo,
    );
    assert.equal((await brandGet(logoPath.replace('/api/markalar', ''), 1)).status, 404);
    const filesBeforeDuplicate = await readdir(path.join(testUploads, 'markalar'));
    assert.equal((await brandPost('', { ...brandDraft, name: 'inci' })).status, 409);
    assert.deepEqual(await readdir(path.join(testUploads, 'markalar')), filesBeforeDuplicate);
    assert.equal((await brandPost('', { ...brandDraft, logoUrl: 'blob:temporary' })).status, 400);
    assert.equal((await brandPost('', { ...brandDraft, name: '' })).status, 400);
    assert.equal((await brandPost('', { ...brandDraft, name: 'A'.repeat(121) })).status, 400);
    assert.equal(
      (
        await brandPost('', {
          ...brandDraft,
          logoUrl: 'data:image/png;base64,' + Buffer.from('not an image').toString('base64'),
        })
      ).status,
      400,
    );
    assert.equal(
      (await brandPost('/' + brandId, { ...brandDraft, logoUrl: firstBrand.body.logoUrl }, 1))
        .status,
      404,
    );
    assert.equal(
      (
        await brandPost('/' + brandId, {
          ...brandDraft,
          logoUrl: firstBrand.body.logoUrl,
          description: 'Güncellendi',
        })
      ).status,
      200,
    );
    assert.equal((await brandGet()).body[0].description, 'Güncellendi');
    const secondBrand = await brandPost('', { ...brandDraft, name: 'Diğer', logoUrl: null });
    assert(Number(secondBrand.body.id) > Number(firstBrand.body.id));
    assert.equal(secondBrand.status, 201);
    const secondBrandId = secondBrand.body.id as string;
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="10" height="10"/></svg>',
    );
    const svgDraft = {
      ...brandDraft,
      name: 'Diğer',
      logoUrl: 'data:image/svg+xml;base64,' + svg.toString('base64'),
    };
    assert.equal((await brandPost('/' + secondBrandId, svgDraft)).status, 200);
    const svgBrand = await prisma.marka.findUniqueOrThrow({
      where: { kimlik: Number(secondBrandId) },
    });
    assert(svgBrand.logoDosyasi);
    assert.deepEqual(await readFile(path.join(testUploads, 'markalar', svgBrand.logoDosyasi)), svg);
    const svgResponse = await brandGet('/' + secondBrandId + '/logo');
    assert.match(svgResponse.headers['content-type'] as string, /^image\/svg\+xml/);
    assert.match(svgResponse.headers['content-security-policy'] as string, /sandbox/);
    const svgBase64 = await brandGet('/' + secondBrandId + '/logo?bicim=base64');
    assert.equal(svgBase64.body.dataUrl, svgDraft.logoUrl);
    assert.equal(
      (await brandPost('/' + secondBrandId, { ...svgDraft, logoUrl: brandDraft.logoUrl })).status,
      200,
    );
    await assert.rejects(readFile(path.join(testUploads, 'markalar', svgBrand.logoDosyasi)));
    const replacement = await prisma.marka.findUniqueOrThrow({
      where: { kimlik: Number(secondBrandId) },
    });
    assert(replacement.logoDosyasi);
    assert.deepEqual(
      await readFile(path.join(testUploads, 'markalar', replacement.logoDosyasi)),
      logo,
    );
    assert.equal(
      (await brandPost('/' + secondBrandId, { ...svgDraft, logoUrl: null })).status,
      200,
    );
    await assert.rejects(readFile(path.join(testUploads, 'markalar', replacement.logoDosyasi)));
    assert.equal((await brandPost('/sirala', { ids: [secondBrandId, brandId] })).status, 204);
    assert.equal((await brandGet()).body[0].id, secondBrandId);
    assert.equal((await brandPost('/sirala', { ids: [brandId, brandId] })).status, 409);
    assert.equal((await brandPost('/sirala', { ids: [brandId] })).status, 409);
    assert.equal((await brandPost('/' + brandId + '/aktiflik', { active: false }, 1)).status, 404);
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
    assert.match(id, /^[1-9]\d*$/);
    const readCreated = await request(app)
      .get('/api/stok/kartlar/' + id)
      .set('Cookie', cookie());
    assert.equal(readCreated.status, 200);
    assert.equal(readCreated.body.id, id);
    assert.equal(
      (await brandPost('/' + brandId + '/urunler/ata', { productIds: [id] })).status,
      204,
    );
    assert.equal(
      (await brandGet()).body.find((b: { id: string }) => b.id === brandId).productCount,
      1,
    );
    assert.equal(
      (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === id).brandId,
      brandId,
    );
    await connection.query(
      "CREATE TRIGGER reject_brand_delete BEFORE DELETE ON markalar FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced-brand-delete-failure'",
    );
    try {
      assert.equal((await brandPost('/' + brandId + '/sil')).status, 500);
      assert.deepEqual(
        await readFile(path.join(testUploads, 'markalar', savedBrand.logoDosyasi)),
        logo,
      );
      assert.equal(
        (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === id).brandId,
        brandId,
      );
      assert((await brandGet()).body.some((b: { id: string }) => b.id === brandId));
    } finally {
      await connection.query('DROP TRIGGER reject_brand_delete');
    }
    assert.equal(
      (await brandPost('/' + secondBrandId + '/urunler/ata', { productIds: [id, '2147483647'] }))
        .status,
      404,
    );
    assert.equal(
      (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === id).brandId,
      brandId,
    );
    assert.equal(
      (await brandPost('/' + brandId + '/urunler/cikar', { productIds: [id] })).status,
      204,
    );
    assert.equal(
      (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === id).brandId,
      null,
    );
    assert.equal(
      (await brandPost('/' + brandId + '/urunler/ata', { productIds: [id] })).status,
      204,
    );
    assert.equal(
      (await brandPost('/' + secondBrandId + '/urunler/cikar', { productIds: [id] })).status,
      204,
    );
    assert.equal(
      (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === id).brandId,
      brandId,
    );
    assert.equal(
      (await brandPost('/' + secondBrandId + '/urunler/ata', { productIds: [id] })).status,
      204,
    );
    assert.equal(
      (await brandPost('/' + secondBrandId + '/urunler/ata', { productIds: [id] }, 1)).status,
      404,
    );
    assert.equal((await brandPost('/' + brandId + '/aktiflik', { active: false })).status, 204);
    const inactiveLookups = await request(app).get('/api/stok/secenekler').set('Cookie', cookie());
    assert(!inactiveLookups.body.brands.some((b: { value: string }) => b.value === brandId));
    const inactiveDraft = structuredClone(draft);
    inactiveDraft.brand = brandId;
    assert.equal(
      (await post('/kartlar', { requestId: randomUUID(), draft: inactiveDraft })).status,
      400,
    );
    assert.equal((await brandPost('/' + brandId + '/aktiflik', { active: true })).status, 204);
    const lookupsWithBrands = await request(app)
      .get('/api/stok/secenekler')
      .set('Cookie', cookie());
    assert.deepEqual(
      lookupsWithBrands.body.brands.map((b: { value: string }) => b.value),
      [secondBrandId, brandId],
    );
    assert.deepEqual(
      lookupsWithBrands.body.brands.map((b: { label: string }) => b.label),
      ['Diğer', 'İnci'],
    );
    const withBrand = structuredClone(draft);
    withBrand.brand = brandId;
    withBrand.code = 'BRANDED';
    for (const rows of Object.values(withBrand.units)) for (const row of rows) row.barcodes = [];
    const brandedCard = await post('/kartlar', { requestId: randomUUID(), draft: withBrand });
    assert.equal(brandedCard.status, 201);
    const cardWithBrand = await prisma.stokKarti.findUniqueOrThrow({
      where: { kimlik: Number(brandedCard.body.id) },
      include: { marka: true },
    });
    assert.equal(cardWithBrand.marka?.markaAdi, 'İnci');
    assert.equal(cardWithBrand.markaKimligi, Number(brandId));
    assert.equal(
      (await brandGet()).body.find((b: { id: string }) => b.id === brandId).productCount,
      1,
    );
    assert.equal((await brandPost('/' + brandId + '/sil')).status, 204);
    await assert.rejects(readFile(path.join(testUploads, 'markalar', savedBrand.logoDosyasi)));
    assert.equal(
      (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === brandedCard.body.id)
        .brandId,
      null,
    );
    assert.equal((await brandGet(logoPath.replace('/api/markalar', ''))).status, 404);
    assert.equal((await brandPost('/' + secondBrandId + '/sil', {}, 1)).status, 404);
    assert.equal((await brandPost('/' + secondBrandId + '/sil')).status, 204);
    assert.equal(
      (await brandGet('/urunler')).body.find((p: { id: string }) => p.id === id).brandId,
      null,
    );
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
      where: { kimlik: Number(saved.body.id) },
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
              'brands.persistence.spec.ts',
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
  const logoDir = path.join(testUploads, 'markalar');
  for (const file of await readdir(logoDir).catch(() => [])) await unlink(path.join(logoDir, file));
  await rmdir(logoDir).catch(() => {});
  await rmdir(testUploads);
}
