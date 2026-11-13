import { describe, expect, it } from 'vitest';
import { calculateCampaignCart, type CartCampaign } from '../modules/campaigns/campaign-calculator';

const rule = (patch: Partial<CartCampaign> = {}): CartCampaign => ({
  id: 'general',
  active: true,
  customerTypes: [],
  priceLists: [],
  minTotal: '0',
  discountKind: 'percent',
  discountValue: '10',
  categoryIds: [],
  brandIds: [],
  ...patch,
});
const context = { customerType: { id: '5', name: 'Bayi' }, priceList: { id: '6', name: 'TOPTAN' } };
const lines = [
  { productId: '1', total: '100.00', categoryIds: ['1'], brandId: '1' },
  { productId: '2', total: '200.00', categoryIds: ['1'], brandId: '2' },
  { productId: '3', total: '300.00', categoryIds: ['2'], brandId: '1' },
];

describe('Kayıtlı kampanyaların sepet hesabı', () => {
  it('uygun ürünlerdeki en avantajlı tek indirimi uygular; kargoyu ayrı değerlendirir', () => {
    const special = rule({
      id: 'special',
      categoryIds: ['1'],
      brandIds: ['1'],
      minTotal: '100',
      discountKind: 'amount',
      discountValue: '80',
    });
    const result = calculateCampaignCart(
      lines,
      [rule(), special],
      [rule({ id: 'shipping', categoryIds: ['1'], brandIds: ['1'], minTotal: '100' })],
      context,
      '25',
    );
    expect(result).toMatchObject({
      subtotal: '600.00',
      discount: '80.00',
      shippingDiscount: '25.00',
      total: '520.00',
      cartRuleId: 'special',
      shippingRuleId: 'shipping',
    });
  });

  it('pasif veya farklı cari/fiyat koşulundaki kuralları uygulamaz; eski adları tanır', () => {
    const result = calculateCampaignCart(
      lines,
      [
        rule({ active: false }),
        rule({ customerTypes: ['99'] }),
        rule({ priceLists: ['başka'] }),
        rule({ id: 'legacy', customerTypes: ['Bayi'], priceLists: ['TOPTAN'] }),
      ],
      [],
      context,
      '25',
    );
    expect(result).toMatchObject({
      discount: '60.00',
      shippingDiscount: '0.00',
      total: '565.00',
      cartRuleId: 'legacy',
    });
  });

  it('ondalık tutarı kuruşa yuvarlar; indirim tutarını uygun toplamla sınırlar', () => {
    const item = [{ productId: '1', total: '30.30', categoryIds: [], brandId: null }];
    expect(calculateCampaignCart(item, [rule()], [], context, '0').total).toBe('27.27');
    expect(
      calculateCampaignCart(
        item,
        [rule({ discountKind: 'amount', discountValue: '999' })],
        [],
        context,
        '0',
      ).total,
    ).toBe('0.00');
  });

  it('eşiği yalnızca kategori/marka koşuluna uyan ürünlerden hesaplar', () => {
    expect(
      calculateCampaignCart(
        lines,
        [rule({ categoryIds: ['1'], brandIds: ['1'], minTotal: '101' })],
        [],
        context,
        '25',
      ).discount,
    ).toBe('0.00');
  });
});
