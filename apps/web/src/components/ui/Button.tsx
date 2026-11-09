import { ArrowRight } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';
import { useWorkspacePermission } from '../../features/workspace/workspace-context';
import type { PermissionAction } from '@gt/shared';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

interface VariantStyle {
  /** Durağan görünüm. */
  base: string;
  /** Akış (flow) animasyonu kapalıyken kullanılan sade hover rengi. */
  plainHover: string;
}

const variants: Record<Variant, VariantStyle> = {
  primary: {
    base: 'bg-brand-700 text-white shadow-soft',
    plainHover: 'hover:bg-brand-800 active:bg-brand-900',
  },
  outline: {
    base: 'bg-surface-raised text-ink border border-line-strong/70 shadow-soft',
    plainHover: 'hover:bg-surface-muted hover:border-line-strong active:bg-line/60',
  },
  danger: {
    base: 'bg-danger text-surface shadow-soft',
    plainHover: 'hover:opacity-90 active:opacity-80',
  },
  ghost: {
    base: 'text-ink',
    plainHover: 'hover:bg-surface-muted active:bg-line/60',
  },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: PermissionAction;
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  fullWidth?: boolean;
  /**
   * Hover'da dairesel dolgu + kayan ok animasyonu (yalnızca fare olan cihazlarda; Tailwind `hover:`
   * varyantı dokunmatik cihazlarda devreye girmez, yani mobilde animasyon çalışmaz ve kasmaz).
   * Varsayılan: primary ve outline için açık.
   */
  flow?: boolean;
}

/**
 * Tüm durumlar (hover/focus/pressed/disabled/loading) burada tanımlanır. Yükleme sırasında
 * buton devre dışıdır ve aria-busy ile ekran okuyuculara bildirilir.
 */
export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel,
  leadingIcon,
  fullWidth = true,
  flow,
  disabled,
  className = '',
  children,
  type = 'button',
  permission,
  ...rest
}: ButtonProps) {
  const style = variants[variant];
  const allowed = useWorkspacePermission(permission ?? 'read');
  const inactive = Boolean(disabled) || loading || (permission !== undefined && !allowed);
  // Devre dışı/yükleniyor iken animasyon çalışmaz.
  const flowOn = (flow ?? variant !== 'ghost') && !inactive;

  return (
    <button
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={[
        'group/btn relative inline-flex min-h-14 items-center justify-center overflow-hidden rounded-control px-5 py-3',
        'text-base font-semibold tracking-[-0.005em] select-none',
        'transition-[background-color,border-color,box-shadow,transform,border-radius] duration-200 ease-out',
        'active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        fullWidth ? 'w-full' : '',
        style.base,
        inactive ? '' : style.plainHover,
        className,
      ].join(' ')}
      {...rest}
    >
      <span
        className={[
          'relative z-10 flex min-w-0 items-center justify-center gap-3',
          flowOn ? 'transition-transform duration-500 ease-out group-hover/btn:-translate-x-2' : '',
        ].join(' ')}
      >
        {loading ? <Spinner /> : leadingIcon}
        <span className="min-w-0 text-balance">
          {loading && loadingLabel ? loadingLabel : children}
        </span>
      </span>

      {flowOn ? (
        <ArrowRight
          aria-hidden="true"
          className={[
            'pointer-events-none absolute top-1/2 right-5 z-10 size-5 -translate-y-1/2 translate-x-6 opacity-0',
            'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'group-hover/btn:translate-x-0 group-hover/btn:opacity-100',
          ].join(' ')}
        />
      ) : null}
    </button>
  );
}
