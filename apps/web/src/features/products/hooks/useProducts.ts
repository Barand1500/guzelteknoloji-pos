import { useCallback, useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import type { ProductItem } from '../types';

/**
 * Ürün listesinin durumu. Stok/Satış anahtarları "iyimser" çalışır: ekran anında güncellenir,
 * servis arkadan kaydeder. Gerçek API gelince yalnızca product.service.ts değişir.
 */
export function useProducts() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void productService.list().then((list) => {
      if (!active) return;
      setProducts(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => setProducts(await productService.list()), []);

  const patch = (ids: string[], change: Partial<ProductItem>) =>
    setProducts((list) => list.map((p) => (ids.includes(p.id) ? { ...p, ...change } : p)));

  const setStockTracking = (ids: string[], on: boolean) => {
    patch(ids, { stockTracking: on });
    void productService.setStockTracking(ids, on);
  };

  const setSales = (ids: string[], on: boolean) => {
    patch(ids, { salesOpen: on });
    void productService.setSales(ids, on);
  };

  const remove = async (ids: string[]) => {
    await productService.remove(ids);
    await refresh();
  };

  const duplicate = async (id: string) => {
    const copy = await productService.duplicate(id);
    await refresh();
    return copy;
  };

  return { products, loading, refresh, setStockTracking, setSales, remove, duplicate };
}
