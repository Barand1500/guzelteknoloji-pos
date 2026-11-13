import type { MessageEvent } from '@gt/shared';
import type { Prisma } from '../../generated/prisma/client';

export interface OrderMessageEvent {
  businessId: number;
  orderId: number;
  event: MessageEvent;
  key: string;
  returnId?: number;
}
export type OrderMessageHandler = (
  tx: Prisma.TransactionClient,
  event: OrderMessageEvent,
) => Promise<void>;
