import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useShippingService } from '../services/shipping.service';
import type {
  Carrier,
  CarrierDraft,
  DefDraft,
  DefItem,
  ListKey,
  LocationNode,
  PriceTable,
  ShippingData,
} from '../types';
import { emptyPrices } from '../types';

const fresh = () => `yeni-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Kargo ve Nakliye verisi (firmalar, lokasyonlar, 7 tanım listesi). Örnek veride (sunucu uçları yokken)
 * değişiklikler yalnızca ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function useShipping() {
  const service = useShippingService();
  const { session } = useSession();
  const [data, setData] = useState<ShippingData | null>(null);
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
        setData(r.data);
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

  const patch = (fn: (d: ShippingData) => ShippingData) => setData((d) => (d ? fn(d) : d));

  const saveCarrier = async (draft: CarrierDraft, id?: string) => {
    const old = data?.carriers.find((c) => c.id === id);
    const saved: Carrier = sample
      ? { id: id ?? fresh(), ...draft, prices: old?.prices ?? emptyPrices() }
      : { ...(await service.saveCarrier(draft, id)), prices: old?.prices ?? emptyPrices() };
    patch((d) => ({
      ...d,
      carriers: id
        ? d.carriers.map((c) => (c.id === id ? { ...c, ...draft } : c))
        : [...d.carriers, saved],
    }));
  };

  const removeCarrier = async (id: string) => {
    if (!sample) await service.removeCarrier(id);
    patch((d) => ({ ...d, carriers: d.carriers.filter((c) => c.id !== id) }));
  };

  const savePrices = async (id: string, prices: PriceTable) => {
    if (!sample) await service.savePrices(id, prices);
    patch((d) => ({ ...d, carriers: d.carriers.map((c) => (c.id === id ? { ...c, prices } : c)) }));
  };

  const addLocation = async (parentId: string | null, name: string) => {
    const parent = data?.locations.find((l) => l.id === parentId);
    const node: LocationNode = sample
      ? { id: fresh(), parentId, name, level: parent ? parent.level + 1 : 0 }
      : await service.createLocation(parentId, name);
    patch((d) => ({ ...d, locations: [...d.locations, node] }));
  };

  const renameLocation = async (id: string, name: string) => {
    if (!sample) await service.renameLocation(id, name);
    patch((d) => ({ ...d, locations: d.locations.map((l) => (l.id === id ? { ...l, name } : l)) }));
  };

  const removeLocation = async (id: string) => {
    if (!sample) await service.removeLocation(id);
    patch((d) => {
      const gone = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const l of d.locations)
          if (l.parentId && gone.has(l.parentId) && !gone.has(l.id)) {
            gone.add(l.id);
            grew = true;
          }
      }
      return { ...d, locations: d.locations.filter((l) => !gone.has(l.id)) };
    });
  };

  const saveItem = async (list: ListKey, draft: DefDraft, id?: string) => {
    const saved: DefItem = sample ? { id: id ?? fresh(), ...draft } : await service.saveItem(list, draft, id);
    patch((d) => ({
      ...d,
      lists: {
        ...d.lists,
        [list]: id ? d.lists[list].map((i) => (i.id === id ? saved : i)) : [...d.lists[list], saved],
      },
    }));
  };

  const removeItem = async (list: ListKey, id: string) => {
    if (!sample) await service.removeItem(list, id);
    patch((d) => ({ ...d, lists: { ...d.lists, [list]: d.lists[list].filter((i) => i.id !== id) } }));
  };

  return {
    data,
    sample,
    error,
    saveCarrier,
    removeCarrier,
    savePrices,
    addLocation,
    renameLocation,
    removeLocation,
    saveItem,
    removeItem,
  };
}

export type ShippingStore = ReturnType<typeof useShipping>;
