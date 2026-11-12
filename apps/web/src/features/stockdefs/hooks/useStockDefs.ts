import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useStockDefService } from '../services/stockdef.service';
import type {
  DefList,
  NameDraft,
  NameItem,
  PriceList,
  PriceListDraft,
  StockDefsData,
} from '../types';

const fresh = () => `yeni-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
const KEY = { 'cari-tipleri': 'cari', 'stok-tipleri': 'stok', 'olcu-birimleri': 'units' } as const;

/**
 * Cari tipleri, stok tipleri, ölçü birimleri ve fiyat listeleri. Örnek veride (sunucu uçları yokken)
 * değişiklikler yalnızca ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function useStockDefs() {
  const service = useStockDefService();
  const { session } = useSession();
  const [data, setData] = useState<StockDefsData | null>(null);
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

  const patch = (fn: (d: StockDefsData) => StockDefsData) => setData((d) => (d ? fn(d) : d));

  const saveName = async (list: DefList, draft: NameDraft, id?: string) => {
    const saved: NameItem = sample ? { id: id ?? fresh(), ...draft } : await service.saveName(list, draft, id);
    const k = KEY[list];
    patch((d) => ({ ...d, [k]: id ? d[k].map((i) => (i.id === id ? saved : i)) : [...d[k], saved] }));
  };

  const removeName = async (list: DefList, id: string) => {
    if (!sample) await service.removeName(list, id);
    const k = KEY[list];
    patch((d) => ({ ...d, [k]: d[k].filter((i) => i.id !== id) }));
  };

  const savePriceList = async (draft: PriceListDraft, id?: string) => {
    const old = data?.priceLists.find((p) => p.id === id);
    const saved: PriceList = sample
      ? { id: id ?? fresh(), isDefault: old?.isDefault ?? false, ...draft }
      : await service.savePriceList(draft, id);
    patch((d) => ({
      ...d,
      priceLists: id ? d.priceLists.map((p) => (p.id === id ? saved : p)) : [...d.priceLists, saved],
    }));
  };

  const removePriceList = async (id: string) => {
    if (!sample) await service.removePriceList(id);
    patch((d) => ({ ...d, priceLists: d.priceLists.filter((p) => p.id !== id) }));
  };

  const setDefaultPriceList = async (id: string) => {
    if (!sample) await service.setDefaultPriceList(id);
    patch((d) => ({ ...d, priceLists: d.priceLists.map((p) => ({ ...p, isDefault: p.id === id })) }));
  };

  return { data, sample, error, saveName, removeName, savePriceList, removePriceList, setDefaultPriceList };
}

export type StockDefsStore = ReturnType<typeof useStockDefs>;
