import { z } from 'zod';
import { recordId, recordKey } from '../stock/stock.api';

export const categoryKey = z.union([recordKey, recordId]).transform(Number);
export const categoryIds = z
  .array(categoryKey)
  .max(1000)
  .refine((ids) => new Set(ids).size === ids.length, 'Tekrarlanan kayıt seçilemez.');
export const categoryDraftSchema = z.strictObject({
  parentId: categoryKey.nullable(),
  name: z.string().trim().min(1, 'Kategori adı girin.').max(120),
  description: z.string().max(10000),
  imageUrl: z.string().max(3000000).nullable(),
  active: z.boolean(),
  hidden: z.boolean(),
  seoTitle: z.string().max(250),
  seoDescription: z.string().max(1000),
});
export type CategoryDraftInput = z.infer<typeof categoryDraftSchema>;
