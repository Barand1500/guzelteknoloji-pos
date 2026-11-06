import { Sheet } from '../../../components/ui/Sheet';
import type { Category } from '../types';
import { CategoryProductsPanel } from './CategoryProductsPanel';

interface CategoryProductsSheetProps {
  category: Category;
  categoryNames: Record<string, string>;
  onAssign: (categoryId: string, productIds: string[]) => Promise<void>;
  onUnassign: (categoryId: string, productIds: string[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Yalnızca kategorinin ürünleri penceresi ("Ürünlere Tanımla"): düzenleme formu açılmaz.
 * İçerik, kategori penceresinin yan panelindekiyle aynıdır (CategoryProductsPanel).
 */
export function CategoryProductsSheet({
  category,
  categoryNames,
  onAssign,
  onUnassign,
  onClose,
}: CategoryProductsSheetProps) {
  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`${category.name} · Ürünler`}
      description={`${category.productCount} ürün bu kategoride`}
    >
      <CategoryProductsPanel
        category={category}
        categoryNames={categoryNames}
        onAssign={onAssign}
        onUnassign={onUnassign}
      />
    </Sheet>
  );
}
