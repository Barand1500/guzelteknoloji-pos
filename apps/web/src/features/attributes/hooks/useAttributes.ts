import { useCallback, useEffect, useMemo, useState } from 'react';
import { attributeService, type AttributeSnapshot } from '../services/attribute.service';
import type { GroupDraft, TemplateDraft, ValueDraft } from '../types';

const EMPTY: AttributeSnapshot = { templates: [], groups: [], values: [] };

/**
 * Özellik verisinin durumu (şablon → grup → özellik). Sıralama "iyimser" çalışır: ekran anında
 * güncellenir, servis arkadan kaydeder. Diğer işlemler kayıttan sonra veriyi tazeler (sayılar
 * sunucudan gelir). Gerçek API gelince yalnızca attribute.service.ts değişir.
 */
export function useAttributes() {
  const [data, setData] = useState<AttributeSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void attributeService.snapshot().then((snapshot) => {
      if (!active) return;
      setData(snapshot);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => setData(await attributeService.snapshot()), []);

  const templateById = useMemo(() => new Map(data.templates.map((t) => [t.id, t])), [data]);
  const groupById = useMemo(() => new Map(data.groups.map((g) => [g.id, g])), [data]);

  /** Aynı kapsamdaki kardeşlerin sırasını yazar; diğerleri yerinde kalır. */
  const reorderIn = <T extends { id: string }>(
    list: T[],
    inScope: (item: T) => boolean,
    next: T[],
  ): T[] => {
    let i = 0;
    return list.map((item) => (inScope(item) ? (next[i++] ?? item) : item));
  };

  return {
    ...data,
    loading,
    templateById,
    groupById,

    reorderTemplates: (next: typeof data.templates) => {
      setData((d) => ({ ...d, templates: reorderIn(d.templates, () => true, next) }));
      void attributeService.reorderTemplates(next.map((t) => t.id));
    },
    reorderGroups: (templateId: string, next: typeof data.groups) => {
      setData((d) => ({
        ...d,
        groups: reorderIn(d.groups, (g) => g.templateId === templateId, next),
      }));
      void attributeService.reorderGroups(
        templateId,
        next.map((g) => g.id),
      );
    },
    reorderValues: (groupId: string, next: typeof data.values) => {
      setData((d) => ({
        ...d,
        values: reorderIn(d.values, (v) => v.groupId === groupId, next),
      }));
      void attributeService.reorderValues(
        groupId,
        next.map((v) => v.id),
      );
    },

    saveTemplate: async (draft: TemplateDraft, id?: string) => {
      const savedId = id
        ? (await attributeService.updateTemplate(id, draft), id)
        : await attributeService.createTemplate(draft);
      await refresh();
      return savedId;
    },
    removeTemplate: async (id: string) => {
      await attributeService.removeTemplate(id);
      await refresh();
    },

    saveGroup: async (draft: GroupDraft, id?: string) => {
      const savedId = id
        ? (await attributeService.updateGroup(id, draft), id)
        : await attributeService.createGroup(draft);
      await refresh();
      return savedId;
    },
    removeGroup: async (id: string) => {
      await attributeService.removeGroup(id);
      await refresh();
    },

    saveValue: async (groupId: string, draft: ValueDraft, id?: string) => {
      if (id) await attributeService.updateValue(id, draft);
      else await attributeService.createValue(groupId, draft);
      await refresh();
    },
    removeValue: async (id: string) => {
      await attributeService.removeValue(id);
      await refresh();
    },
  };
}
