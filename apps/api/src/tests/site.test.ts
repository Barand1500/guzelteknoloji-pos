import { describe, expect, it } from 'vitest';
import {
  menuEntryDraftSchema,
  siteImageUploadSchema,
  sitePageDraftSchema,
  siteReorderSchema,
  sliderDraftSchema,
  templateVariableDraftSchema,
  widgetDraftSchema,
} from '@gt/shared';
import type { PrismaClient } from '../lib/prisma';
import { SiteRepository } from '../modules/site/site.repository';

describe('E-ticaret site içeriği şemaları', () => {
  it('sayfa slug biçimini doğrular', () => {
    const base = {
      title: 'Hakkımızda',
      slug: 'hakkimizda',
      content: '<p>Metin</p>',
      legal: 'yok' as const,
      published: true,
      order: 1,
    };
    expect(sitePageDraftSchema.safeParse(base).success).toBe(true);
    expect(sitePageDraftSchema.safeParse({ ...base, slug: 'Hakkımızda' }).success).toBe(false);
    expect(sitePageDraftSchema.safeParse({ ...base, content: 'x'.repeat(200_001) }).success).toBe(
      false,
    );
  });

  it('menü grubu ve bağlantısını kabul eder', () => {
    expect(
      menuEntryDraftSchema.safeParse({
        group: 'ust',
        label: 'Ana Sayfa',
        url: '/',
        newTab: false,
        active: true,
        order: 0,
      }).success,
    ).toBe(true);
    expect(
      menuEntryDraftSchema.safeParse({
        group: 'yok',
        label: 'X',
        url: '',
        newTab: false,
        active: true,
        order: 0,
      }).success,
    ).toBe(false);
  });

  it('slider görsel kimliği sayısal ya da null olmalı', () => {
    const base = {
      title: 'Kampanya',
      description: '',
      link: '/kampanya',
      active: true,
      order: 0,
    };
    expect(sliderDraftSchema.safeParse({ ...base, imageId: '12' }).success).toBe(true);
    expect(sliderDraftSchema.safeParse({ ...base, imageId: null }).success).toBe(true);
    expect(sliderDraftSchema.safeParse({ ...base, imageId: 'abc' }).success).toBe(false);
  });

  it('widget ayarları anahtar-değer olmalı', () => {
    expect(
      widgetDraftSchema.safeParse({
        name: 'Ana slider',
        type: 'slider',
        title: 'Öne çıkanlar',
        visible: true,
        order: 0,
        imageId: '12',
        settings: { link: '/kampanya' },
      }).success,
    ).toBe(true);
    expect(
      widgetDraftSchema.safeParse({
        name: 'Ana slider',
        type: 'slider',
        title: 'Öne çıkanlar',
        visible: true,
        order: 0,
        imageId: null,
        settings: {},
      }).success,
    ).toBe(true);
    expect(
      widgetDraftSchema.safeParse({
        name: 'Ana slider',
        type: 'yok',
        title: '',
        visible: true,
        order: 0,
        imageId: null,
        settings: {},
      }).success,
    ).toBe(false);
  });

  it('şablon değişkeni alanlarını sınırlar', () => {
    const base = {
      name: 'Sipariş onayı',
      type: 'E-Posta' as const,
      module: 'Siparişler',
      description: '',
      fields: [{ column: 'adsoyad', code: 'adsoyad' }],
    };
    expect(templateVariableDraftSchema.safeParse(base).success).toBe(true);
    expect(
      templateVariableDraftSchema.safeParse({
        ...base,
        fields: Array.from({ length: 51 }, () => ({ column: 'x', code: 'x' })),
      }).success,
    ).toBe(false);
  });

  it('görsel yükleme türü ve boyutu doğrulanır', () => {
    expect(
      siteImageUploadSchema.safeParse({
        kind: 'logo',
        dataUrl: 'data:image/png;base64,' + 'A'.repeat(40),
      }).success,
    ).toBe(true);
    expect(siteImageUploadSchema.safeParse({ kind: 'yok', dataUrl: 'x'.repeat(40) }).success).toBe(
      false,
    );
    expect(siteImageUploadSchema.safeParse({ kind: 'logo', dataUrl: 'x' }).success).toBe(false);
  });

  it('sıralama isteği yalnızca sayısal kimlikleri kabul eder', () => {
    expect(siteReorderSchema.safeParse({ ids: ['1', '2'] }).success).toBe(true);
    expect(siteReorderSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(siteReorderSchema.safeParse({ ids: ['1', 'abc'] }).success).toBe(false);
  });
});

/** Sıralama uçlarının veritabanı davranışı: sahiplik, tekrar ve yazılan sıra. */
interface PageTx {
  siteSayfasi: {
    findMany: () => Promise<{ id: number }[]>;
    update: (args: { where: { id: number }; data: { sira: number } }) => Promise<unknown>;
  };
}

function fakeDb(tx: PageTx, written: { id: number; sira: number }[] = []) {
  const tracked: PageTx = {
    siteSayfasi: {
      findMany: tx.siteSayfasi.findMany,
      update: async (args) => {
        written.push({ id: args.where.id, sira: args.data.sira });
        return tx.siteSayfasi.update(args);
      },
    },
  };
  return {
    db: {
      $transaction: async (run: (client: PageTx) => Promise<unknown>) => run(tracked),
    } as unknown as PrismaClient,
    written,
  };
}

describe('Site sıralaması', () => {
  it('aynı kimlik iki kez gönderilirse hiçbir satır yazılmaz', async () => {
    const { db, written } = fakeDb({
      siteSayfasi: { findMany: async () => [], update: async () => ({}) },
    });
    const repo = new SiteRepository(db);
    await expect(repo.reorderPages(1, ['1', '1'])).rejects.toThrow('iki kez');
    expect(written).toHaveLength(0);
  });

  it('işletmeye ait olmayan kimlik varsa 404 verir', async () => {
    const { db, written } = fakeDb({
      siteSayfasi: { findMany: async () => [{ id: 1 }], update: async () => ({}) },
    });
    const repo = new SiteRepository(db);
    await expect(repo.reorderPages(1, ['1', '2'])).rejects.toThrow('Sayfalardan biri bulunamadı.');
    expect(written).toHaveLength(0);
  });

  it('gönderilen sırayı 0..n-1 olarak yazar', async () => {
    const { db, written } = fakeDb({
      siteSayfasi: { findMany: async () => [{ id: 1 }, { id: 2 }], update: async () => ({}) },
    });
    const repo = new SiteRepository(db);
    await repo.reorderPages(1, ['2', '1']);
    expect(written).toEqual([
      { id: 2, sira: 0 },
      { id: 1, sira: 1 },
    ]);
  });
});
