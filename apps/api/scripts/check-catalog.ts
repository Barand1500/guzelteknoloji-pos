import assert from 'node:assert/strict';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '../src/lib/prisma';

/** Gerçek MySQL ve HTTP üzerinde dört ekranın yeni kayıt ilişkilerini doğrular. */
export async function checkCatalog(
  app: Express,
  db: PrismaClient,
  cookies: string[],
  origin: string,
  cardId: number,
  imageUrl: string,
) {
  const get = (path: string, user = 0) =>
    request(app)
      .get(path.startsWith('/api/') ? path : '/api' + path)
      .set('Cookie', cookies[user]!);
  const post = (path: string, body: object = {}, user = 0) =>
    request(app)
      .post('/api' + path)
      .set('Cookie', cookies[user]!)
      .set('Origin', origin)
      .send(body);
  for (const path of ['/firsatlar', '/ozellikler']) {
    assert.equal((await request(app).get('/api' + path)).status, 401);
    assert.equal(
      (
        await request(app)
          .post('/api' + path)
          .set('Cookie', cookies[0]!)
          .send({})
      ).status,
      403,
    );
  }
  const category = await post('/kategoriler', {
    parentId: null,
    name: 'Katalog doğrulama',
    description: '',
    imageUrl: null,
    active: true,
    hidden: false,
    seoTitle: '',
    seoDescription: '',
  });
  assert.equal(category.status, 201, JSON.stringify(category.body));
  const categoryId = category.body.id as string;
  const draft = {
    name: 'Kalıcı fırsat',
    iconUrl: imageUrl,
    active: true,
    showOnImage: true,
    position: 'br',
    size: 'large',
    seoTitle: 'Fırsat SEO',
    seoDescription: 'Türkçe açıklama',
  };
  const created = await post('/firsatlar', draft);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const dealId = created.body.id as string;
  assert.match(dealId, /^[1-9]\d*$/);
  assert.equal((await get('/firsatlar', 1)).body.length, 0);
  assert.equal((await get(created.body.iconUrl as string)).status, 200);
  assert.equal((await get(created.body.iconUrl as string, 1)).status, 404);
  assert.equal((await post('/firsatlar', draft)).status, 409);
  assert.equal(
    (await post(`/firsatlar/${dealId}/urunler/ata`, { productIds: [cardId, 2147483647] })).status,
    404,
  );
  assert.equal(await db.stokFirsati.count({ where: { firsatId: Number(dealId) } }), 0);
  assert.equal(
    (await post(`/firsatlar/${dealId}/urunler/ata`, { productIds: [cardId] })).status,
    204,
  );
  assert.equal(
    (await post(`/firsatlar/${dealId}/urunler/ata`, { productIds: [cardId] })).status,
    204,
  );
  assert.equal((await get('/firsatlar')).body[0].productCount, 1);
  assert(
    (await get('/firsatlar/urunler')).body
      .find((p: { id: string }) => p.id === String(cardId))
      .dealIds.includes(dealId),
  );
  assert((await get(`/stok/kartlar?kimlik=${cardId}`)).body.items[0].dealIds.includes(dealId));
  assert.equal(
    (
      await post(`/firsatlar/${dealId}`, {
        ...draft,
        name: 'Güncel fırsat',
        iconUrl: created.body.iconUrl,
      })
    ).status,
    200,
  );
  assert.equal((await post(`/firsatlar/${dealId}/aktiflik`, { active: false }, 1)).status, 404);
  assert.equal((await post(`/firsatlar/${dealId}/aktiflik`, { active: false })).status, 204);
  assert.equal((await get('/firsatlar')).body[0].active, false);
  assert.equal((await post('/firsatlar/sirala', { ids: [dealId] })).status, 204);
  assert.equal((await post('/firsatlar/sirala', { ids: [] })).status, 409);
  assert.equal(
    (await post(`/firsatlar/${dealId}/urunler/cikar`, { productIds: [cardId] })).status,
    204,
  );
  assert.equal((await get('/firsatlar')).body[0].productCount, 0);

  const templateDraft = { name: 'Kalıcı şablon', allProducts: false, categoryIds: [categoryId] };
  assert.equal((await post('/ozellikler/sablonlar', templateDraft, 1)).status, 404);
  const template = await post('/ozellikler/sablonlar', templateDraft);
  assert.equal(template.status, 201, JSON.stringify(template.body));
  const templateId = template.body.id as string;
  assert.equal((await post('/ozellikler/sablonlar', templateDraft)).status, 409);
  const groupDraft = {
    templateId,
    name: 'Renk',
    kind: 'color',
    filter: true,
    multiple: true,
    variant: false,
    showOnImage: false,
    position: 'tl',
    size: 'medium',
  };
  const group = await post('/ozellikler/gruplar', groupDraft);
  assert.equal(group.status, 201, JSON.stringify(group.body));
  const groupId = group.body.id as string;
  const valueDraft = { code: 'mavi', name: 'Mavi', color: '#0000ff', imageUrl: null };
  assert.equal(
    (await post(`/ozellikler/gruplar/${groupId}/degerler`, { ...valueDraft, color: null })).status,
    400,
  );
  const value = await post(`/ozellikler/gruplar/${groupId}/degerler`, valueDraft);
  assert.equal(value.status, 201, JSON.stringify(value.body));
  const valueId = value.body.id as string;
  assert.equal((await post(`/ozellikler/gruplar/${groupId}/degerler`, valueDraft)).status, 409);
  assert.equal(
    (await post(`/ozellikler/gruplar/${groupId}`, { ...groupDraft, kind: 'text' })).status,
    409,
  );
  assert.equal(
    (await post(`/ozellikler/degerler/${valueId}`, { ...valueDraft, name: 'Lacivert' }, 1)).status,
    404,
  );
  assert.equal(
    (await post(`/ozellikler/degerler/${valueId}`, { ...valueDraft, name: 'Lacivert' })).status,
    200,
  );
  const secondValue = await post(`/ozellikler/gruplar/${groupId}/degerler`, {
    ...valueDraft,
    code: 'siyah',
    name: 'Siyah',
  });
  assert.equal(secondValue.status, 201);
  assert.equal(
    (await post('/ozellikler/degerler/sirala', { groupId, ids: [secondValue.body.id, valueId] }))
      .status,
    204,
  );
  assert.equal(
    (await post('/ozellikler/degerler/sirala', { groupId, ids: [valueId] })).status,
    409,
  );
  assert.equal(
    (await post('/ozellikler/gruplar/sirala', { templateId, ids: [groupId] })).status,
    204,
  );
  assert.equal((await post('/ozellikler/sablonlar/sirala', { ids: [templateId] })).status, 204);
  const snapshot = (await get('/ozellikler')).body;
  assert.equal(snapshot.templates[0].groupCount, 1);
  assert.deepEqual(snapshot.templates[0].categoryIds, [categoryId]);
  assert.equal(snapshot.groups[0].valueCount, 2);
  assert.equal(snapshot.values[0].id, secondValue.body.id);
  assert.equal(snapshot.values[1].name, 'Lacivert');
  assert.equal((await get('/ozellikler', 1)).body.templates.length, 0);
  const imageGroup = await post('/ozellikler/gruplar', {
    ...groupDraft,
    name: 'Amblem',
    kind: 'image',
    showOnImage: true,
  });
  const imageValue = await post(`/ozellikler/gruplar/${imageGroup.body.id}/degerler`, {
    ...valueDraft,
    code: 'amblem',
    color: null,
    imageUrl,
  });
  assert.equal(imageValue.status, 201, JSON.stringify(imageValue.body));
  const imagePath = (await get('/ozellikler')).body.values.find(
    (v: { id: string }) => v.id === imageValue.body.id,
  ).imageUrl as string;
  const storedImage = await get(imagePath);
  assert.equal(storedImage.status, 200);
  assert.deepEqual(storedImage.body, Buffer.from(imageUrl.split(',')[1]!, 'base64'));
  assert.equal((await get(imagePath, 1)).status, 404);
  assert.equal(
    (
      await post(`/ozellikler/degerler/${imageValue.body.id}`, {
        ...valueDraft,
        code: 'amblem',
        color: null,
        imageUrl: imagePath,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await post(`/ozellikler/sablonlar/${templateId}`, {
        ...templateDraft,
        name: 'Ortak şablon',
        allProducts: true,
      })
    ).status,
    200,
  );
  assert.deepEqual((await get('/ozellikler')).body.templates[0].categoryIds, []);
  assert.equal((await post(`/ozellikler/gruplar/${imageGroup.body.id}/sil`, {}, 1)).status, 404);
  assert.equal((await post(`/ozellikler/gruplar/${imageGroup.body.id}/sil`)).status, 204);
  assert.equal((await get(imagePath)).status, 404);
  assert.equal((await post(`/ozellikler/sablonlar/${templateId}/sil`)).status, 204);
  assert.deepEqual((await get('/ozellikler')).body, { templates: [], groups: [], values: [] });

  const csv = `Stok Kodu;Ürün Adı;Fiyat 1;Fiyat 2;Fiyat 3;Alış Fiyatı;KDV;Stok;Kategori\nCSV-001;Kalıcı aktarım;125,55;140;160;90,25;10;5;Katalog doğrulama\nCSV-ERROR;Hatalı satır;yanlış;;;;;;`;
  const preview = await post('/stok/aktarim/onizle', { text: csv });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.newCount, 1);
  assert.equal(preview.body.errorCount, 1);
  const imported = await post('/stok/aktarim/kaydet', { text: csv });
  assert.equal(imported.status, 200, JSON.stringify(imported.body));
  assert.equal(imported.body.created, 1, JSON.stringify(imported.body));
  assert.equal(imported.body.updated, 0);
  assert.equal(imported.body.errors.length, 1);
  const importedRow = (await get('/stok/kartlar?arama=CSV-001')).body.items[0];
  assert.equal(importedRow.name, 'Kalıcı aktarım');
  assert.deepEqual(importedRow.prices, [125.55, 140, 160]);
  assert.equal(importedRow.stock, 5);
  assert(importedRow.categoryIds.includes(categoryId));
  const updateCsv = 'Stok Kodu;Ürün Adı;Fiyat 1\nCSV-001;Güncel aktarım;99';
  assert.equal((await post('/stok/aktarim/onizle', { text: updateCsv })).body.updateCount, 1);
  const importedUpdate = await post('/stok/aktarim/kaydet', { text: updateCsv });
  assert.equal(importedUpdate.body.updated, 1, JSON.stringify(importedUpdate.body));
  const updated = (await get('/stok/kartlar?arama=CSV-001')).body.items[0];
  assert.equal(updated.id, importedRow.id);
  assert.equal(updated.stock, 5);
  assert.equal(updated.cost, 90.25);
  assert.equal(updated.vatRate, 10);
  assert.deepEqual(updated.prices, [99, 140, 160]);
  assert(updated.categoryIds.includes(categoryId));
  assert.equal((await get('/stok/kartlar?arama=CSV-001', 1)).body.total, 0);
  assert.equal((await post(`/firsatlar/${dealId}/sil`)).status, 204);
  assert.equal((await get(created.body.iconUrl as string)).status, 404);
  assert.equal(
    (await post('/stok/kartlar/toplu', { ids: [Number(importedRow.id)], islem: 'sil' })).status,
    200,
  );
  assert.equal((await post(`/kategoriler/${categoryId}/sil`)).status, 204);
}
