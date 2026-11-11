import { Outlet, useOutletContext } from 'react-router';
import { useCustomers } from '../hooks/useCustomers';

type Store = ReturnType<typeof useCustomers>;

/**
 * Müşteri sayfalarının ortak sahibi: liste ve müşteri sayfası aynı yüklenmiş listeyi kullanır
 * (örnek veride eklenen/silinen müşteri sayfalar arası kaybolmaz).
 */
export function CustomerLayout() {
  const store = useCustomers();
  return <Outlet context={store} />;
}

export const useCustomerStore = () => useOutletContext<Store>();
