import { createHash, randomUUID } from 'node:crypto';
import {
  createOrderSchema,
  recordPaymentSchema,
  createReturnSchema,
  completeReturnSchema,
  type LifecycleDetail,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { quoteCampaignCartTx } from '../campaigns/campaign-quote';
import { allocateMoney, returnedAmount } from './order-money';
import type { OrderStatus, ReturnStatus } from './order.types';

type Context = { businessId: number; ownerId: number; actorId: number };
type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;
const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const conflict = (message: string) => new HttpError(409, 'CONFLICT', message);
const bad = (message: string) => new HttpError(400, 'VALIDATION_ERROR', message);
const includeOrder = {
  satirlar: true,
  iadeler: { include: { satirlar: true } },
  hareketler: true,
} as const;

/** İşletme kilidi: oluşturma, tahsilat, iptal ve iadeler aynı sıradan geçer.
 * Stok ayrıca koşullu güncellenir; diğer ürün düzenlemeleriyle yarışta eksiye düşmez. */
export class OrderLifecycle {
  constructor(private readonly db: PrismaClient) {}

  private async transaction<T>(businessId: number, action: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM isletmeler WHERE id=${businessId} FOR UPDATE`);
        return action(tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 },
    );
  }

  private async order(tx: Tx, businessId: number, id: number, managed = true) {
    const row = await tx.siparis.findFirst({ where: { id, businessId }, include: includeOrder });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Sipariş bulunamadı.');
    if (managed && row.akisSurumu !== 1)
      throw conflict(
        'Bu eski siparişin ödeme ve stok geçmişi bağlı değil; otomatik finansal işlem yapılamaz.',
      );
    return row;
  }

  async create(ctx: Context, input: unknown) {
    const data = createOrderSchema.parse(input);
    const fingerprint = hash(data);
    return this.transaction(ctx.businessId, async (tx) => {
      const previous = await tx.siparis.findFirst({
        where: { businessId: ctx.businessId, istekId: data.requestId },
      });
      if (previous) {
        if (previous.istekHash !== fingerprint)
          throw conflict('Bu istek kimliği farklı bir siparişte kullanıldı.');
        return { id: String(previous.id), no: previous.siparisNo };
      }
      const [customer, method] = await Promise.all([
        tx.musteri.findFirst({
          where: { id: Number(data.customerId), businessId: ctx.businessId, durum: true },
        }),
        tx.odemeSekli.findFirst({
          where: { id: Number(data.paymentMethodId), isletmeId: ctx.businessId, aktif: true },
        }),
      ]);
      if (!customer || !method) throw bad('Aktif müşteri ve ödeme şekli bu işletmede bulunamadı.');
      // Müşterinin cari tipi sunucudan belirlenir; istemci farklı indirim grubu seçemez.
      const customerType = await tx.cariTipi.findFirst({
        where: { isletmeId: ctx.businessId, ad: customer.cariTipi },
      });
      const quote = await quoteCampaignCartTx(tx, ctx.businessId, ctx.ownerId, {
        priceListId: data.priceListId,
        customerTypeId: customerType ? String(customerType.id) : null,
        shippingFee: method.kargoYok ? 0 : data.shippingFee,
        items: data.items,
      });
      if (data.expectedTotal === null || !new D(quote.total).eq(data.expectedTotal))
        throw conflict('Sipariş tutarı değişti. Güncel tutarı hesaplayıp tekrar onaylayın.');
      const discounts = allocateMoney(
        quote.discount,
        quote.items.map((i) => (i.discountEligible ? i.total : '0')),
      );
      const products = await tx.stokKarti.findMany({
        where: {
          kullaniciKimligi: ctx.ownerId,
          kimlik: { in: data.items.map((i) => Number(i.productId)) },
        },
        select: {
          kimlik: true,
          envanterTakibi: true,
          vergiler: { take: 1, select: { vergiId: true } },
        },
      });
      if (products.length !== data.items.length)
        throw conflict('Ürün listesi değişti; yeniden deneyin.');
      if (products.some((p) => p.vergiler.length))
        throw bad('Ek vergili ürünler için satış hesabı henüz desteklenmiyor.');
      const lines = [];
      for (const [index, item] of quote.items.entries()) {
        const product = products.find((p) => p.kimlik === Number(item.productId))!;
        const tracked = product.envanterTakibi !== 'yok';
        {
          const updated = await tx.stokKarti.updateMany({
            where: {
              kimlik: product.kimlik,
              kullaniciKimligi: ctx.ownerId,
              satisAcik: true,
              envanterTakibi: product.envanterTakibi,
              ...(tracked ? { stokMiktari: { gte: new D(item.quantity) } } : {}),
            },
            data: { stokMiktari: { decrement: new D(tracked ? item.quantity : 0) } },
          });
          if (updated.count !== 1) throw conflict(`${item.name}: stok değişti veya yetersiz.`);
        }
        const gross = new D(item.total).minus(discounts[index]!);
        const net = gross.div(new D(1).plus(new D(item.vatRate ?? 0).div(100))).toDecimalPlaces(2);
        lines.push({
          urunId: product.kimlik,
          ad: item.name,
          kod: item.code ?? '',
          adet: new D(item.quantity),
          birimFiyat: net.div(item.quantity).toDecimalPlaces(2),
          satisTutari: gross,
          netTutar: net,
          stokIslendi: tracked,
          sira: index,
        });
      }
      const shipping = new D(quote.shippingFee).minus(quote.shippingDiscount);
      const row = await tx.siparis.create({
        data: {
          businessId: ctx.businessId,
          siparisNo: `S-${randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`,
          tarih: new Date(),
          kaynak: 'manual',
          musteriId: customer.id,
          musteriAdi: customer.ad,
          toplam: lines
            .reduce((n, l) => n.plus(l.netTutar), new D(0))
            .plus(
              shipping.div(new D(1).plus(new D(data.shippingVatRate).div(100))).toDecimalPlaces(2),
            ),
          kdvDahilToplam: quote.total,
          odemeYontemi: method.ad.slice(0, 40),
          odemeTuru: data.paymentKind,
          adres: data.address,
          akisSurumu: 1,
          istekId: data.requestId,
          istekHash: fingerprint,
          indirimTutari: quote.discount,
          kargoTutari: shipping,
          kargoKdvOrani: data.shippingVatRate,
          satirlar: { create: lines },
        },
      });
      await tx.musteriHareketi.create({
        data: {
          musteriId: customer.id,
          tarih: new Date(),
          referans: row.siparisNo,
          borc: quote.total,
        },
      });
      return { id: String(row.id), no: row.siparisNo };
    });
  }

  async collect(ctx: Context, id: number, input: unknown) {
    const data = recordPaymentSchema.parse(input);
    const fingerprint = hash(data);
    return this.transaction(ctx.businessId, async (tx) => {
      const row = await this.order(tx, ctx.businessId, id);
      const previous = await tx.siparisOdemeHareketi.findFirst({
        where: { siparisId: id, istekId: data.requestId },
      });
      if (previous) {
        if (previous.istekHash !== fingerprint || previous.tur !== 'collection')
          throw conflict('İstek kimliği farklı bir işlemde kullanıldı.');
        return;
      }
      if (row.durum === 'cancelled' || row.odendi)
        throw conflict('İptal edilmiş veya tahsil edilmiş sipariş.');
      if (!['bank_transfer', 'cash', 'cash_on_delivery'].includes(row.odemeTuru ?? ''))
        throw conflict('Bu ödeme türü manuel tahsilata açık değil.');
      if (row.iadeler.some((r) => r.durum !== 'completed' && r.durum !== 'rejected'))
        throw conflict('Önce açık iade talebini sonuçlandırın.');
      const returned = row.iadeler
        .filter((r) => r.durum === 'completed')
        .reduce((n, r) => n.plus(r.iadeTutari ?? 0), new D(0));
      const amount = row.kdvDahilToplam.minus(returned).toFixed(2);
      if (!new D(amount).eq(data.expectedAmount))
        throw conflict(
          'Tahsil edilecek tutar değişti. Siparişi yenileyip tutarı tekrar teyit edin.',
        );
      if (new D(amount).lte(0)) throw conflict('Bu sipariş için tahsil edilecek tutar yok.');
      await tx.siparisOdemeHareketi.create({
        data: {
          siparisId: id,
          istekId: data.requestId,
          istekHash: fingerprint,
          tur: 'collection',
          tutar: amount,
          referans: data.reference,
          kullaniciId: ctx.actorId,
        },
      });
      if (row.musteriId)
        await tx.musteriHareketi.create({
          data: {
            musteriId: row.musteriId,
            tarih: new Date(),
            referans: `Tahsilat ${row.siparisNo}`,
            alacak: amount,
          },
        });
      await tx.siparis.update({ where: { id }, data: { odendi: true } });
    });
  }

  async requestReturn(ctx: Context, id: number, input: unknown) {
    const data = createReturnSchema.parse(input);
    const fingerprint = hash(data);
    return this.transaction(ctx.businessId, async (tx) => {
      const row = await this.order(tx, ctx.businessId, id);
      const previous = await tx.iadeTalebi.findFirst({
        where: { businessId: ctx.businessId, istekId: data.requestId },
      });
      if (previous) {
        if (previous.istekHash !== fingerprint || previous.siparisId !== id)
          throw conflict('İstek kimliği başka iadede kullanıldı.');
        return { id: String(previous.id) };
      }
      if (row.durum === 'cancelled') throw conflict('İptal edilmiş sipariş iade edilemez.');
      if (row.iadeler.some((r) => !['completed', 'rejected'].includes(r.durum)))
        throw conflict('Önce bu siparişin açık iadesini sonuçlandırın.');
      const lines = data.items.map((item) => {
        const line = row.satirlar.find((l) => l.id === Number(item.lineId));
        if (!line || line.satisTutari === null) throw bad('İade satırı siparişe ait değil.');
        const previousLines = row.iadeler
          .filter((r) => r.durum === 'completed')
          .flatMap((r) => r.satirlar)
          .filter((r) => r.siparisSatiriId === line.id);
        const count = previousLines.reduce((n, r) => n.plus(r.adet), new D(0));
        const amount = previousLines.reduce((n, r) => n.plus(r.tutar), new D(0));
        if (count.plus(item.quantity).gt(line.adet))
          throw bad('İade miktarı kalan satılan miktarı aşıyor.');
        return {
          siparisSatiriId: line.id,
          adet: new D(item.quantity),
          tutar: returnedAmount(
            line.satisTutari.toString(),
            line.adet.toString(),
            count.toString(),
            amount.toString(),
            String(item.quantity),
          ),
        };
      });
      const created = await tx.iadeTalebi.create({
        data: {
          businessId: ctx.businessId,
          siparisId: id,
          musteriId: row.musteriId,
          musteriAdi: row.musteriAdi,
          siparisNo: row.siparisNo,
          tur: 'return',
          tarih: new Date(),
          sebep: data.reason,
          urunAdedi: Math.ceil(lines.reduce((n, l) => n + l.adet.toNumber(), 0)),
          istekId: data.requestId,
          istekHash: fingerprint,
          iadeTutari: lines.reduce((n, l) => n.plus(l.tutar), new D(0)),
          satirlar: { create: lines },
        },
      });
      return { id: String(created.id) };
    });
  }

  async completeReturn(ctx: Context, id: number, input: unknown) {
    const data = completeReturnSchema.parse(input);
    return this.transaction(ctx.businessId, async (tx) => {
      const request = await tx.iadeTalebi.findFirst({
        where: { id, businessId: ctx.businessId },
        include: { satirlar: { include: { siparisSatiri: true } } },
      });
      if (!request?.siparisId || !request.satirlar.length)
        throw conflict('Bu eski talebin sipariş satırları bağlı değil; otomatik iade yapılamaz.');
      const row = await this.order(tx, ctx.businessId, request.siparisId);
      if (request.durum === 'completed') {
        if (request.tamamlamaHash !== hash(data))
          throw conflict('Tamamlanmış iade değiştirilemez.');
        return;
      }
      if (request.durum !== 'approved') throw conflict('Önce iade talebini onaylayın.');
      if (
        request.iadeTutari === null ||
        !new D(data.expectedAmount).eq(row.odendi ? request.iadeTutari : 0)
      )
        throw conflict('Geri ödeme tutarı değişti. İadeyi yenileyip tekrar teyit edin.');
      if (
        data.restockLineIds.some(
          (lineId) => !request.satirlar.some((l) => l.siparisSatiriId === Number(lineId)),
        )
      )
        throw bad('Stoğa eklenecek satır bu iadede yok.');
      const reused = await tx.siparisOdemeHareketi.findFirst({
        where: { siparisId: row.id, istekId: data.requestId },
      });
      if (reused) throw conflict('Bu istek kimliği başka bir ödemede kullanıldı.');
      for (const line of request.satirlar) {
        if (!data.restockLineIds.includes(String(line.siparisSatiriId))) continue;
        if (line.siparisSatiri.stokIslendi) {
          if (!line.siparisSatiri.urunId) throw conflict('İade ürününün stok bağlantısı yok.');
          const changed = await tx.stokKarti.updateMany({
            where: { kimlik: line.siparisSatiri.urunId, kullaniciKimligi: ctx.ownerId },
            data: { stokMiktari: { increment: line.adet } },
          });
          if (changed.count !== 1) throw conflict('İade ürünü silinmiş; stok eklenemedi.');
          await tx.iadeSatiri.update({ where: { id: line.id }, data: { stogaEklendi: true } });
        }
      }
      const amount = request.iadeTutari!;
      if (row.musteriId) {
        await tx.musteriHareketi.create({
          data: {
            musteriId: row.musteriId,
            tarih: new Date(),
            referans: `İade ${row.siparisNo}`,
            alacak: amount,
          },
        });
      }
      if (row.odendi && amount.gt(0)) {
        if (!['bank_transfer', 'cash', 'cash_on_delivery'].includes(row.odemeTuru ?? ''))
          throw conflict('Kart iadesi kuruluş üzerinden yapılmalı.');
        await tx.siparisOdemeHareketi.create({
          data: {
            siparisId: row.id,
            iadeId: id,
            istekId: data.requestId,
            istekHash: hash(data),
            tur: 'refund',
            tutar: amount,
            referans: data.reference,
            kullaniciId: ctx.actorId,
          },
        });
        if (row.musteriId)
          await tx.musteriHareketi.create({
            data: {
              musteriId: row.musteriId,
              tarih: new Date(),
              referans: `İade ödemesi ${row.siparisNo}`,
              borc: amount,
            },
          });
      }
      await tx.iadeTalebi.update({
        where: { id },
        data: {
          durum: 'completed',
          tamamlamaHash: hash(data),
          tamamlamaReferansi: data.reference,
          tamamlayanId: ctx.actorId,
          tamamlanmaTarihi: new Date(),
        },
      });
    });
  }

  async changeOrderStatus(businessId: number, id: number, status: OrderStatus): Promise<boolean> {
    return this.transaction(businessId, async (tx) => {
      const row = await this.order(tx, businessId, id, false);
      if (row.durum === status) return true;
      const transitions: Record<string, string[]> = {
        pending: ['preparing', 'cancelled'],
        preparing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: [],
      };
      if (!transitions[row.durum]?.includes(status))
        throw conflict('Bu sipariş durumuna geçilemez.');
      if (status === 'cancelled' && row.akisSurumu === 1) {
        if (row.odendi || row.iadeler.some((r) => r.durum !== 'rejected'))
          throw conflict('Ödeme/iade kaydı olan siparişte iade akışını kullanın.');
        const business = await tx.isletme.findUniqueOrThrow({
          where: { id: businessId },
          select: { ownerId: true },
        });
        for (const line of row.satirlar.filter((l) => l.stokIslendi)) {
          const updated = await tx.stokKarti.updateMany({
            where: { kimlik: line.urunId ?? -1, kullaniciKimligi: business.ownerId },
            data: { stokMiktari: { increment: line.adet } },
          });
          if (updated.count !== 1) throw conflict('Sipariş ürünü silinmiş; stok geri alınamadı.');
        }
        if (row.musteriId)
          await tx.musteriHareketi.create({
            data: {
              musteriId: row.musteriId,
              tarih: new Date(),
              referans: `İptal ${row.siparisNo}`,
              alacak: row.kdvDahilToplam,
            },
          });
      }
      await tx.siparis.update({ where: { id }, data: { durum: status } });
      return true;
    });
  }

  async changeReturnStatus(businessId: number, id: number, status: ReturnStatus): Promise<boolean> {
    return this.transaction(businessId, async (tx) => {
      const row = await tx.iadeTalebi.findFirst({ where: { id, businessId } });
      if (!row) return false;
      if (row.durum === status) return true;
      if (status === 'completed') throw conflict('İadeyi ürün ve ödeme teyidiyle tamamlayın.');
      const transitions: Record<string, string[]> = {
        pending: ['approved', 'rejected'],
        approved: ['rejected'],
        rejected: [],
        completed: [],
      };
      if (!transitions[row.durum]?.includes(status)) throw conflict('Bu iade durumuna geçilemez.');
      await tx.iadeTalebi.update({ where: { id }, data: { durum: status } });
      return true;
    });
  }

  async detail(businessId: number, id: number): Promise<LifecycleDetail> {
    const row = await this.order(this.db, businessId, id, false);
    return {
      managed: row.akisSurumu === 1,
      paymentKind: row.odemeTuru,
      payments: row.hareketler.map((p) => ({
        id: String(p.id),
        kind: p.tur,
        amount: p.tutar.toFixed(2),
        reference: p.referans,
        date: p.tarih.toISOString(),
      })),
      returns: row.iadeler.map((r) => ({
        id: String(r.id),
        status: r.durum,
        amount: r.iadeTutari?.toFixed(2) ?? null,
        items: r.satirlar.map((l) => ({
          lineId: String(l.siparisSatiriId),
          name: row.satirlar.find((s) => s.id === l.siparisSatiriId)?.ad ?? '',
          quantity: l.adet.toString(),
          restocked: l.stogaEklendi,
          stockTracked: row.satirlar.find((s) => s.id === l.siparisSatiriId)?.stokIslendi ?? false,
        })),
      })),
    };
  }

  async lookup(businessId: number, requestId: string) {
    return this.transaction(businessId, async (tx) => {
      const row = await tx.siparis.findFirst({
        where: { businessId, istekId: requestId },
        select: { id: true, siparisNo: true },
      });
      return row ? { id: String(row.id), no: row.siparisNo } : null;
    });
  }
}
