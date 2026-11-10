import { useCallback, useEffect, useRef, useState } from 'react';
import { stockErrorMessage } from '../../stock/services/stock.service';
import { useBrandService } from './useBrandService';
import type { Brand, BrandDraft } from '../types';

/** Sunucu onaylamadan başarılı gösterilmez; hata halinde ekrandaki bilgiler korunur. */
export function useBrands() {
  const service = useBrandService();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => setBrands(await service.list()), [service]);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refresh();
    } catch (e) {
      setError(stockErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [refresh]);
  useEffect(() => {
    let active = true;
    void service
      .list()
      .then((list) => {
        if (active) {
          setBrands(list);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(stockErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [service]);
  const run = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (pending.current) throw new Error('İşlem devam ediyor.');
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      return await operation();
    } catch (e) {
      setError(stockErrorMessage(e));
      throw e;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const toggleActive = (id: string, active: boolean) => {
    void run(async () => {
      await service.setActive(id, active);
      setBrands((list) => list.map((b) => (b.id === id ? { ...b, active } : b)));
    }).catch(() => {});
  };
  const reorder = (next: Brand[]) => {
    void run(async () => {
      await service.reorder(next.map((b) => b.id));
      setBrands(next);
    }).catch(() => {});
  };
  const save = (draft: BrandDraft, id?: string): Promise<Brand> =>
    run(async () => {
      const saved = id ? await service.update(id, draft) : await service.create(draft);
      setBrands((list) => (id ? list.map((b) => (b.id === id ? saved : b)) : [...list, saved]));
      return saved;
    });
  const remove = (id: string) =>
    run(async () => {
      await service.remove(id);
      setBrands((list) => list.filter((b) => b.id !== id));
    });
  const merge = (id: string, targetId: string) =>
    run(async () => {
      await service.merge(id, targetId);
      await refresh();
    });
  const assign = (id: string, ids: string[]) =>
    run(async () => {
      await service.assignProducts(id, ids);
      await refresh().catch((e) => setError(stockErrorMessage(e)));
    });
  const unassign = (id: string, ids: string[]) =>
    run(async () => {
      await service.unassignProducts(id, ids);
      await refresh().catch((e) => setError(stockErrorMessage(e)));
    });
  return {
    brands,
    loading,
    error,
    busy,
    reload,
    toggleActive,
    reorder,
    save,
    remove,
    merge,
    assign,
    unassign,
  };
}
