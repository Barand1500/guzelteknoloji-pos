import type { ReactNode } from 'react';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  /** Açıklamanın altında ek içerik (ör. etkilenecek kayıtların listesi). */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Silme gibi geri alınamaz işlemlerde kırmızı onay düğmesi. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Onay penceresi (telefonda alttan açılır). Yalnızca Esc, X ya da "Vazgeç" ile kapanır. */
export function ConfirmSheet({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      permission={danger ? 'delete' : undefined}
    >
      {children}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button variant={danger ? 'danger' : 'primary'} flow={false} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="outline" flow={false} onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Sheet>
  );
}
