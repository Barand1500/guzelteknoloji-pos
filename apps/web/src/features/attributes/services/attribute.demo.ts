import { groupSeeds, templateSeeds, valueSeeds } from '../../../mocks/attribute.mock';
import type {
  AttrGroup,
  AttrTemplate,
  AttrValue,
  GroupDraft,
  TemplateDraft,
  ValueDraft,
} from '../types';

/**
 * Özellik verisine (şablon → grup → özellik) erişimin TEK kapısı. Şimdilik bellekte tutulan sahte
 * veri (sayfa yenilenince başa döner); gerçek API gelince yalnızca bu dosya değişir.
 */
type TemplateRow = Omit<AttrTemplate, 'groupCount'>;
type GroupRow = Omit<AttrGroup, 'valueCount'>;

let templates: TemplateRow[] = templateSeeds.map((t) => ({
  ...t,
  categoryIds: [...t.categoryIds],
}));
let groups: GroupRow[] = groupSeeds.map((g) => ({ ...g }));
let values: AttrValue[] = valueSeeds.map((v) => ({ ...v }));
let seq = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AttributeSnapshot {
  templates: AttrTemplate[];
  groups: AttrGroup[];
  values: AttrValue[];
}

/** Sıra: kardeşlerin sırası, listedeki sıralarıdır; yeniden sıralama yalnızca kardeşleri değiştirir. */
function reorderWithin<T extends { id: string }>(
  all: T[],
  inScope: (item: T) => boolean,
  ids: string[],
): T[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  const queue = ids.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
  let i = 0;
  return all.map((item) => (inScope(item) ? (queue[i++] ?? item) : item));
}

export const demoAttributeService = {
  /** Yalnızca testler için: sahte veriyi başlangıç haline döndürür. */
  reset(): void {
    templates = templateSeeds.map((t) => ({ ...t, categoryIds: [...t.categoryIds] }));
    groups = groupSeeds.map((g) => ({ ...g }));
    values = valueSeeds.map((v) => ({ ...v }));
  },

  async snapshot(): Promise<AttributeSnapshot> {
    await wait(60);
    return {
      templates: templates.map((t) => ({
        ...t,
        categoryIds: [...t.categoryIds],
        groupCount: groups.filter((g) => g.templateId === t.id).length,
      })),
      groups: groups.map((g) => ({
        ...g,
        valueCount: values.filter((v) => v.groupId === g.id).length,
      })),
      values: values.map((v) => ({ ...v })),
    };
  },

  // ---- Şablon ----------------------------------------------------------------------------
  async createTemplate(draft: TemplateDraft): Promise<string> {
    await wait(0);
    const id = `t-yeni-${++seq}`;
    templates = [...templates, { id, ...draft, categoryIds: [...draft.categoryIds] }];
    return id;
  },
  async updateTemplate(id: string, draft: TemplateDraft): Promise<void> {
    await wait(0);
    templates = templates.map((t) =>
      t.id === id ? { ...t, ...draft, categoryIds: [...draft.categoryIds] } : t,
    );
  },
  /** Şablonu, gruplarını ve özelliklerini siler. */
  async removeTemplate(id: string): Promise<void> {
    await wait(0);
    const gone = new Set(groups.filter((g) => g.templateId === id).map((g) => g.id));
    values = values.filter((v) => !gone.has(v.groupId));
    groups = groups.filter((g) => g.templateId !== id);
    templates = templates.filter((t) => t.id !== id);
  },
  async reorderTemplates(ids: string[]): Promise<void> {
    await wait(0);
    templates = reorderWithin(templates, () => true, ids);
  },

  // ---- Grup ------------------------------------------------------------------------------
  async createGroup(draft: GroupDraft): Promise<string> {
    await wait(0);
    const id = `g-yeni-${++seq}`;
    groups = [...groups, { id, ...draft }];
    return id;
  },
  /** Şablon değişirse grup yeni şablonun sonuna taşınır. */
  async updateGroup(id: string, draft: GroupDraft): Promise<void> {
    await wait(0);
    const current = groups.find((g) => g.id === id);
    if (!current) throw new Error('Grup bulunamadı.');
    const next = { ...current, ...draft };
    groups =
      current.templateId === draft.templateId
        ? groups.map((g) => (g.id === id ? next : g))
        : [...groups.filter((g) => g.id !== id), next];
  },
  async removeGroup(id: string): Promise<void> {
    await wait(0);
    values = values.filter((v) => v.groupId !== id);
    groups = groups.filter((g) => g.id !== id);
  },
  async reorderGroups(templateId: string, ids: string[]): Promise<void> {
    await wait(0);
    groups = reorderWithin(groups, (g) => g.templateId === templateId, ids);
  },

  // ---- Özellik (değer) -------------------------------------------------------------------
  async createValue(groupId: string, draft: ValueDraft): Promise<string> {
    await wait(0);
    const id = `v-yeni-${++seq}`;
    values = [...values, { id, groupId, ...draft }];
    return id;
  },
  async updateValue(id: string, draft: ValueDraft): Promise<void> {
    await wait(0);
    values = values.map((v) => (v.id === id ? { ...v, ...draft } : v));
  },
  async removeValue(id: string): Promise<void> {
    await wait(0);
    values = values.filter((v) => v.id !== id);
  },
  async reorderValues(groupId: string, ids: string[]): Promise<void> {
    await wait(0);
    values = reorderWithin(values, (v) => v.groupId === groupId, ids);
  },
};
