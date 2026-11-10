import { useCallback, useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useOrderService, type Loaded } from '../services/order.service';
import type { Order, OrderStatus, ReturnRequest, ReturnStatus } from '../types';

/** Ortak yükleme: liste + örnek-veri bayrağı + hata + durum değişimi (örnek veride yalnızca ekranda). */
function useList<T extends { id: string; status: S }, S extends string>(
  fetchList: () => Promise<Loaded<T>>,
  save: (id: string, status: S) => Promise<void>,
) {
  const { session } = useSession();
  const [items, setItems] = useState<T[]>([]);
  const [sample, setSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const settled = session.status !== 'loading';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void fetchList()
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setSample(result.sample);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(dataError(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchList, settled, retry]);

  const refresh = useCallback(() => setRetry((n) => n + 1), []);
  const setStatus = async (id: string, status: S) => {
    if (!sample) await save(id, status);
    setItems((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));
  };
  return { items, sample, loading, error, refresh, setStatus };
}

export function useOrders() {
  const service = useOrderService();
  const fetchList = useCallback(() => service.list(), [service]);
  const save = useCallback(
    (id: string, status: OrderStatus) => service.setStatus(id, status),
    [service],
  );
  const state = useList<Order, OrderStatus>(fetchList, save);
  return { ...state, orders: state.items };
}

export function useReturns() {
  const service = useOrderService();
  const fetchList = useCallback(() => service.listReturns(), [service]);
  const save = useCallback(
    (id: string, status: ReturnStatus) => service.setReturnStatus(id, status),
    [service],
  );
  const state = useList<ReturnRequest, ReturnStatus>(fetchList, save);
  return { ...state, returns: state.items };
}
