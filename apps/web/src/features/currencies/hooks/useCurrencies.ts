import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useCurrencyService } from '../services/currency.service';
import { mockRate, type Currency, type CurrencyDraft } from '../types';

/**
 * Para birimleri listesi + kaydet/sil/aktiflik/kur güncelle. Örnek veride (sunucu uçları yokken) değişiklikler
 * yalnızca ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function useCurrencies() {
  const service = useCurrencyService();
  const { session } = useSession();
  const [items, setItems] = useState<Currency[] | null>(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settled = session.status !== 'loading';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void service
      .list()
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setSample(r.sample);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [service, settled]);

  const patch = (fn: (l: Currency[]) => Currency[]) => setItems((l) => (l ? fn(l) : l));

  const save = async (draft: CurrencyDraft, id?: string) => {
    const old = items?.find((c) => c.id === id);
    const saved: Currency = sample
      ? {
          id: id ?? `yeni-${Date.now().toString(36)}`,
          base: old?.base ?? false,
          active: old?.active ?? true,
          ...draft,
        }
      : await service.save(draft, id);
    patch((l) => (id ? l.map((c) => (c.id === id ? saved : c)) : [...l, saved]));
  };

  const remove = async (id: string) => {
    if (!sample) await service.remove(id);
    patch((l) => l.filter((c) => c.id !== id));
  };

  const setActive = async (id: string, active: boolean) => {
    if (!sample) await service.setActive(id, active);
    patch((l) => l.map((c) => (c.id === id ? { ...c, active } : c)));
  };

  const refresh = async (id: string) => {
    const cur = items?.find((c) => c.id === id);
    if (!cur) return;
    const next = sample
      ? { ...cur, rate: mockRate(cur.shortName, cur.rateType) ?? cur.rate }
      : await service.refresh(id);
    patch((l) => l.map((c) => (c.id === id ? next : c)));
  };

  return { items, sample, error, save, remove, setActive, refresh, preview: service.preview };
}

export type CurrencyStore = ReturnType<typeof useCurrencies>;
