import { z } from 'zod';
import { campaignCartSchema } from './campaign';

const id = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .refine((v) => Number(v) <= 2147483647);
const quantity = z.number().finite().positive().max(1_000_000).multipleOf(0.001);
export const createOrderSchema = campaignCartSchema.extend({
  requestId: z.uuid(),
  customerId: id,
  paymentMethodId: id,
  address: z.string().trim().min(1).max(500),
  paymentKind: z.enum(['bank_transfer', 'cash', 'cash_on_delivery']),
  shippingVatRate: z.union([z.literal(0), z.literal(1), z.literal(10), z.literal(20)]).default(20),
  expectedTotal: z
    .string()
    .regex(/^\d{1,15}\.\d{2}$/)
    .nullable()
    .default(null),
});
export type CreateOrderInput = z.input<typeof createOrderSchema>;
export const recordPaymentSchema = z.strictObject({
  requestId: z.uuid(),
  reference: z.string().trim().min(3).max(160),
  confirmed: z.literal(true),
  expectedAmount: z.string().regex(/^\d{1,15}\.\d{2}$/),
});
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
export const createReturnSchema = z.strictObject({
  requestId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
  items: z
    .array(z.strictObject({ lineId: id, quantity }))
    .min(1)
    .max(100)
    .refine((v) => new Set(v.map((r) => r.lineId)).size === v.length, 'Aynı satır tekrar edemez.'),
});
export type CreateReturnInput = z.input<typeof createReturnSchema>;
export const completeReturnSchema = recordPaymentSchema.extend({
  restockLineIds: z
    .array(id)
    .max(100)
    .refine((v) => new Set(v).size === v.length),
});
export type CompleteReturnInput = z.input<typeof completeReturnSchema>;
export interface LifecycleDetail {
  managed: boolean;
  paymentKind: string | null;
  payments: { id: string; kind: string; amount: string; reference: string; date: string }[];
  returns: {
    id: string;
    status: string;
    amount: string | null;
    items: {
      lineId: string;
      name: string;
      quantity: string;
      restocked: boolean;
      stockTracked: boolean;
    }[];
  }[];
}
export interface OrderChoices {
  priceLists: { id: string; name: string }[];
  payments: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  products: { id: string; name: string; code: string }[];
}
