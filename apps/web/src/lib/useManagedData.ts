import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../features/auth/hooks/session-context';
import { dataError } from './catalog-data';

/** Eski istekler yeni ekran verisini ezemez; sunucu hatası yükleniyor durumunda gizlenmez. */
export function useManagedData<T>(load: () => Promise<T>, initial: T) {
  const { session } = useSession();
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const result = await load();
      if (request === revision.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (request === revision.current) setError(dataError(e));
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    if (session.status === 'loading') return;
    // Yükleme çağrısını ve senkron servis hatalarını da asenkron sınırda başlat.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return refresh();
    });
    const currentRevision = revision;
    return () => {
      cancelled = true;
      currentRevision.current++;
    };
  }, [refresh, session.status, session.user?.id]);
  const perform = useCallback(
    async <R>(fn: () => Promise<R>): Promise<R> => {
      try {
        const result = await fn();
        await refresh();
        return result;
      } catch (e) {
        setError(dataError(e));
        throw e;
      }
    },
    [refresh],
  );
  return { data, setData, loading, error, setError, refresh, perform };
}
