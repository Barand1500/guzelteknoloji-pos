import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { usePaymentService } from '../services/payment.service';
import type { PaymentDraft, PaymentMethod } from '../types';

/**
 * Ödeme şekilleri (sıralı liste). Örnek veride (sunucu uçları yokken) değişiklikler yalnızca ekranda yapılır;
 * gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function usePayments() {
  const service = usePaymentService();
  const { session } = useSession();
  const [items, setItems] = useState<PaymentMethod[] | null>(null);
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

  const patch = (fn: (l: PaymentMethod[]) => PaymentMethod[]) => setItems((l) => (l ? fn(l) : l));

  const save = async (draft: PaymentDraft, id?: string) => {
    const old = items?.find((p) => p.id === id);
    const saved: PaymentMethod = sample
      ? { id: id ?? `yeni-${Date.now().toString(36)}`, active: old?.active ?? true, ...draft }
      : await service.save(draft, id);
    patch((l) => (id ? l.map((p) => (p.id === id ? saved : p)) : [...l, saved]));
  };

  const remove = async (id: string) => {
    if (!sample) await service.remove(id);
    patch((l) => l.filter((p) => p.id !== id));
  };

  const setActive = async (id: string, active: boolean) => {
    if (!sample) await service.setActive(id, active);
    patch((l) => l.map((p) => (p.id === id ? { ...p, active } : p)));
  };

  /** Sürükleme bitince yeni sıra hemen ekrana yansır, sunucuya yazılır; hata olursa eski sıraya dönülür. */
  const reorder = async (next: PaymentMethod[]) => {
    const before = items;
    setItems(next);
    if (sample) return;
    try {
      await service.reorder(next.map((p) => p.id));
    } catch (e) {
      setItems(before);
      throw e instanceof Error ? e : new Error(dataError(e));
    }
  };

  return { items, sample, error, save, remove, setActive, reorder };
}

export type PaymentStore = ReturnType<typeof usePayments>;
