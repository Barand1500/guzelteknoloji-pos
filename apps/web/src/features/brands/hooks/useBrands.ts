import { useCallback, useEffect, useState } from 'react';
import { brandService } from '../services/brand.service';
import type { Brand, BrandDraft } from '../types';

/**
 * Marka listesinin durumu. İşlemler "iyimser" çalışır: ekran anında güncellenir, servis
 * arkadan kaydeder. Gerçek API gelince yalnızca brand.service.ts değişir.
 */
export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void brandService.list().then((list) => {
      if (!active) return;
      setBrands(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => setBrands(await brandService.list()), []);

  const toggleActive = (id: string, active: boolean) => {
    setBrands((list) => list.map((b) => (b.id === id ? { ...b, active } : b)));
    void brandService.setActive(id, active);
  };

  const reorder = (next: Brand[]) => {
    setBrands(next);
    void brandService.reorder(next.map((b) => b.id));
  };

  /** Kimlik verilirse günceller, verilmezse yeni marka ekler (listenin sonuna). */
  const save = async (draft: BrandDraft, id?: string): Promise<Brand> => {
    if (id) {
      const updated = await brandService.update(id, draft);
      setBrands((list) => list.map((b) => (b.id === id ? updated : b)));
      return updated;
    }
    const created = await brandService.create(draft);
    setBrands((list) => [...list, created]);
    return created;
  };

  const remove = async (id: string) => {
    await brandService.remove(id);
    setBrands((list) => list.filter((b) => b.id !== id));
  };

  /** Ürünleri markaya atar; ürün sayıları değiştiği için liste yenilenir. */
  const assign = async (brandId: string, productIds: string[]) => {
    await brandService.assignProducts(brandId, productIds);
    await refresh();
  };

  return { brands, loading, toggleActive, reorder, save, remove, assign };
}
