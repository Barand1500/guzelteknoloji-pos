import { Boxes, FolderPlus, Pencil, Power, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sheet } from '../../../components/ui/Sheet';
import type { Category } from '../types';
import { categorySubtitle } from './CategoryTile';

interface CategoryActionsSheetProps {
  category: Category;
  onClose: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onAssign: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}

/** Kutucuğun ⋮ düğmesinden açılan işlem listesi (telefonda alttan açılır). */
export function CategoryActionsSheet({
  category,
  onClose,
  onEdit,
  onAddChild,
  onAssign,
  onToggle,
  onDelete,
}: CategoryActionsSheetProps) {
  const item = (icon: ReactNode, label: string, run: () => void, danger = false) => (
    <button
      type="button"
      onClick={() => {
        onClose();
        run();
      }}
      className={[
        'flex min-h-14 items-center gap-4 rounded-2xl px-4 text-left text-base font-semibold transition-colors',
        danger ? 'text-danger hover:bg-danger-soft' : 'hover:bg-brand-50',
      ].join(' ')}
    >
      <span className={danger ? '' : 'text-brand-ink'}>{icon}</span>
      {label}
    </button>
  );
  return (
    <Sheet open onClose={onClose} title={category.name} description={categorySubtitle(category)}>
      <div className="-mx-2 flex flex-col gap-1">
        {item(<Pencil className="size-5" aria-hidden="true" />, 'Düzenle', onEdit)}
        {item(
          <FolderPlus className="size-5" aria-hidden="true" />,
          'Alt Kategori Ekle',
          onAddChild,
        )}
        {item(<Boxes className="size-5" aria-hidden="true" />, 'Ürünlere Tanımla', onAssign)}
        {item(
          <Power className="size-5" aria-hidden="true" />,
          category.active ? 'Pasife Al' : 'Aktif Yap',
          () => onToggle(!category.active),
        )}
        {item(<Trash2 className="size-5" aria-hidden="true" />, 'Sil', onDelete, true)}
      </div>
    </Sheet>
  );
}
