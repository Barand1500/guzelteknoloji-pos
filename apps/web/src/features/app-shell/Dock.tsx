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
 * Ekranın altında yüzen, yarı saydam yuvarlak çubuk (telefonda ve masaüstünde aynı).
 * Ortadaki büyük "+" yeni stok kartı açar. Klasik sol menü bilerek KULLANILMAZ.
 */
export function Dock() {
  return (
    <nav
      aria-label="Ana gezinme"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-[2rem] border border-line bg-surface-raised/85 p-1.5 shadow-card backdrop-blur-xl md:w-auto md:max-w-none md:gap-2 md:px-3">
        {navLeft.map((item) => (
          <DockLink key={item.id} item={item} />
        ))}

        <NavLink
          to={STOCK_CREATE_PATH}
          aria-label="Yeni Stok Kartı"
          className="mx-1 flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-soft transition-transform duration-200 hover:scale-105 active:scale-95"
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
