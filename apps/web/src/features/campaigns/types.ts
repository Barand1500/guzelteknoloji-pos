/**
 * Kampanyalar: iki sayfa (Sepet İndirimi, Ücretsiz Kargo). İkisi de aynı iskeleti kullanır:
 * bir GENEL KURAL (tüm sepete) ve ürün/kategori/markaya ÖZEL KURALLAR.
 *
 * Sunucu sözleşmesi (`tur`: "sepet-indirimi" | "ucretsiz-kargo"):
 *  - GET  /api/kampanyalar/:tur                      → CampaignData
 *  - POST /api/kampanyalar/:tur/genel                → gövde GeneralRule (genel kuralı kaydeder)
 *  - POST /api/kampanyalar/:tur/kurallar             → gövde RuleDraft (yeni özel kural) → CampaignRule
 *  - POST /api/kampanyalar/:tur/kurallar/:id         → gövde RuleDraft (güncelle) → CampaignRule
 *  - POST /api/kampanyalar/:tur/kurallar/:id/aktiflik → gövde { active }
 *  - POST /api/kampanyalar/:tur/kurallar/:id/sil
 * Boş liste "hepsi" demektir (categoryIds boşsa tüm kategoriler, customerTypes boşsa tüm cari tipleri…).
 */
export type CampaignKind = 'cart' | 'shipping';
export type DiscountKind = 'percent' | 'amount';

export const CAMPAIGN_SLUG: Record<CampaignKind, string> = {
  cart: 'sepet-indirimi',
  shipping: 'ucretsiz-kargo',
};

export const CUSTOMER_TYPE_OPTIONS = ['Son Kullanıcı', 'Bayi', 'Kurumsal'] as const;
export const PRICE_LIST_OPTIONS = ['FİYAT', 'PERAKENDE', 'TOPTAN'] as const;

/** Genel kural: tüm sepete uygulanır. `discountKind/Value` yalnızca sepet indiriminde anlamlıdır. */
export interface GeneralRule {
  active: boolean;
  customerTypes: string[];
  priceLists: string[];
  /** "X tutar üzeri" (₺). 0 = her sepet. */
  minTotal: number;
  discountKind: DiscountKind;
  discountValue: number;
}

export interface CampaignRule extends GeneralRule {
  id: string;
  categoryIds: string[];
  brandIds: string[];
}

export type RuleDraft = Omit<CampaignRule, 'id'>;

export interface CampaignData {
  general: GeneralRule;
  rules: CampaignRule[];
}

export const emptyRuleDraft = (): RuleDraft => ({
  active: true,
  categoryIds: [],
  brandIds: [],
  customerTypes: [],
  priceLists: [],
  minTotal: 0,
  discountKind: 'percent',
  discountValue: 10,
});

/** Verilen sepet tutarında kuralın sonucu: indirim (₺), ödenecek tutar ve kargo ücretsiz mi. */
export function outcome(rule: GeneralRule, kind: CampaignKind, cart: number) {
  const applies = cart >= rule.minTotal && cart > 0;
  if (kind === 'shipping') return { applies, discount: 0, pay: cart, freeShipping: applies };
  const raw = rule.discountKind === 'percent' ? (cart * rule.discountValue) / 100 : rule.discountValue;
  const discount = applies ? Math.min(cart, Math.round(raw * 100) / 100) : 0;
  return { applies, discount, pay: cart - discount, freeShipping: false };
}

/** Kısa özet cümlesi: "5.000 ₺ ve üzeri sepette %10 indirim". */
export function summarize(rule: GeneralRule, kind: CampaignKind): string {
  const money = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;
  const when = rule.minTotal > 0 ? `${money(rule.minTotal)} ve üzeri sepette` : 'Her sepette';
  if (kind === 'shipping') return `${when} kargo ücretsiz`;
  const what =
    rule.discountKind === 'percent'
      ? `%${rule.discountValue.toLocaleString('tr-TR')}`
      : money(rule.discountValue);
  return `${when} ${what} indirim`;
}
