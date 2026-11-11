import type { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import type {
  AddressDraft,
  AddressRecord,
  CustomerDetailRecord,
  CustomerRecord,
  CustomerDraft,
  CustomerUserRecord,
} from './customer.types';

/**
 * Müşteri verisinin okuma/yazma sözleşmesi. Tüm sorgular işletme kimliğiyle sınırlanır; testler
 * bellekteki bir uygulamayla aynı davranışı doğrular.
 */
export interface CustomerStore {
  list(businessId: number): Promise<CustomerRecord[]>;
  detail(businessId: number, id: number): Promise<CustomerDetailRecord | null>;
  create(businessId: number, draft: CustomerDraft): Promise<CustomerRecord | null>;
  update(businessId: number, id: number, draft: CustomerDraft): Promise<CustomerRecord | null>;
  remove(businessId: number, id: number): Promise<boolean>;
  setLogin(businessId: number, id: number, active: boolean): Promise<boolean>;
  saveAddress(
    businessId: number,
    id: number,
    draft: AddressDraft,
    addressId?: number,
  ): Promise<AddressRecord | null>;
  setUserLogin(businessId: number, id: number, userId: number, active: boolean): Promise<boolean>;
  /** Boş olmayan müşteri kodu başka kayıtta kullanılıyor mu? */
  codeExists(businessId: number, code: string, excludeId?: number): Promise<boolean>;
}

type CustomerRow = Prisma.MusteriGetPayload<{
  include: {
    kullanicilar: { select: { etkin: true; sonGiris: true } };
    hareketler: { select: { borc: true; alacak: true } };
  };
}>;

const money = (value: { toString(): string } | number): number => Number(value);

function parsePayments(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function toCustomer(row: CustomerRow): CustomerRecord {
  const logins = row.kullanicilar
    .map((user) => user.sonGiris)
    .filter((date): date is Date => date instanceof Date);
  return {
    id: row.id,
    code: row.musteriKodu,
    name: row.ad,
    kind: row.tur === 'corporate' ? 'corporate' : 'real',
    taxId: row.vergiKimligi,
    phone: row.telefon,
    email: row.eposta,
    priceList: row.fiyatListesi,
    customerType: row.cariTipi,
    payments: parsePayments(row.odemeSekilleri),
    cardDeal: row.kartAnlasmasi,
    active: row.etkin,
    userCount: row.kullanicilar.length,
    lastLogin: logins.length ? new Date(Math.max(...logins.map((date) => date.getTime()))) : null,
    debt: row.hareketler.reduce((sum, entry) => sum + money(entry.borc), 0),
    credit: row.hareketler.reduce((sum, entry) => sum + money(entry.alacak), 0),
  };
}

function toUser(row: {
  id: number;
  ad: string;
  eposta: string;
  etkin: boolean;
  sonGiris: Date | null;
}): CustomerUserRecord {
  return {
    id: row.id,
    name: row.ad,
    email: row.eposta,
    active: row.etkin,
    lastLogin: row.sonGiris,
  };
}

function toAddress(row: {
  id: number;
  baslik: string;
  adres: string;
  varsayilan: boolean;
}): AddressRecord {
  return {
    id: row.id,
    title: row.baslik,
    address: row.adres,
    isDefault: row.varsayilan,
  };
}

export class PrismaCustomerStore implements CustomerStore {
  constructor(private db: PrismaClient) {}

  private async get(businessId: number, id: number): Promise<CustomerRecord | null> {
    const row = await this.db.musteri.findFirst({
      where: { id, businessId },
      include: {
        kullanicilar: { select: { etkin: true, sonGiris: true } },
        hareketler: { select: { borc: true, alacak: true } },
      },
    });
    return row ? toCustomer(row) : null;
  }

  async list(businessId: number): Promise<CustomerRecord[]> {
    const rows = await this.db.musteri.findMany({
      where: { businessId },
      orderBy: { ad: 'asc' },
      include: {
        kullanicilar: { select: { etkin: true, sonGiris: true } },
        hareketler: { select: { borc: true, alacak: true } },
      },
    });
    return rows.map(toCustomer);
  }

  async detail(businessId: number, id: number): Promise<CustomerDetailRecord | null> {
    const row = await this.db.musteri.findFirst({
      where: { id, businessId },
      include: {
        kullanicilar: { orderBy: { id: 'asc' } },
        adresler: { orderBy: [{ varsayilan: 'desc' }, { id: 'asc' }] },
        hareketler: { orderBy: [{ tarih: 'desc' }, { id: 'desc' }] },
        siparisler: {
          orderBy: [{ tarih: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            siparisNo: true,
            tarih: true,
            kdvDahilToplam: true,
            odendi: true,
            durum: true,
          },
        },
        iadeTalepleri: {
          orderBy: [{ tarih: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            siparisNo: true,
            tur: true,
            urunAdedi: true,
            tarih: true,
            durum: true,
          },
        },
      },
    });
    if (!row) return null;
    return {
      users: row.kullanicilar.map(toUser),
      addresses: row.adresler.map(toAddress),
      ledger: row.hareketler.map((entry) => ({
        id: entry.id,
        date: entry.tarih,
        ref: entry.referans,
        debt: money(entry.borc),
        credit: money(entry.alacak),
      })),
      orders: row.siparisler.map((order) => ({
        id: order.id,
        no: order.siparisNo,
        date: order.tarih,
        total: money(order.kdvDahilToplam),
        paid: order.odendi,
        status: order.durum,
      })),
      returns: row.iadeTalepleri.map((item) => ({
        id: item.id,
        orderNo: item.siparisNo,
        kind: item.tur,
        items: item.urunAdedi,
        date: item.tarih,
        status: item.durum,
      })),
    };
  }

  async create(businessId: number, draft: CustomerDraft): Promise<CustomerRecord | null> {
    const created = await this.db.$transaction(async (tx) => {
      const row = await tx.musteri.create({
        data: {
          businessId,
          musteriKodu: draft.code,
          ad: draft.name,
          tur: draft.kind,
          vergiKimligi: draft.taxId,
          telefon: draft.phone,
          eposta: draft.email,
          fiyatListesi: draft.priceList,
          cariTipi: draft.customerType,
          odemeSekilleri: JSON.stringify(draft.payments),
          kartAnlasmasi: draft.cardDeal,
        },
      });
      // Müşterinin varsayılan giriş hesabı; ad/e-posta müşteri formundan gelir.
      await tx.musteriKullanicisi.create({
        data: {
          musteriId: row.id,
          ad: draft.name,
          eposta: draft.email,
          etkin: true,
        },
      });
      return row;
    });
    return this.get(businessId, created.id);
  }

  async update(
    businessId: number,
    id: number,
    draft: CustomerDraft,
  ): Promise<CustomerRecord | null> {
    const updated = await this.db.$transaction(async (tx) => {
      const current = await tx.musteri.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      if (!current) return false;
      await tx.musteri.update({
        where: { id },
        data: {
          musteriKodu: draft.code,
          ad: draft.name,
          tur: draft.kind,
          vergiKimligi: draft.taxId,
          telefon: draft.phone,
          eposta: draft.email,
          fiyatListesi: draft.priceList,
          cariTipi: draft.customerType,
          odemeSekilleri: JSON.stringify(draft.payments),
          kartAnlasmasi: draft.cardDeal,
        },
      });
      // Müşteri formundaki ad/e-posta varsayılan giriş hesabına da yansır.
      const user = await tx.musteriKullanicisi.findFirst({
        where: { musteriId: id },
        orderBy: { id: 'asc' },
        select: { id: true },
      });
      if (user)
        await tx.musteriKullanicisi.update({
          where: { id: user.id },
          data: { ad: draft.name, eposta: draft.email },
        });
      return true;
    });
    return updated ? this.get(businessId, id) : null;
  }

  async remove(businessId: number, id: number): Promise<boolean> {
    const result = await this.db.musteri.deleteMany({ where: { id, businessId } });
    return result.count > 0;
  }

  async setLogin(businessId: number, id: number, active: boolean): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const current = await tx.musteri.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      if (!current) return false;
      await tx.musteri.update({ where: { id }, data: { etkin: active } });
      await tx.musteriKullanicisi.updateMany({ where: { musteriId: id }, data: { etkin: active } });
      return true;
    });
  }

  async saveAddress(
    businessId: number,
    id: number,
    draft: AddressDraft,
    addressId?: number,
  ): Promise<AddressRecord | null> {
    return this.db.$transaction(async (tx) => {
      const customer = await tx.musteri.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      if (!customer) return null;
      if (draft.isDefault)
        await tx.musteriAdresi.updateMany({
          where: { musteriId: id },
          data: { varsayilan: false },
        });
      if (addressId) {
        const existing = await tx.musteriAdresi.findFirst({
          where: { id: addressId, musteriId: id },
          select: { id: true },
        });
        if (!existing) return null;
        const row = await tx.musteriAdresi.update({
          where: { id: addressId },
          data: { baslik: draft.title, adres: draft.address, varsayilan: draft.isDefault },
        });
        return toAddress(row);
      }
      const count = await tx.musteriAdresi.count({ where: { musteriId: id } });
      const row = await tx.musteriAdresi.create({
        data: {
          musteriId: id,
          baslik: draft.title,
          adres: draft.address,
          varsayilan: draft.isDefault || count === 0,
        },
      });
      return toAddress(row);
    });
  }

  async setUserLogin(
    businessId: number,
    id: number,
    userId: number,
    active: boolean,
  ): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const customer = await tx.musteri.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      if (!customer) return false;
      const user = await tx.musteriKullanicisi.findFirst({
        where: { id: userId, musteriId: id },
        select: { id: true },
      });
      if (!user) return false;
      await tx.musteriKullanicisi.update({ where: { id: userId }, data: { etkin: active } });
      const activeCount = await tx.musteriKullanicisi.count({
        where: { musteriId: id, etkin: true },
      });
      await tx.musteri.update({ where: { id }, data: { etkin: activeCount > 0 } });
      return true;
    });
  }

  async codeExists(businessId: number, code: string, excludeId?: number): Promise<boolean> {
    if (!code) return false;
    const row = await this.db.musteri.findFirst({
      where: {
        businessId,
        musteriKodu: code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(row);
  }
}
