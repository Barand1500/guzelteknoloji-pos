import type { PaymentDraftInput, PaymentIconKey, PaymentMethodDto } from '@gt/shared';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { BrandLogoStorage, logoMime } from '../brands/brand-logo.storage';
import { prepareBrandLogo } from '../brands/brand.repository';

/** Kayıtlı görselin adresi; düzenleme formu bu adresi geri gönderir, dosya yeniden yüklenmez. */
const imageUrl = (id: number, gorselAdi: string | null) =>
  gorselAdi ? `/api/odeme-sekilleri/${id}/gorsel` : null;

type Row = {
  id: number;
  ad: string;
  simge: string | null;
  gorselAdi: string | null;
  varsayilan: boolean;
  fiyatListesi: string;
  kargoYok: boolean;
  duzenlemeyeAcik: boolean;
  aktif: boolean;
};

const toDto = (row: Row): PaymentMethodDto => ({
  id: String(row.id),
  name: row.ad,
  icon: (row.simge as PaymentIconKey | null) ?? null,
  iconUrl: imageUrl(row.id, row.gorselAdi),
  active: row.aktif,
  isDefault: row.varsayilan,
  priceList: row.fiyatListesi,
  noShipping: row.kargoYok,
  allowAdjust: row.duzenlemeyeAcik,
});

/** Tanımlamalar › Ödeme Şekilleri: işletme kapsamlı, sıralı yöntem listesi. */
export class PaymentRepository {
  private readonly storage: BrandLogoStorage;
  constructor(
    private readonly db: PrismaClient,
    uploadsDir: string,
  ) {
    this.storage = new BrandLogoStorage(uploadsDir, 'odeme');
  }

  async list(businessId: number): Promise<PaymentMethodDto[]> {
    const rows = await this.db.odemeSekli.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toDto);
  }

  async save(businessId: number, input: PaymentDraftInput, id?: number) {
    const existing = id
      ? await this.db.odemeSekli.findFirst({ where: { id, isletmeId: businessId } })
      : null;
    if (id && !existing) throw new HttpError(404, 'NOT_FOUND', 'Ödeme şekli bulunamadı.');

    // Görsel: null → temizle, kayıtlı adres → koru, data URL → dosyaya yaz.
    let gorselAdi = existing?.gorselAdi ?? null;
    if (input.iconUrl === null) {
      gorselAdi = null;
    } else if (!input.iconUrl.startsWith('/api/odeme-sekilleri/')) {
      if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(input.iconUrl))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir görsel seçin.');
      const image = await prepareBrandLogo(input.iconUrl);
      if (!image) throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir görsel seçin.');
      const written = await this.storage.write(image.data, image.format);
      if (existing?.gorselAdi) await this.storage.remove(existing.gorselAdi).catch(() => undefined);
      gorselAdi = written;
    }

    const data = {
      ad: input.name,
      simge: input.icon,
      gorselAdi,
      varsayilan: input.isDefault,
      fiyatListesi: input.priceList,
      kargoYok: input.noShipping,
      duzenlemeyeAcik: input.allowAdjust,
    };

    let savedId: number;
    if (id && existing) {
      await this.db.odemeSekli.update({ where: { id }, data });
      savedId = id;
      // Görsel kaldırıldıysa dosya diskte kalmasın.
      if (input.iconUrl === null && existing.gorselAdi)
        await this.storage.remove(existing.gorselAdi).catch(() => undefined);
    } else {
      // Yeni yöntem listenin sonuna eklenir.
      const last = await this.db.odemeSekli.findFirst({
        where: { isletmeId: businessId },
        orderBy: { sira: 'desc' },
        select: { sira: true },
      });
      const created = await this.db.odemeSekli.create({
        data: { ...data, isletmeId: businessId, sira: (last?.sira ?? -1) + 1 },
      });
      savedId = created.id;
    }
    const list = await this.list(businessId);
    return list.find((item) => item.id === String(savedId))!;
  }

  async remove(businessId: number, id: number) {
    const row = await this.db.odemeSekli.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Ödeme şekli bulunamadı.');
    await this.db.odemeSekli.delete({ where: { id } });
    if (row.gorselAdi) await this.storage.remove(row.gorselAdi).catch(() => undefined);
  }

  async setActive(businessId: number, id: number, active: boolean) {
    const row = await this.db.odemeSekli.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Ödeme şekli bulunamadı.');
    await this.db.odemeSekli.update({ where: { id }, data: { aktif: active } });
  }

  /** Sürükle-bırak sonrası sıra tek transaction'da 0..n-1 olarak yazılır. */
  async reorder(businessId: number, ids: string[]) {
    const order = ids.map((value) => Number(value));
    if (new Set(order).size !== order.length)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Sıralamada aynı kayıt iki kez gönderildi.');
    await this.db.$transaction(async (tx) => {
      const rows = await tx.odemeSekli.findMany({
        where: { isletmeId: businessId, id: { in: order } },
        select: { id: true },
      });
      if (rows.length !== order.length)
        throw new HttpError(404, 'NOT_FOUND', 'Ödeme şekillerinden biri bulunamadı.');
      for (const [index, id] of order.entries())
        await tx.odemeSekli.update({ where: { id }, data: { sira: index } });
    });
  }

  /** Kayıtlı görselin baytları (yetkili uç üzerinden sunulur). */
  async image(businessId: number, id: number) {
    const row = await this.db.odemeSekli.findFirst({
      where: { id, isletmeId: businessId },
      select: { gorselAdi: true },
    });
    if (!row?.gorselAdi) throw new HttpError(404, 'NOT_FOUND', 'Görsel bulunamadı.');
    const file = await this.storage.read(row.gorselAdi);
    return { data: file.data, mime: logoMime(file.format) };
  }
}
