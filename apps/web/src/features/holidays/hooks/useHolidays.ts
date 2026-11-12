import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useHolidayService, type LoadedYear } from '../services/holiday.service';
import type { CustomDraft, CustomHoliday } from '../types';

/**
 * Seçili yılın resmî ve özel tatilleri. Yıllar bir kez yüklenir ve saklanır; özel tatiller ekleme/değiştirme/silme
 * sonrası hemen ekrana yansır. Sunucu uçları yokken (örnek) özel tatiller yalnızca ekranda tutulur.
 */
export function useHolidays(year: number) {
  const service = useHolidayService();
  const { session } = useSession();
  const [years, setYears] = useState<Record<number, LoadedYear>>({});
  const [custom, setCustom] = useState<CustomHoliday[]>([]);
  const [error, setError] = useState<string | null>(null);
  const settled = session.status !== 'loading';
  const current = years[year];

  useEffect(() => {
    if (!settled || years[year]) return;
    let cancelled = false;
    void service
      .load(year)
      .then((r) => {
        if (cancelled) return;
        setYears((y) => ({ ...y, [year]: r }));
        setCustom((all) => {
          const ids = new Set(all.map((c) => c.id));
          return [...all, ...r.custom.filter((c) => !ids.has(c.id))];
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
    // years[year] yalnızca "yüklendi mi" bakışıdır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, settled, year]);

  const sample = current?.sample ?? true;

  const create = async (draft: CustomDraft) => {
    const saved: CustomHoliday = sample
      ? { id: `yeni-${Date.now().toString(36)}`, ...draft }
      : await service.create(draft);
    setCustom((l) => [...l, saved]);
  };
  const update = async (id: string, draft: CustomDraft) => {
    const saved: CustomHoliday = sample ? { id, ...draft } : await service.update(id, draft);
    setCustom((l) => l.map((c) => (c.id === id ? saved : c)));
  };
  const remove = async (id: string) => {
    if (!sample) await service.remove(id);
    setCustom((l) => l.filter((c) => c.id !== id));
  };

  return {
    loading: !current && !error,
    error,
    official: current?.official ?? [],
    custom,
    sample,
    offline: current?.offline ?? false,
    create,
    update,
    remove,
  };
}
