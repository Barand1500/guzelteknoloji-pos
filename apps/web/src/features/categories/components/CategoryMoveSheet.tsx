import { Sheet } from '../../../components/ui/Sheet';
import type { Category } from '../types';
import { CategoryMovePanel } from './CategoryMovePanel';

interface CategoryMoveSheetProps {
  category: Category;
  categories: Category[];
  onMove: (parentId: string | null) => Promise<void>;
  onClose: () => void;
}

/** Satırdaki/menüdeki "Taşı" işlemi: yalnızca taşıma penceresi (telefonda alttan açılır). */
export function CategoryMoveSheet({
  category,
  categories,
  onMove,
  onClose,
}: CategoryMoveSheetProps) {
  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`${category.name} · Taşı`}
      description="Nereye taşınsın?"
    >
      <CategoryMovePanel category={category} categories={categories} onMove={onMove} />
    </Sheet>
  );
}
