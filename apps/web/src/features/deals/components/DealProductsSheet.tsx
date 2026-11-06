import { Sheet } from '../../../components/ui/Sheet';
import type { Deal } from '../types';
import { DealProductsPanel } from './DealProductsPanel';

interface DealProductsSheetProps {
  deal: Deal;
  onAssign: (dealId: string, productIds: string[]) => Promise<void>;
  onUnassign: (dealId: string, productIds: string[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Yalnızca fırsatın ürünleri penceresi ("Ürünler" işlemi): düzenleme formu açılmaz.
 * İçerik, fırsat penceresinin yan panelindekiyle aynıdır (DealProductsPanel).
 */
export function DealProductsSheet({ deal, onAssign, onUnassign, onClose }: DealProductsSheetProps) {
  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`${deal.name} · Ürünler`}
      description={`${deal.productCount} üründe kullanılıyor`}
    >
      <DealProductsPanel deal={deal} onAssign={onAssign} onUnassign={onUnassign} />
    </Sheet>
  );
}
