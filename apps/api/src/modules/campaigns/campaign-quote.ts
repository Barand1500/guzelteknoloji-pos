import { campaignCartSchema, type CampaignCartQuote } from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { calculateCampaignCart, type CartCampaign } from './campaign-calculator';

const D = Prisma.Decimal;
const strings = (value: Prisma.JsonValue) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
type PolicyRow = {
  durum: boolean;
  customerTypes: Prisma.JsonValue;
  priceLists: Prisma.JsonValue;
  minTotal: Prisma.Decimal;
  discountKind: string | null;
  discountValue: Prisma.Decimal | null;
  categoryLinks?: { categoryId: number }[];
  brandLinks?: { brandId: number }[];
};
function policy(row: PolicyRow, id: string): CartCampaign {
  return {
    id,
    active: row.durum,
    customerTypes: strings(row.customerTypes),
    priceLists: strings(row.priceLists),
    minTotal: row.minTotal.toString(),
    discountKind: row.discountKind === 'TUTAR' ? 'amount' : 'percent',
    discountValue: row.discountValue?.toString() ?? '0',
    categoryIds: row.categoryLinks?.map((link) => String(link.categoryId)) ?? [],
    brandIds: row.brandLinks?.map((link) => String(link.brandId)) ?? [],
  };
}

/** Yönetim önizlemesi: tutarlar tek DB görüntüsünden hesaplanır; stok/ödeme kaydı yazılmaz. */
export async function quoteCampaignCart(
  db: PrismaClient,
  businessId: number,
  ownerId: number,
  input: unknown,
  now = new Date(),
): Promise<CampaignCartQuote> {
  const data = campaignCartSchema.parse(input);
  return db.$transaction(
    (tx) => quoteCampaignCartTx(tx, businessId, ownerId, data, now),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

/** Sipariş yazımı kendi transaction'ında aynı fiyat motorunu kullanır. */
export async function quoteCampaignCartTx(
  tx: Prisma.TransactionClient,
  businessId: number,
  ownerId: number,
  input: unknown,
  now = new Date(),
): Promise<CampaignCartQuote> {
      const data = campaignCartSchema.parse(input);
      const [priceList, customerType, setting] = await Promise.all([
        tx.stokSecenegi.findFirst({
          where: {
            kimlik: Number(data.priceListId),
            kullaniciKimligi: ownerId,
            listeTuru: 'priceLists',
            durum: true,
          },
          select: { kimlik: true, secenekAdi: true },
        }),
        data.customerTypeId
          ? tx.cariTipi.findFirst({
              where: { id: Number(data.customerTypeId), isletmeId: businessId },
              select: { id: true, ad: true },
            })
          : null,
        tx.fiyatListesiAyari.findFirst({
          where: { isletmeId: businessId, secenekId: Number(data.priceListId) },
          select: { tur: true, baslangic: true, bitis: true },
        }),
      ]);
      if (!priceList)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Fiyat listesi bu işletmede bulunamadı.');
      if (data.customerTypeId && !customerType)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Cari tipi bu işletmede bulunamadı.');
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(now);
      if (
        setting?.tur === 'special' &&
        ((setting.baslangic && today < setting.baslangic.toISOString().slice(0, 10)) ||
          (setting.bitis && today > setting.bitis.toISOString().slice(0, 10)))
      )
        throw new HttpError(400, 'VALIDATION_ERROR', 'Bu fiyat listesi bugün geçerli değil.');

      const [products, campaigns] = await Promise.all([
        tx.stokKarti.findMany({
          where: {
            kullaniciKimligi: ownerId,
            satisAcik: true,
            kimlik: { in: data.items.map((item) => Number(item.productId)) },
          },
          select: {
            kimlik: true,
            stokAdi: true,
            stokKodu: true,
            markaKimligi: true,
            envanterTakibi: true,
            stokMiktari: true,
            kategoriler: { select: { kategoriId: true } },
            varyantlar: { take: 1, select: { id: true } },
            birimler: {
              where: { anaBirim: true },
              orderBy: { kimlik: 'asc' },
              take: 1,
              select: {
                fiyatlar: {
                  where: { fiyatYonu: 'satis', fiyatListesiKimligi: priceList.kimlik },
                  select: {
                    girilenFiyat: true,
                    paraBirimi: true,
                    iskontoOrani: true,
                    kdvOrani: true,
                    kdvDahilGirildi: true,
                  },
                },
              },
            },
          },
        }),
        tx.kampanya.findMany({
          where: { userId: ownerId, kind: { in: ['SEPET_INDIRIMI', 'UCRETSIZ_KARGO'] } },
          orderBy: { id: 'asc' },
          include: {
            rules: { orderBy: { id: 'asc' }, include: { categoryLinks: true, brandLinks: true } },
          },
        }),
      ]);
      if (products.length !== data.items.length)
        throw new HttpError(404, 'NOT_FOUND', 'Ürünlerden biri bulunamadı veya satışa kapalı.');
      const byId = new Map(products.map((product) => [String(product.kimlik), product]));
      const items = data.items.map((item) => {
        const product = byId.get(item.productId)!;
        if (product.varyantlar.length)
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Bu önizleme varyantsız ürünlerin ana birim fiyatlarını destekler.',
          );
        if (product.envanterTakibi !== 'yok' && product.stokMiktari.lt(item.quantity))
          throw new HttpError(
            409,
            'CONFLICT',
            `${product.stokAdi ?? 'Ürün'} için yeterli stok yok.`,
          );
        const price = product.birimler[0]?.fiyatlar[0];
        if (!price || price.girilenFiyat === null)
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            `${product.stokAdi ?? 'Ürün'} için seçilen listede satış fiyatı yok.`,
          );
        if (price.paraBirimi !== 'TRY')
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Bu önizleme yalnızca TRY fiyatlarını destekler.',
          );
        const discounted = price.girilenFiyat.mul(
          new D(1).minus((price.iskontoOrani ?? new D(0)).div(100)),
        );
        const unitPrice = price.kdvDahilGirildi
          ? discounted
          : discounted.mul(new D(1).plus((price.kdvOrani ?? new D(0)).div(100)));
        if (unitPrice.lt(0))
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Ürün fiyatını ve iskonto oranını kontrol edin.',
          );
        return {
          productId: item.productId,
          name: product.stokAdi ?? '',
          code: product.stokKodu ?? '',
          vatRate: (price.kdvOrani ?? new D(0)).toString(),
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(6),
          total: unitPrice.mul(item.quantity).toFixed(2),
        };
      });
      const cartRules: CartCampaign[] = [];
      const shippingRules: CartCampaign[] = [];
      for (const campaign of campaigns) {
        const rules = campaign.kind === 'SEPET_INDIRIMI' ? cartRules : shippingRules;
        rules.push(policy(campaign, `general:${campaign.id}`));
        for (const row of campaign.rules) rules.push(policy(row, `rule:${row.id}`));
      }
      const totals = calculateCampaignCart(
        items.map((item) => {
          const product = byId.get(item.productId)!;
          return {
            productId: item.productId,
            total: item.total,
            categoryIds: product.kategoriler.map((row) => String(row.kategoriId)),
            brandId: product.markaKimligi === null ? null : String(product.markaKimligi),
          };
        }),
        cartRules,
        shippingRules,
        {
          customerType: customerType
            ? { id: String(customerType.id), name: customerType.ad }
            : null,
          priceList: { id: String(priceList.kimlik), name: priceList.secenekAdi },
        },
        String(data.shippingFee),
      );
      const chosen = cartRules.find((r) => r.id === totals.cartRuleId);
      return { ...totals, items: items.map((item) => {
        const product = byId.get(item.productId)!;
        return { ...item, discountEligible: !!chosen &&
          (!chosen.categoryIds.length || product.kategoriler.some((k) => chosen.categoryIds.includes(String(k.kategoriId)))) &&
          (!chosen.brandIds.length || (product.markaKimligi !== null && chosen.brandIds.includes(String(product.markaKimligi)))) };
      }) };
}
