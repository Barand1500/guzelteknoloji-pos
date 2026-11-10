import { OrdersView } from '../../features/orders/components/OrdersView';
import { ReturnsView } from '../../features/orders/components/ReturnsView';

/** Siparişler → Gelen Siparişler. */
export function OrdersPage() {
  return <OrdersView />;
}

/** Siparişler → İade/Değişim Talepleri. */
export function ReturnsPage() {
  return <ReturnsView />;
}
