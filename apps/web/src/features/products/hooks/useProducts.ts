import { useCallback } from 'react';
import { useProductService } from '../services/product.service';
import { useManagedData } from '../../../lib/useManagedData';
import type { ProductItem } from '../types';
export function useProducts() {
  const service = useProductService();
  const load = useCallback(() => service.list(), [service]);
  const state = useManagedData<ProductItem[]>(load, []);
  const setStockTracking = async (ids: string[], on: boolean) => {
    try {
      await state.perform(() => service.setStockTracking(ids, on));
      return true;
    } catch {
      return false;
    }
  };
  const setSales = async (ids: string[], on: boolean) => {
    try {
      await state.perform(() => service.setSales(ids, on));
      return true;
    } catch {
      return false;
    }
  };
  const remove = (ids: string[]) => state.perform(() => service.remove(ids));
  return {
    products: state.data,
    loading: state.loading,
    error: state.error,
    refresh: state.refresh,
    setStockTracking,
    setSales,
    remove,
  };
}
