import { z } from 'zod';

const id = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((value) => Number(value) <= 2147483647);
export const campaignCartSchema = z.strictObject({
  priceListId: id,
  customerTypeId: id.nullable().default(null),
  shippingFee: z.number().finite().min(0).max(1_000_000_000).default(0),
  items: z
    .array(
      z.strictObject({
        productId: id,
        quantity: z.number().finite().positive().max(1_000_000).multipleOf(0.001),
      }),
    )
    .min(1, 'En az bir ürün seçin.')
    .max(100)
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      'Aynı ürünü tek satırda birleştirin.',
    ),
});
export type CampaignCartInput = z.input<typeof campaignCartSchema>;
export type CampaignCartData = z.output<typeof campaignCartSchema>;
export interface CampaignCartQuote {
  currency: 'TRY';
  subtotal: string;
  discount: string;
  shippingFee: string;
  shippingDiscount: string;
  total: string;
  cartRuleId: string | null;
  shippingRuleId: string | null;
  items: { productId: string; name: string; quantity: number; unitPrice: string; total: string; code?: string; vatRate?: string; discountEligible?: boolean }[];
}
