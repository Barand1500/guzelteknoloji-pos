import { useCallback, useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useCustomerService } from '../services/customer.service';
import type { Customer, CustomerDetail, CustomerDraft } from '../types';

/**
 * Müşteri listesi + kaydet/sil/giriş aç-kapat. Örnek veride (sunucu uçları yokken) değişiklikler
 * yalnızca ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function useCustomers() {
  const service = useCustomerService();
  const { session } = useSession();
  const [items, setItems] = useState<Customer[]>([]);
  const [sample, setSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
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
  }, [service, settled, retry]);

  const refresh = useCallback(() => setRetry((n) => n + 1), []);

  const save = async (draft: CustomerDraft, id?: string): Promise<Customer> => {
    if (sample) {
      const next: Customer = id
        ? { ...items.find((c) => c.id === id)!, ...draft }
        : {
            id: `yeni-${Date.now().toString(36)}`,
            ...draft,
            active: true,
            userCount: 1,
            lastLogin: null,
            debt: 0,
            credit: 0,
          };
      setItems((list) => (id ? list.map((c) => (c.id === id ? next : c)) : [next, ...list]));
      return next;
    }
    const saved = id ? await service.update(id, draft) : await service.create(draft);
    setItems((list) => (id ? list.map((c) => (c.id === id ? saved : c)) : [saved, ...list]));
    return saved;
  };

  const remove = async (id: string) => {
    if (!sample) await service.remove(id);
    setItems((list) => list.filter((c) => c.id !== id));
  };

  const setLogin = async (id: string, active: boolean) => {
    if (!sample) await service.setLogin(id, active);
    setItems((list) => list.map((c) => (c.id === id ? { ...c, active } : c)));
  };

  return { customers: items, sample, loading, error, refresh, save, remove, setLogin };
}

/** Bir müşterinin sekme verisi (sayfa açılınca bir kez yüklenir). */
export function useCustomerDetail(customer: Customer | null) {
  const service = useCustomerService();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = customer?.id ?? null;

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    void service
      .detail(customer)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
    // yalnızca müşteri değişince yeniden yükle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, id]);

  return { detail, setDetail, error };
}
