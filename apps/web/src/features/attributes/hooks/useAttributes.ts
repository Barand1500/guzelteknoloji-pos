import { useCallback, useMemo } from 'react';
import { useAttributeService, type AttributeSnapshot } from '../services/attribute.service';
import { useManagedData } from '../../../lib/useManagedData';
import type {
  AttrTemplate,
  AttrGroup,
  AttrValue,
  GroupDraft,
  TemplateDraft,
  ValueDraft,
} from '../types';
const EMPTY: AttributeSnapshot = { templates: [], groups: [], values: [] };
export function useAttributes() {
  const service = useAttributeService();
  const load = useCallback(() => service.snapshot(), [service]);
  const state = useManagedData(load, EMPTY);
  const templateById = useMemo(
    () => new Map(state.data.templates.map((t) => [t.id, t])),
    [state.data.templates],
  );
  const groupById = useMemo(
    () => new Map(state.data.groups.map((g) => [g.id, g])),
    [state.data.groups],
  );
  return {
    ...state.data,
    loading: state.loading,
    error: state.error,
    refresh: state.refresh,
    templateById,
    groupById,
    reorderTemplates: (next: AttrTemplate[]) => {
      void state
        .perform(() => service.reorderTemplates(next.map((t) => t.id)))
        .catch(() => undefined);
    },
    reorderGroups: (templateId: string, next: AttrGroup[]) => {
      void state
        .perform(() =>
          service.reorderGroups(
            templateId,
            next.map((g) => g.id),
          ),
        )
        .catch(() => undefined);
    },
    reorderValues: (groupId: string, next: AttrValue[]) => {
      void state
        .perform(() =>
          service.reorderValues(
            groupId,
            next.map((v) => v.id),
          ),
        )
        .catch(() => undefined);
    },
    saveTemplate: (draft: TemplateDraft, id?: string) =>
      state.perform(async () =>
        id ? (await service.updateTemplate(id, draft), id) : service.createTemplate(draft),
      ),
    removeTemplate: (id: string) => state.perform(() => service.removeTemplate(id)),
    saveGroup: (draft: GroupDraft, id?: string) =>
      state.perform(async () =>
        id ? (await service.updateGroup(id, draft), id) : service.createGroup(draft),
      ),
    removeGroup: (id: string) => state.perform(() => service.removeGroup(id)),
    saveValue: (groupId: string, draft: ValueDraft, id?: string) =>
      state.perform(async () => {
        if (id) await service.updateValue(id, draft);
        else await service.createValue(groupId, draft);
      }),
    removeValue: (id: string) => state.perform(() => service.removeValue(id)),
    valueProducts: (id: string) => service.valueProducts(id),
    /** Şablonu gruplarıyla ve özellikleriyle birlikte yeni bir şablona kopyalar; yeni kimliği verir. */
    copyTemplate: (name: string, source: AttrTemplate) =>
      state.perform(async () => {
        const newId = await service.createTemplate({
          name,
          allProducts: source.allProducts,
          categoryIds: [...source.categoryIds],
        });
        for (const g of state.data.groups.filter((x) => x.templateId === source.id)) {
          const groupId = await service.createGroup({
            templateId: newId,
            name: g.name,
            kind: g.kind,
            filter: g.filter,
            multiple: g.multiple,
            variant: g.variant,
            showOnImage: g.showOnImage,
            position: g.position,
            size: g.size,
          });
          for (const v of state.data.values.filter((x) => x.groupId === g.id))
            await service.createValue(groupId, {
              code: v.code,
              name: v.name,
              color: v.color,
              imageUrl: v.imageUrl,
            });
        }
        return newId;
      }),
  };
}
