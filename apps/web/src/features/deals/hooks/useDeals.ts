import { useCallback } from 'react';
import { useDealService } from '../services/deal.service';
import { useManagedData } from '../../../lib/useManagedData';
import type { Deal, DealDraft } from '../types';
export function useDeals() {
  const service = useDealService();
  const load = useCallback(() => service.list(), [service]);
  const state = useManagedData<Deal[]>(load, []);
  return {
    deals: state.data,
    loading: state.loading,
    error: state.error,
    refresh: state.refresh,
    toggleActive: (id: string, active: boolean) => {
      void state.perform(() => service.setActive(id, active)).catch(() => undefined);
    },
    reorder: (next: Deal[]) => {
      void state.perform(() => service.reorder(next.map((d) => d.id))).catch(() => undefined);
    },
    save: (draft: DealDraft, id?: string) =>
      state.perform(() => (id ? service.update(id, draft) : service.create(draft))),
    remove: (id: string) => state.perform(() => service.remove(id)),
    assign: (id: string, ids: string[]) => state.perform(() => service.assignProducts(id, ids)),
    unassign: (id: string, ids: string[]) => state.perform(() => service.unassignProducts(id, ids)),
  };
}
