import { Prisma } from '../../generated/prisma/client';

const D = Prisma.Decimal;
/** En büyük kalan yöntemi: dağıtılan tutarlar tam olarak verilen toplamı verir. */
export function allocateMoney(total: string, weights: string[]): string[] {
  const cents = new D(total).mul(100).toDecimalPlaces(0);
  const sum = weights.reduce((n, value) => n.plus(value), new D(0));
  if (cents.lt(0) || sum.lt(total) || weights.some((w) => new D(w).lt(0)))
    throw new Error('Dağıtılacak tutar geçersiz.');
  if (sum.isZero()) return weights.map(() => '0.00');
  const shares = weights.map((w, index) => {
    const exact = cents.mul(w).div(sum);
    return { index, value: exact.floor(), rest: exact.minus(exact.floor()) };
  });
  let left = cents.minus(shares.reduce((n, s) => n.plus(s.value), new D(0))).toNumber();
  for (const s of [...shares].sort((a, b) => b.rest.comparedTo(a.rest) || a.index - b.index)) {
    if (left-- <= 0) break;
    s.value = s.value.plus(1);
  }
  return shares.map((s) => s.value.div(100).toFixed(2));
}

/** Son kısmi iade, önceki iadelerin kuruş farkını kapatır. */
export function returnedAmount(
  total: string,
  sold: string,
  returned: string,
  refunded: string,
  quantity: string,
) {
  const count = new D(returned).plus(quantity);
  if (new D(quantity).lte(0) || count.gt(sold))
    throw new Error('İade miktarı satılan miktarı aşıyor.');
  return D.max(0, new D(total).mul(count).div(sold).toDecimalPlaces(2).minus(refunded)).toFixed(2);
}
