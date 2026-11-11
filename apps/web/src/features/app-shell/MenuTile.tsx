import { NavLink } from 'react-router';
import type { SectionPage } from '../../config/sections';

/** Menüdeki bir sayfa karesi: yuvarlak köşeli simge kutusu ve altında ad. */
export function Tile({
  page,
  soon,
  onGo,
  index,
  compact = false,
}: {
  page: SectionPage;
  soon?: boolean;
  onGo: () => void;
  index: number;
  /** Telefonda daha alçak kutu. */
  compact?: boolean;
}) {
  const Icon = page.icon;
  return (
    <li style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }} className="animate-rise-in">
      <NavLink
        to={page.path}
        end
        data-tile=""
        onClick={onGo}
        className={({ isActive }) =>
          [
            'group flex h-full flex-col items-center justify-center rounded-2xl border text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-soft',
            compact ? 'min-h-24 gap-2 p-3' : 'min-h-32 gap-3 p-4',
            isActive ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
          ].join(' ')
        }
      >
        <span
          className={`flex items-center justify-center rounded-xl bg-surface-muted text-ink transition-colors group-hover:bg-brand-50 group-hover:text-brand-ink ${compact ? 'size-10' : 'size-12'}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-sm leading-tight font-bold">{page.label}</span>
        {soon ? <span className="-mt-1 text-xs text-ink-muted">Yakında</span> : null}
      </NavLink>
    </li>
  );
}
