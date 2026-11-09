import { Sheet } from '../../../components/ui/Sheet';
import type { Brand } from '../types';
import { BrandProductsPanel } from './BrandProductsPanel';

interface BrandProductsSheetProps {
  brand: Brand;
  brandNames: Record<string, string>;
  onAssign: (brandId: string, productIds: string[]) => Promise<void>;
  onUnassign: (brandId: string, productIds: string[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Yalnızca markanın ürünleri penceresi (satırdaki "Ürünler" işlemi): düzenleme formu açılmaz.
 * Geniş açılır ve doğrudan "Ürün Ekle" sekmesinde başlar (BrandProductsPanel).
 */
export function BrandProductsSheet({
  brand,
  brandNames,
  onAssign,
  onUnassign,
  onClose,
}: BrandProductsSheetProps) {
  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title={`${brand.name} · Ürünler`}
      description={`${brand.productCount} ürün bu markada`}
    >
      <BrandProductsPanel
        brand={brand}
        brandNames={brandNames}
        onAssign={onAssign}
        onUnassign={onUnassign}
        initialTab="add"
      />
    </Sheet>
  );
}
