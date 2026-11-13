import { Prisma } from '../../generated/prisma/client';

const D = Prisma.Decimal;
export interface CartCampaign {
  id: string;
  active: boolean;
  customerTypes: string[];
  priceLists: string[];
  minTotal: string;
  discountKind: 'percent' | 'amount';
  discountValue: string;
  categoryIds: string[];
  brandIds: string[];
}
export interface CartCampaignLine {
  productId: string;
  total: string;
  categoryIds: string[];
  brandId: string | null;
}
export interface CartAudience {
  customerType: { id: string; name: string } | null;
  priceList: { id: string; name: string };
}
const fold = (value: string) => value.trim().toLocaleLowerCase('tr');
function matches(values: string[], selected: { id: string; name: string } | null) {
  return (
    values.length === 0 ||
    (!!selected &&
      values.some((value) => value === selected.id || fold(value) === fold(selected.name)))
  );
}

/** Saf hesap: fiyatlar adaptör tarafından veritabanından gelir; indirimler üst üste binmez. */
export function calculateCampaignCart(
  lines: CartCampaignLine[],
  cartRules: CartCampaign[],
  shippingRules: CartCampaign[],
  audience: CartAudience,
  shippingFee: string,
) {
  const subtotal = lines.reduce((sum, line) => sum.plus(line.total), new D(0)).toDecimalPlaces(2);
  function eligible(rule: CartCampaign) {
    if (
      !rule.active ||
      !matches(rule.customerTypes, audience.customerType) ||
      !matches(rule.priceLists, audience.priceList)
    )
      return new D(0);
    const total = lines
      .filter(
        (line) =>
          (!rule.categoryIds.length ||
            line.categoryIds.some((id) => rule.categoryIds.includes(id))) &&
          (!rule.brandIds.length ||
            (line.brandId !== null && rule.brandIds.includes(line.brandId))),
      )
      .reduce((sum, line) => sum.plus(line.total), new D(0));
    return total.gt(0) && total.gte(rule.minTotal) ? total : new D(0);
  }
  let discount = new D(0);
  let cartRuleId: string | null = null;
  for (const rule of cartRules) {
    const total = eligible(rule);
    if (total.isZero()) continue;
    const raw =
      rule.discountKind === 'percent'
        ? total.mul(rule.discountValue).div(100)
        : new D(rule.discountValue);
    const amount = D.min(total, D.max(0, raw)).toDecimalPlaces(2);
    if (amount.gt(discount)) {
      discount = amount;
      cartRuleId = rule.id;
    }
  }
  const shippingRuleId = shippingRules.find((rule) => eligible(rule).gt(0))?.id ?? null;
  const shipping = new D(shippingFee).toDecimalPlaces(2);
  const shippingDiscount = shippingRuleId ? shipping : new D(0);
  return {
    currency: 'TRY' as const,
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    shippingFee: shipping.toFixed(2),
    shippingDiscount: shippingDiscount.toFixed(2),
    total: subtotal.minus(discount).plus(shipping).minus(shippingDiscount).toFixed(2),
    cartRuleId,
    shippingRuleId,
  };
}
