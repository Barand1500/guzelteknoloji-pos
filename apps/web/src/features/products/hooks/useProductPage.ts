import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../auth/hooks/session-context';
import { dataError } from '../../../lib/catalog-data';
import { useProductService } from '../services/product.service';
import type { BulkRequest, BulkResult, ProductPage, ProductPageQuery } from '../types';

const emptyPage = (): ProductPage => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  priceLists: [],
  filterOptions: { categories: [], brands: [] },
});

/** Only the requested page is fetched; late responses cannot replace newer search results. */
export function useProductPage(query: ProductPageQuery) {
  const service = useProductService();
  const { session } = useSession();
  const [search, setSearch] = useState(query.search);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.search), 300);
    return () => window.clearTimeout(timer);
  }, [query.search]);
  const key = JSON.stringify({ ...query, search });
  const userKey = session.user?.id ?? session.status;
  const [result, setResult] = useState({ key: '', userKey: '', data: emptyPage() });
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    setPending(true);
    setError(null);
    try {
      const data = await service.listPage(JSON.parse(key) as ProductPageQuery);
      if (request === revision.current) {
        setResult({ key, userKey, data });
        setError(null);
      }
    } catch (e) {
      if (request === revision.current) {
        setError(dataError(e));
        setResult((previous) => ({
          key,
          userKey,
          data: {
            ...emptyPage(),
            ...(previous.userKey === userKey
              ? { priceLists: previous.data.priceLists, filterOptions: previous.data.filterOptions }
              : {}),
          },
        }));
      }
    } finally {
      if (request === revision.current) setPending(false);
    }
  }, [key, service, userKey]);
  useEffect(() => {
    if (session.status === 'loading' || query.search !== search) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return refresh();
    });
    const currentRevision = revision;
    return () => {
      cancelled = true;
      currentRevision.current++;
    };
  }, [refresh, session.status, query.search, search]);
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  }, [refresh]);
  const perform = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await latestRefresh.current();
      return true;
    } catch (e) {
      setError(dataError(e));
      return false;
    }
  };
  const loading =
    pending || result.key !== key || result.userKey !== userKey || query.search !== search;
  return {
    ...result.data,
    products: result.data.items,
    loading,
    error,
    refresh,
    setStockTracking: (ids: string[], on: boolean) =>
      perform(() => service.setStockTracking(ids, on)),
    setSales: (ids: string[], on: boolean) => perform(() => service.setSales(ids, on)),
    remove: (ids: string[]) => perform(() => service.remove(ids)),
    /** Parametreli toplu işlem: sonucu ya da hata iletisini döndürür (pencere kendi içinde gösterir). */
    bulk: async (
      ids: string[],
      request: BulkRequest,
    ): Promise<{ ok: true; result: BulkResult } | { ok: false; message: string }> => {
      try {
        const result = await service.bulk(ids, request);
        await latestRefresh.current();
        return { ok: true, result };
      } catch (e) {
        return { ok: false, message: dataError(e) };
      }
    },
    selectIds: () => service.selectIds(query),
  };
}
