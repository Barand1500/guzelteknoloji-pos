import { randomUUID } from 'node:crypto';
import {
  createStockSchema,
  stockDraftSchema,
  stockValidationMessage,
  type StockCardDraft,
  type UnitRow,
} from '@gt/shared';
import { z } from 'zod';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { parseImport, type RawImportRow } from './import.csv';
import type { StockRepository } from './stock.repository';
import { fold } from '../catalog/catalog.common';

export const importSchema = z.strictObject({
  text: z.string().max(400000, 'Dosya çok büyük. En fazla 400 KB yükleyin.'),
});
interface CheckedRow {
  line: number;
  code: string;
  name: string;
  status: 'new' | 'update' | 'error';
  message: string;
}
function numberText(text: string, negative = false) {
  const t = text.trim();
  const s = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!(negative ? /^-?\d{1,12}(\.\d{1,6})?$/ : /^\d{1,12}(\.\d{1,6})?$/).test(s))
    throw new Error('Geçerli bir sayı girin (en fazla 6 ondalık basamak).');
  return s;
}
function emptyDraft(): StockCardDraft {
  const price = {
    amount: '',
    currency: 'TRY',
    discount: '',
    vatRate: '20',
    vatIncluded: false,
    extras: [],
  };
  const unit: UnitRow = {
    id: 'import-unit',
    unit: 'adet',
    multiplier: '1',
    purchase: { ...price },
    sale: { ...price },
    barcodes: [],
    weight: '',
    weightUnit: 'kg',
    volume: '',
    note: '',
    isMain: true,
    isDefault: true,
  };
  return {
    stockType: 'basit',
    code: '',
    name: '',
    brand: '',
    vatDepartment: 'genel',
    stockKind: 'resmi',
    inventoryTracking: 'yok',
    gtip: '',
    origin: '',
    units: { fiyat: [unit] },
  };
}
export class StockImport {
  constructor(
    private db: PrismaClient,
    private repo: StockRepository,
  ) {}
  async prepare(userId: string, text: string) {
    const parsed = parseImport(text);
    if (parsed.rows.length > 1000)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Bir dosyada en fazla 1000 ürün olabilir.');
    const user = Number(userId);
    const [cards, brands, categories] = await Promise.all([
      this.db.stokKarti.findMany({
        where: { kullaniciKimligi: user },
        select: { kimlik: true, stokKodu: true, _count: { select: { varyantlar: true } } },
      }),
      this.db.marka.findMany({
        where: { kullaniciKimligi: user, etkin: true },
        select: { kimlik: true, markaAdi: true },
      }),
      this.db.kategori.findMany({
        where: { kullaniciId: user },
        select: { id: true, ad: true, ustId: true },
      }),
    ]);
    const categoryPath = (id: number): string => {
      const path: string[] = [];
      const seen = new Set<number>();
      let current: number | null = id;
      while (current !== null && !seen.has(current)) {
        seen.add(current);
        const row = categories.find((c) => c.id === current);
        if (!row) break;
        path.unshift(row.ad);
        current = row.ustId;
      }
      return path.join(' > ');
    };
    const seen = new Set<string>();
    const rows = parsed.missingColumns.length
      ? []
      : parsed.rows.map((raw) => {
          const old = cards.find((c) => fold(c.stokKodu ?? '') === fold(raw.code));
          const base: CheckedRow = {
            line: raw.line,
            code: raw.code,
            name: raw.name,
            status: old ? 'update' : 'new',
            message: old ? 'Mevcut ürün güncellenecek.' : 'Yeni ürün.',
          };
          let brandId: string | undefined;
          let categoryId: number | undefined;
          try {
            if (!raw.code.trim() || raw.code.length > 100)
              throw new Error('Stok kodu 1–100 karakter olmalı.');
            if (!raw.name.trim() || raw.name.length > 250)
              throw new Error('Ürün adı 1–250 karakter olmalı.');
            const key = fold(raw.code);
            if (seen.has(key)) throw new Error('Bu stok kodu dosyada birden fazla kez geçiyor.');
            seen.add(key);
            for (const field of ['price1', 'price2', 'price3', 'cost'] as const)
              if (raw[field] !== '' || field === 'price1') numberText(raw[field]);
            if (raw.vat !== '' && Number(numberText(raw.vat)) > 100)
              throw new Error('KDV 0–100 arasında olmalı.');
            if (raw.stock !== '') numberText(raw.stock, true);
            if (raw.stock !== '' && old?._count.varyantlar)
              throw new Error(
                'Varyantlı ürünün miktarını varyantlar bölümünden değiştirin; dosyadaki stok alanını boş bırakın.',
              );
            if (raw.brand !== '') {
              const found = brands.find((b) => fold(b.markaAdi) === fold(raw.brand));
              if (!found) throw new Error('Marka bulunamadı: ' + raw.brand);
              brandId = String(found.kimlik);
            }
            if (raw.category !== '') {
              const found = categories.filter(
                (c) =>
                  fold(c.ad) === fold(raw.category) ||
                  fold(categoryPath(c.id)) === fold(raw.category),
              );
              if (found.length !== 1)
                throw new Error(
                  found.length
                    ? 'Kategori adı birden fazla yerde var. Ana > Alt şeklinde tam yolunu yazın.'
                    : 'Kategori bulunamadı: ' + raw.category,
                );
              categoryId = found[0]!.id;
            }
          } catch (error) {
            base.status = 'error';
            base.message = error instanceof Error ? error.message : 'Satır geçersiz.';
          }
          return {
            summary: base,
            raw,
            id: old ? String(old.kimlik) : undefined,
            brandId,
            categoryId,
          };
        });
    return { missingColumns: parsed.missingColumns, rows };
  }
  async preview(userId: string, text: string) {
    const result = await this.prepare(userId, text);
    const rows = result.rows.map((r) => r.summary);
    return {
      missingColumns: result.missingColumns,
      rows,
      newCount: rows.filter((r) => r.status === 'new').length,
      updateCount: rows.filter((r) => r.status === 'update').length,
      errorCount: rows.filter((r) => r.status === 'error').length,
    };
  }
  async commit(userId: string, text: string) {
    const prepared = await this.prepare(userId, text);
    if (prepared.missingColumns.length)
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Zorunlu sütunlar eksik: ' + prepared.missingColumns.join(', '),
      );
    await this.repo.getLookups(userId);
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    for (const row of prepared.rows) {
      if (row.summary.status === 'error') {
        errors.push(row.raw.line + ': ' + row.summary.message);
        continue;
      }
      try {
        const d = row.id
          ? stockDraftSchema.parse(await this.repo.get(userId, row.id))
          : emptyDraft();
        const raw: RawImportRow = row.raw;
        d.code = raw.code;
        d.name = raw.name;
        if (row.brandId !== undefined) d.brand = row.brandId;
        const first = d.units.fiyat ?? Object.values(d.units)[0]!;
        const mainIndex = first.findIndex((u) => u.isMain);
        if (mainIndex < 0) throw new Error('Ana birim bulunamadı.');
        const keys = ['fiyat', 'perakende', 'toptan'] as const;
        for (const [i, key] of keys.entries()) {
          const field = raw[['price1', 'price2', 'price3'][i] as 'price1' | 'price2' | 'price3'];
          if (field === '' && row.id) continue;
          if (!d.units[key])
            d.units[key] = first.map((u) => ({
              ...structuredClone(u),
              purchase: { ...u.purchase, amount: '', extras: [] },
              sale: { ...u.sale, amount: '', extras: [] },
            }));
          const unit = d.units[key]![mainIndex]!;
          unit.sale.amount = numberText(field || raw.price1);
          unit.sale.vatIncluded = false;
          unit.sale.discount = '';
          if (raw.vat !== '' || !row.id)
            unit.sale.vatRate = raw.vat === '' ? '20' : numberText(raw.vat);
        }
        const primary = d.units.fiyat![mainIndex]!;
        if (raw.cost !== '' || !row.id) {
          primary.purchase.amount = raw.cost === '' ? '0' : numberText(raw.cost);
          primary.purchase.discount = '';
          primary.purchase.vatIncluded = false;
        }
        if (raw.vat !== '' || !row.id)
          primary.purchase.vatRate = raw.vat === '' ? '20' : numberText(raw.vat);
        if (raw.stock !== '' && d.inventoryTracking === 'yok') d.inventoryTracking = 'normal';
        // Dosyadaki adet kartın miktar alanına da yazılır ("Normal" takipte kart bu alanı esas alır).
        if (raw.stock !== '') d.stockQuantity = numberText(raw.stock, true);
        const input = createStockSchema.parse({ requestId: randomUUID(), draft: d });
        await this.repo.saveImported(userId, input, row.id, {
          ...(raw.stock !== '' ? { stock: numberText(raw.stock, true) } : {}),
          ...(row.categoryId === undefined ? {} : { categoryId: row.categoryId }),
        });
        if (row.id) updated++;
        else created++;
      } catch (error) {
        errors.push(
          row.raw.line +
            ': ' +
            (error instanceof HttpError
              ? error.message
              : error instanceof z.ZodError
                ? stockValidationMessage(error)
                : 'Kaydedilemedi. Tekrar deneyin.'),
        );
      }
    }
    return { created, updated, errors };
  }
}
