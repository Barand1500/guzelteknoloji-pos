import { apiRequest } from '../../../lib/http';
import { imageAddress, imagePayload, useDataService } from '../../../lib/catalog-data';
import { demoAttributeService } from './attribute.demo';
import type { GroupDraft, TemplateDraft, ValueDraft } from '../types';
export type { AttributeSnapshot } from './attribute.demo';
import type { AttributeSnapshot } from './attribute.demo';
const base = '/api/ozellikler';
const saveId = async (path: string, body: unknown) =>
  (await apiRequest<{ id: string }>(base + path, { method: 'POST', body })).id;
const post = (path: string, body?: unknown) =>
  apiRequest<void>(base + path, { method: 'POST', body });
const val = (draft: ValueDraft) => ({ ...draft, imageUrl: imagePayload(draft.imageUrl) });
export const attributeService = {
  snapshot: async (): Promise<AttributeSnapshot> => {
    const result = await apiRequest<AttributeSnapshot>(base);
    return {
      ...result,
      values: result.values.map((v) => ({ ...v, imageUrl: imageAddress(v.imageUrl) })),
    };
  },
  createTemplate: (draft: TemplateDraft) => saveId('/sablonlar', draft),
  updateTemplate: async (id: string, draft: TemplateDraft): Promise<void> => {
    await saveId('/sablonlar/' + id, draft);
  },
  removeTemplate: (id: string) => post('/sablonlar/' + id + '/sil'),
  reorderTemplates: (ids: string[]) => post('/sablonlar/sirala', { ids }),
  createGroup: (draft: GroupDraft) => saveId('/gruplar', draft),
  updateGroup: async (id: string, draft: GroupDraft): Promise<void> => {
    await saveId('/gruplar/' + id, draft);
  },
  removeGroup: (id: string) => post('/gruplar/' + id + '/sil'),
  reorderGroups: (templateId: string, ids: string[]) =>
    post('/gruplar/sirala', { templateId, ids }),
  createValue: (groupId: string, draft: ValueDraft) =>
    saveId('/gruplar/' + groupId + '/degerler', val(draft)),
  updateValue: async (id: string, draft: ValueDraft): Promise<void> => {
    await saveId('/degerler/' + id, val(draft));
  },
  removeValue: (id: string) => post('/degerler/' + id + '/sil'),
  reorderValues: (groupId: string, ids: string[]) => post('/degerler/sirala', { groupId, ids }),
};
export const useAttributeService = () => useDataService(attributeService, demoAttributeService);
