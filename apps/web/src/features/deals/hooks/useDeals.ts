import { useCallback, useEffect, useState } from 'react';
import { dealService } from '../services/deal.service';
import type { Deal, DealDraft } from '../types';

/**
 * Fırsat listesinin durumu. Aç/kapa ve sıralama "iyimser" çalışır: ekran anında güncellenir,
 * servis arkadan kaydeder. Gerçek API gelince yalnızca deal.service.ts değişir.
 */
export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void dealService.list().then((list) => {
      if (!active) return;
      setDeals(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => setDeals(await dealService.list()), []);

  const toggleActive = (id: string, active: boolean) => {
    setDeals((list) => list.map((d) => (d.id === id ? { ...d, active } : d)));
    void dealService.setActive(id, active);
  };

  const reorder = (next: Deal[]) => {
    setDeals(next);
    void dealService.reorder(next.map((d) => d.id));
  };

  /** Kimlik verilirse günceller, verilmezse yeni fırsat ekler (listenin sonuna). */
  const save = async (draft: DealDraft, id?: string): Promise<Deal> => {
    const saved = id ? await dealService.update(id, draft) : await dealService.create(draft);
    await refresh();
    return saved;
  };

  const remove = async (id: string) => {
    await dealService.remove(id);
    await refresh();
  };

  const assign = async (dealId: string, productIds: string[]) => {
    await dealService.assignProducts(dealId, productIds);
    await refresh();
  };

  const unassign = async (dealId: string, productIds: string[]) => {
    await dealService.unassignProducts(dealId, productIds);
    await refresh();
  };

  return { deals, loading, toggleActive, reorder, save, remove, assign, unassign };
}
