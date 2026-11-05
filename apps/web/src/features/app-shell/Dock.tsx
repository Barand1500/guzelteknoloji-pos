import { Plus } from 'lucide-react';
import { NavLink } from 'react-router';
import { STOCK_CREATE_PATH, navLeft, navRight, type NavItem } from '../../config/navigation';

function DockLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        [
          'relative flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1',
          'text-[0.6875rem] font-semibold transition-colors duration-200 md:flex-none md:px-4 md:text-xs',
          isActive ? 'text-brand-ink' : 'text-ink-muted hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-6" aria-hidden="true" />
          <span>{item.label}</span>
          {/* Aktif sayfanın altında küçük vurgu noktası */}
          <span
            aria-hidden="true"
            className={[
              'absolute bottom-0.5 size-1 rounded-full bg-brand-600 transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />
        </>
      )}
    </NavLink>
  );
}

/**
 * Alt çubuk: telefonda ekranın altına YAPIŞIK (üst köşeleri yuvarlak, "+" düğmesi hafif taşar); masaüstünde yüzen, yarı saydam hap.
 * Ortadaki büyük "+" yeni stok kartı açar. Klasik sol menü bilerek KULLANILMAZ.
 */
export function Dock() {
  return (
    <nav
      aria-label="Ana gezinme"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center md:px-3 md:pb-3"
    >
      <div className="pointer-events-auto flex w-full items-center gap-1 rounded-t-[1.75rem] border-t border-line bg-surface-raised/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur-xl md:w-auto md:gap-2 md:rounded-[2rem] md:border md:p-1.5 md:px-3">
        {navLeft.map((item) => (
          <DockLink key={item.id} item={item} />
        ))}

        <NavLink
          to={STOCK_CREATE_PATH}
          aria-label="Yeni Stok Kartı"
          className="-mt-7 mx-1 flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-soft transition-transform duration-200 ring-4 ring-surface-raised hover:scale-105 active:scale-95 md:mt-0 md:ring-0"
        >
          <Plus className="size-7" aria-hidden="true" />
        </NavLink>

        {navRight.map((item) => (
          <DockLink key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
}
