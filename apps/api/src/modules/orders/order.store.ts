import type { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import {
  ORDER_SOURCES,
  ORDER_STATUSES,
  RETURN_KINDS,
  RETURN_STATUSES,
  type OrderRecord,
  type OrderSource,
  type OrderStatus,
  type ReturnKind,
  type ReturnRecord,
  type ReturnStatus,
} from './order.types';

/**
 * Sipariş verisinin okuma/yazma sözleşmesi. Rotalar yalnızca bu arayüzü tanır; testler bellekteki
 * bir uygulamayla aynı davranışı doğrular. Tüm sorgular işletme kimliğiyle sınırlanır.
 */
export interface OrderStore {
  listOrders(businessId: number): Promise<OrderRecord[]>;
  updateOrderStatus(businessId: number, id: number, status: OrderStatus): Promise<boolean>;
  listReturns(businessId: number): Promise<ReturnRecord[]>;
  updateReturnStatus(businessId: number, id: number, status: ReturnStatus): Promise<boolean>;
  /** Anasayfadaki "Ürün" sayısı; katalog işletme sahibinin kullanıcı kimliğine bağlıdır. */
  countProducts(ownerId: number): Promise<number>;
  /** İşletmenin kayıtlı müşteri sayısı. */
  countCustomers(businessId: number): Promise<number>;
}

type OrderRow = Prisma.SiparisGetPayload<{ include: { satirlar: true } }>;
type ReturnRow = Prisma.IadeTalebiGetPayload<object>;

const asStatus = (value: string): OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value) ? (value as OrderStatus) : 'pending';
const asSource = (value: string): OrderSource =>
  (ORDER_SOURCES as readonly string[]).includes(value) ? (value as OrderSource) : 'manual';
const asReturnKind = (value: string): ReturnKind =>
  (RETURN_KINDS as readonly string[]).includes(value) ? (value as ReturnKind) : 'return';
const asReturnStatus = (value: string): ReturnStatus =>
  (RETURN_STATUSES as readonly string[]).includes(value) ? (value as ReturnStatus) : 'pending';

/** Prisma Decimal değerlerini JSON'a uygun sayıya çevirir. */
const number = (value: { toString(): string } | number): number => Number(value);

function toOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    no: row.siparisNo,
    date: row.tarih,
    source: asSource(row.kaynak),
    customer: row.musteriAdi,
    total: number(row.toplam),
    totalWithVat: number(row.kdvDahilToplam),
    paid: row.odendi,
    paymentMethod: row.odemeYontemi,
    status: asStatus(row.durum),
    address: row.adres,
    lines: row.satirlar.map((line) => ({
      id: line.id,
      name: line.ad,
      code: line.kod,
      qty: number(line.adet),
      unitPrice: number(line.birimFiyat),
      unitCost: line.birimMaliyet === null ? null : number(line.birimMaliyet),
    })),
  };
}

function toReturn(row: ReturnRow): ReturnRecord {
  return {
    id: row.id,
    customer: row.musteriAdi,
    orderNo: row.siparisNo,
    kind: asReturnKind(row.tur),
    itemCount: row.urunAdedi,
    date: row.tarih,
    status: asReturnStatus(row.durum),
    reason: row.sebep,
  };
}

export class PrismaOrderStore implements OrderStore {
  constructor(private db: PrismaClient) {}

  async listOrders(businessId: number): Promise<OrderRecord[]> {
    const rows = await this.db.siparis.findMany({
      where: { businessId },
      orderBy: [{ tarih: 'desc' }, { id: 'desc' }],
      include: { satirlar: { orderBy: { sira: 'asc' } } },
    });
    return rows.map(toOrder);
  }

  async updateOrderStatus(businessId: number, id: number, status: OrderStatus): Promise<boolean> {
    const result = await this.db.siparis.updateMany({
      where: { id, businessId },
      data: { durum: status },
    });
    return result.count > 0;
  }

  async listReturns(businessId: number): Promise<ReturnRecord[]> {
    const rows = await this.db.iadeTalebi.findMany({
      where: { businessId },
      orderBy: [{ tarih: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toReturn);
  }

  async updateReturnStatus(businessId: number, id: number, status: ReturnStatus): Promise<boolean> {
    const result = await this.db.iadeTalebi.updateMany({
      where: { id, businessId },
      data: { durum: status },
    });
    return result.count > 0;
  }

  countProducts(ownerId: number): Promise<number> {
    return this.db.stokKarti.count({ where: { kullaniciKimligi: ownerId } });
  }

  countCustomers(businessId: number): Promise<number> {
    return this.db.musteri.count({ where: { businessId } });
  }
}
