import { useWorkspacePermission } from '../../workspace/workspace-context';
import { Copy, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { Sheet } from '../../../components/ui/Sheet';

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

/** Ortak menü penceresi: satır menüsü ve toplu işlem menüsü aynı görünümü kullanır. */
function MenuSheet({
  title,
  description,
  groups,
  onClose,
}: {
  title: string;
  description?: string;
  groups: MenuItem[][];
  onClose: () => void;
}) {
  const canSave = useWorkspacePermission('save');
  const canDelete = useWorkspacePermission('delete');
  return (
    <Sheet open onClose={onClose} title={title} {...(description ? { description } : {})} size="md">
      <div className="flex flex-col gap-1">
        {groups.map((items, g) => (
          <div key={g} className={g > 0 ? 'mt-1 border-t border-line pt-1' : ''}>
            {items.map(({ label, icon: Icon, onSelect, danger }) => (
              <button
                key={label}
                disabled={danger ? !canDelete : !canSave}
                type="button"
                onClick={() => {
                  onClose();
                  onSelect();
                }}
                className={[
                  'flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-base font-semibold transition-colors hover:bg-brand-50',
                  danger ? 'text-danger hover:bg-danger-soft' : '',
                ].join(' ')}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

interface ProductMenuSheetProps {
  name: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Tek ürünün işlem menüsü (⋮): Düzenle, Kopya Oluştur, Sil. */
export function ProductMenuSheet({
  name,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: ProductMenuSheetProps) {
  return (
    <MenuSheet
      title={name}
      onClose={onClose}
      groups={[
        [
          { label: 'Düzenle', icon: Pencil, onSelect: onEdit },
          { label: 'Kopya Oluştur', icon: Copy, onSelect: onDuplicate },
        ],
        [{ label: 'Sil', icon: Trash2, onSelect: onDelete, danger: true }],
      ]}
    />
  );
}
