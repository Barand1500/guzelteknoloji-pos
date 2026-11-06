import { useCallback, useMemo } from 'react';
import { useCategoryService } from '../services/category.service';
import { useManagedData } from '../../../lib/useManagedData';
import type { Category, CategoryDraft } from '../types';
export function useCategories() {
  const service = useCategoryService();
  const load = useCallback(() => service.list(), [service]);
  const state = useManagedData<Category[]>(load, []);
  const categories = state.data;
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const save = (draft: CategoryDraft, id?: string) =>
    state.perform(() => (id ? service.update(id, draft) : service.create(draft)));
  const move = (id: string, parentId: string | null) =>
    state.perform(() => service.move(id, parentId));
  const remove = (id: string) => state.perform(() => service.remove(id));
  const assign = (id: string, ids: string[]) =>
    state.perform(() => service.assignProducts(id, ids));
  const unassign = (id: string, ids: string[]) =>
    state.perform(() => service.unassignProducts(id, ids));
  const toggleActive = (id: string, active: boolean) => {
    void state.perform(() => service.setActive(id, active)).catch(() => undefined);
  };
  const reorder = (parentId: string | null, next: Category[]) => {
    void state
      .perform(() =>
        service.reorder(
          parentId,
          next.map((c) => c.id),
        ),
      )
      .catch(() => undefined);
  };
  return {
    categories,
    byId,
    loading: state.loading,
    error: state.error,
    refresh: state.refresh,
    save,
    move,
    remove,
    assign,
    unassign,
    toggleActive,
    reorder,
  };
}
