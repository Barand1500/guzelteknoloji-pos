import { useCallback, useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useHomeService } from '../services/home.service';
import type { HomeData, HomePeriod } from '../types';

/** Seçilen döneme göre anasayfa verisi; dönem değişince eski veri yeni gelene kadar görünür kalır. */
export function useHome(period: HomePeriod) {
  const service = useHomeService();
  const { session } = useSession();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const settled = session.status !== 'loading';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void service
      .load(period)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [service, period, settled, retry]);

  const refresh = useCallback(() => setRetry((n) => n + 1), []);
  return { data, error, refresh };
}
