import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { SortableRowContext } from '../../../components/ui/SortableList';
import { SettingsTabs } from '../../workspace/SettingsTabs';
import type { EcommercePage } from '../../../config/ecommerce-settings';

/** "Backend bağlantısı bekleniyor" uyarısının kimliği; pasif düğmeler buna bağlanır. */
export const BACKEND_NOTICE_ID = 'ecommerce-backend-bekleniyor';

export const panelClass = 'rounded-3xl border border-line bg-surface-raised p-4 sm:p-6';

/** E-ticaret ayarlarının ortak kabuğu: sekme şeridi ve açıklama. */
export function EcommerceShell({
  page,
  description,
  children,
}: {
  page?: EcommercePage;
  description?: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <SettingsTabs pathname={pathname} />
      <p className="text-sm text-ink-muted">
        {description ?? page?.description ?? 'E-ticaret sitesinin içerik ve görünüm ayarları.'}
      </p>
      {children}
    </div>
  );
}

export function ScreenCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={`${panelClass} overflow-hidden p-0!`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-surface-muted/45 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

/** İki sütunlu alan ızgarası; geniş alanlar `wide` ile alt satıra yayılır. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

/** Kalıcı işlemler (silme) backend olmadığı için pasif; nedeni ekran okuyucuya da bağlanır. */
export function DisabledAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      aria-label={label}
      aria-describedby={BACKEND_NOTICE_ID}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Satır silme: onay penceresini açar; demo oturumunda `DisabledAction` kullanılır. */
export function DeleteAction({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Liste yüklenirken gösterilen iskelet satırlar. */
export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-[4.25rem] animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}

/** Satır düzenleme: metin yerine kalem ikonu (referanstaki satır işlemleri gibi). */
export function EditAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
    >
      <Pencil className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Sıralanabilir satır: sürükleme tutamağı + başlık/alt bilgi + rozetler + işlemler. */
export function SortableRow({
  context,
  title,
  meta,
  badges,
  actions,
}: {
  context: SortableRowContext;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-raised px-2 py-2 sm:gap-3 sm:px-3">
      <button
        {...context.handleProps}
        type="button"
        className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted focus-visible:bg-surface-muted"
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-bold">{title}</p>
        {meta && <p className="truncate text-xs text-ink-muted">{meta}</p>}
      </div>
      {badges}
      {actions}
    </div>
  );
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'brand' | 'muted';
}) {
  return (
    <span
      className={
        tone === 'brand'
          ? 'inline-flex shrink-0 items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-ink'
          : 'inline-flex shrink-0 items-center rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted'
      }
    >
      {children}
    </span>
  );
}

/**
 * Sayfalanmış listede sürükle-bırak sonucunu tüm listeye yansıtır; sürükleme geçerli sayfa
 * içinde kalır (proje kuralı 8.15).
 */
export function reorderPage<T>(all: readonly T[], visible: readonly T[], next: readonly T[]): T[] {
  const first = visible[0];
  if (!first) return [...all];
  const start = all.indexOf(first);
  const copy = [...all];
  copy.splice(start, visible.length, ...next);
  return copy;
}
