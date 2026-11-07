import { createHash } from 'node:crypto';
import type { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { recordKey } from './stock.api';

const decimal = (signed = false) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(',', '.'))
    .refine(
      (v) => (signed ? /^-?\d{1,12}(\.\d{1,6})?$/ : /^\d{1,12}(\.\d{1,6})?$/).test(v),
      'Geçerli bir sayı girin; en fazla 12 tam ve 6 ondalık basamak kullanılabilir.',
    );
export const variantSchema = z.strictObject({
  code: z.string().trim().min(1, 'Varyant stok kodunu girin.').max(100),
  barcode: z.string().trim().max(100),
  price: decimal(),
  quantity: decimal(true),
  valueIds: z.array(recordKey).min(1).max(30),
});
const key = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',');

async function snapshot(tx: Prisma.TransactionClient, id: number) {
  const rows = await tx.stokVaryanti.findMany({
    where: { stokKartiId: id },
    include: { degerler: true },
    orderBy: { id: 'asc' },
  });
  const selected = await tx.stokOzellikDegeri.findMany({
    where: { stokKartiId: id },
    include: { deger: { include: { grup: true } } },
    orderBy: { degerId: 'asc' },
  });
  const variants = rows.map((v) => ({
    code: v.kod,
    barcode: v.barkod ?? '',
    price: v.fiyat.toString(),
    quantity: v.miktar.toString(),
    valueIds: v.degerler.map((d) => String(d.degerId)).sort((a, b) => Number(a) - Number(b)),
  }));
  const revision = createHash('sha256')
    .update(
      JSON.stringify({
        variants,
        selected: selected.map((s) => [s.degerId, s.deger.grupId, s.deger.grup.varyant]),
      }),
    )
    .digest('hex');
  return { rows, selected, data: { variants, revision } };
}

export function registerStockVariants(router: Router, db: PrismaClient) {
  router.get('/kartlar/:id/varyantlar', async (req, res) => {
    const id = Number(recordKey.parse(req.params.id));
    const data = await db.$transaction(
      async (tx) => {
        const card = await tx.stokKarti.findFirst({
          where: { kimlik: id, kullaniciKimligi: Number(res.locals.stockUserId) },
        });
        if (!card) throw new HttpError(404, 'NOT_FOUND', 'Ürün bulunamadı.');
        return (await snapshot(tx, id)).data;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    res.json(data);
  });
  router.post('/kartlar/:id/varyantlar', async (req, res) => {
    const id = Number(recordKey.parse(req.params.id));
    const { variants, revision } = z
      .strictObject({
        variants: z.array(variantSchema).max(200),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(req.body);
    const user = Number(res.locals.stockUserId);
    const data = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id = ${user} FOR UPDATE`);
        if (!(await tx.stokKarti.findFirst({ where: { kimlik: id, kullaniciKimligi: user } })))
          throw new HttpError(404, 'NOT_FOUND', 'Ürün bulunamadı.');
        const old = await snapshot(tx, id);
        if (old.data.revision !== revision)
          throw new HttpError(
            409,
            'CONFLICT',
            'Varyantlar veya özellik seçimleri başka bir işlemde değişti. Girdiğiniz bilgiler korunuyor; güncel kaydı başka sekmede inceleyip sayfayı yenileyin.',
          );
        const valid = old.selected.filter((s) => s.deger.grup.varyant);
        const groups = new Set(valid.map((s) => s.deger.grupId));
        const codes = new Set<string>(),
          barcodes = new Set<string>(),
          combinations = new Set<string>();
        for (const [index, v] of variants.entries()) {
          const ids = v.valueIds.map(Number);
          const chosen = valid.filter((s) => ids.includes(s.degerId));
          const combination = key(ids);
          if (
            new Set(ids).size !== ids.length ||
            chosen.length !== ids.length ||
            new Set(chosen.map((s) => s.deger.grupId)).size !== groups.size ||
            ids.length !== groups.size
          )
            throw new HttpError(
              400,
              'VALIDATION_ERROR',
              `${index + 1}. varyant (${v.code}): Her varyant grubundan bir değer seçin. Eksik seçimleri varyant satırında tamamlayın.`,
            );
          const code = v.code.toLocaleLowerCase('tr-TR');
          if (
            codes.has(code) ||
            combinations.has(combination) ||
            (v.barcode && barcodes.has(v.barcode))
          )
            throw new HttpError(
              409,
              'CONFLICT',
              'Varyant kodu, barkodu veya özellik birleşimi tekrar ediyor.',
            );
          codes.add(code);
          combinations.add(combination);
          if (v.barcode) barcodes.add(v.barcode);
        }
        if (
          (await tx.stokVaryanti.findFirst({
            where: {
              stokKartiId: { not: id },
              stokKarti: { kullaniciKimligi: user },
              OR: [{ kod: { in: variants.map((v) => v.code) } }, { barkod: { in: [...barcodes] } }],
            },
          })) ||
          (await tx.stokKarti.findFirst({
            where: {
              kullaniciKimligi: user,
              stokKodu: { in: variants.map((v) => v.code) },
            },
          })) ||
          (await tx.stokBarkodu.findFirst({
            where: {
              barkod: { in: [...barcodes] },
              stokBirimi: { stokKarti: { kullaniciKimligi: user } },
            },
          }))
        )
          throw new HttpError(
            409,
            'CONFLICT',
            'Varyant kodu veya barkodu başka bir üründe kullanılıyor.',
          );
        // Transactional replacement: the revision check prevents stale full-list writes.
        await tx.stokVaryanti.deleteMany({ where: { stokKartiId: id } });
        for (const v of variants)
          await tx.stokVaryanti.create({
            data: {
              stokKartiId: id,
              kod: v.code,
              barkod: v.barcode || null,
              fiyat: v.price,
              miktar: v.quantity,
              degerler: { create: v.valueIds.map((degerId) => ({ degerId: Number(degerId) })) },
            },
          });
        // Removing every variant also removes their stock; the ordinary card quantity becomes editable again.
        const quantity = variants.reduce((sum, v) => sum.plus(v.quantity), new Prisma.Decimal(0));
        if (quantity.abs().gte('1000000000000'))
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Toplam varyant miktarı en fazla 12 tam basamak olabilir.',
          );
        if (variants.length || old.rows.length)
          await tx.stokKarti.update({
            where: { kimlik: id },
            data: { stokMiktari: quantity },
          });
        return (await snapshot(tx, id)).data;
      },
      { timeout: 15000 },
    );
    res.json(data);
  });
}
