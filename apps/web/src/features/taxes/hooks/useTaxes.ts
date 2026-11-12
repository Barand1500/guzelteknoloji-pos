import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useTaxService } from '../services/tax.service';
import type { TaxOffice, TaxType, TaxTypeDraft } from '../types';

const fresh = () => `yeni-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
const byRateDesc = (a: number, b: number) => b - a;

/**
 * Vergi türleri (oranlarıyla) ve vergi daireleri. Örnek veride (sunucu uçları yokken) değişiklikler yalnızca
 * ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function useTaxes() {
  const service = useTaxService();
  const { session } = useSession();
  const [types, setTypes] = useState<TaxType[] | null>(null);
  const [offices, setOffices] = useState<TaxOffice[]>([]);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settled = session.status !== 'loading';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void service
      .load()
      .then((r) => {
        if (cancelled) return;
        setTypes(r.types);
        setOffices(r.offices);
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

  const patchTypes = (fn: (l: TaxType[]) => TaxType[]) => setTypes((l) => (l ? fn(l) : l));

  const saveType = async (draft: TaxTypeDraft, id?: string) => {
    const saved = sample
      ? { id: id ?? fresh(), rates: types?.find((t) => t.id === id)?.rates ?? [], ...draft }
      : await service.saveType(draft, id);
    patchTypes((l) => (id ? l.map((t) => (t.id === id ? { ...t, ...saved, rates: t.rates } : t)) : [...l, saved]));
  };

  const removeType = async (id: string) => {
    if (!sample) await service.removeType(id);
    patchTypes((l) => l.filter((t) => t.id !== id));
  };

  const addRate = async (id: string, rate: number) => {
    const next = sample ? null : await service.addRate(id, rate);
    patchTypes((l) =>
      l.map((t) =>
        t.id === id ? { ...t, rates: (next?.rates ?? [...t.rates, rate]).slice().sort(byRateDesc) } : t,
      ),
    );
  };

  const removeRate = async (id: string, rate: number) => {
    const next = sample ? null : await service.removeRate(id, rate);
    patchTypes((l) =>
      l.map((t) => (t.id === id ? { ...t, rates: next?.rates ?? t.rates.filter((r) => r !== rate) } : t)),
    );
  };

  const saveOffice = async (name: string, id?: string) => {
    const saved: TaxOffice = sample
      ? { id: id ?? fresh(), name, builtin: false }
      : await service.saveOffice(name, id);
    setOffices((l) => (id ? l.map((o) => (o.id === id ? saved : o)) : [saved, ...l]));
  };

  const removeOffice = async (id: string) => {
    if (!sample) await service.removeOffice(id);
    setOffices((l) => l.filter((o) => o.id !== id));
  };

  return { types, offices, sample, error, saveType, removeType, addRate, removeRate, saveOffice, removeOffice };
}

export type TaxStore = ReturnType<typeof useTaxes>;
