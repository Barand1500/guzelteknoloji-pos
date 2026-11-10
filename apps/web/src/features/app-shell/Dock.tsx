import { Plus, Save } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Spinner } from '../../components/ui/Spinner';
import { STOCK_CREATE_PATH, type NavItem } from '../../config/navigation';
import { sectionFor } from '../../config/sections';
import { HomeDock } from '../home/components/HomeDock';
import { useWorkspace, pageResource } from '../workspace/workspace-context';
import { useActiveAddAction, useActiveSaveAction } from './save-action';

/**
 * Bir sayfanın yolu aynı çubuktaki başka bir sayfanın yolunun başıysa (ör. /siparisler ve
 * /siparisler/iade) tam eşleşme aranır; yoksa iki düğme birden seçili görünür.
 */
function DockLink({ item, siblings }: { item: NavItem; siblings: readonly NavItem[] }) {
  const exact = siblings.some((o) => o.id !== item.id && o.path.startsWith(item.path + '/'));
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={exact}
      data-dock-link=""
      className={({ isActive }) =>
        [
          'relative flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1',
          'text-[0.6875rem] font-semibold transition-colors duration-300 md:flex-none md:px-4 md:text-xs',
          isActive ? 'text-brand-ink' : 'text-ink-muted hover:text-ink',
        ].join(' ')
      }
    >
      <Icon className="size-6" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

/**
 * Alt çubuk: telefonda ekranın altına YAPIŞIK (üst köşeleri yuvarlak, "+" düğmesi hafif taşar);
 * masaüstünde yüzen, yarı saydam hap. Ortadaki büyük "+" yeni stok kartı açar. Klasik sol menü
 * bilerek KULLANILMAZ.
 *
 * Seçili sayfanın arkasındaki yumuşak vurgu kutusu, başka sekmeye geçince yeni yerine KAYARAK
 * gider (konum doğrudan DOM'a yazılır; böylece React yeniden çizimi gerekmez, animasyon akıcıdır).
 * "+" (yeni stok kartı) seçiliyken kutu gizlenir.
 *
 * Ortadaki düğme sayfaya göre değişir (bkz. save-action.ts): stok kartında yalnızca disket simgeli
 * "Kaydet"; Fırsatlar/Kategoriler/Markalar/Özellikler sayfalarında o sayfanın "Ekle" penceresini
 * (Özelliklerde derinliğe göre Şablon/Grup/Özellik) açan "+"; diğer sayfalarda yeni stok kartı "+".
 * Sayfa değişince düğme yeniden çizilir ve her sayfada aynı dönme animasyonuyla belirir.
 */
export function Dock() {
  const { can } = useWorkspace();
  const { pathname } = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const placedOnce = useRef(false);
  const section = sectionFor(pathname);
  const navLeft = section.dock.left;
  const navRight = section.dock.right;
  const save = useActiveSaveAction();
  const add = useActiveAddAction();

  useLayoutEffect(() => {
    const box = container.current;
    const pill = indicator.current;
    if (!box || !pill) return;

    const place = () => {
      const active = box.querySelector<HTMLElement>('a[data-dock-link][aria-current="page"]');
      if (!active) {
        pill.style.opacity = '0';
        return;
      }
      // İlk yerleşimde kayma animasyonu olmasın (kutu doğrudan yerine otursun).
      if (!placedOnce.current) {
        pill.style.transition = 'none';
        placedOnce.current = true;
        requestAnimationFrame(() => (pill.style.transition = ''));
      }
      pill.style.opacity = '1';
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.height = `${active.offsetHeight}px`;
      pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };

    place();
    // Pencere boyutu değişince (ör. telefon ↔ masaüstü) konum yeniden hesaplanır.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(box);
    return () => observer?.disconnect();
  }, [pathname]);

  // Anasayfanın alt çubuğu sayfanın bloklarına kayar.
  if (section.id === 'anasayfa') return <HomeDock />;

  // Henüz sayfası olmayan bölümlerde alt çubuk gösterilmez.
  if (navLeft.length + navRight.length === 0) return null;

  return (
    <nav
      aria-label="Ana gezinme"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center md:px-3 md:pb-3"
    >
      <div
        ref={container}
        className="pointer-events-auto relative flex w-full items-center gap-1 rounded-t-[1.75rem] border-t border-line bg-surface-raised/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur-xl md:w-auto md:gap-2 md:rounded-[2rem] md:border md:p-1.5 md:px-3"
      >
        {/* Kayan vurgu kutusu (bağlantıların arkasında) */}
        <span
          ref={indicator}
          data-dock-indicator=""
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 rounded-2xl bg-brand-50 opacity-0 transition-[transform,width,height,opacity] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
        />

        {navLeft
          .filter((item) => can(pageResource(item.path)!))
          .map((item) => (
            <DockLink key={item.id} item={item} siblings={[...navLeft, ...navRight]} />
          ))}

        {!section.addButton ? null : save ? (
          can('products', 'save') ? (
            <button
              key={pathname}
              type="button"
              onClick={save.onSave}
              disabled={save.saving}
              aria-label="Kaydet"
              title="Kaydet"
              className="relative -mt-7 mx-1 flex size-14 shrink-0 animate-turn-in items-center justify-center overflow-hidden rounded-full bg-brand-700 text-white shadow-soft ring-4 ring-surface-raised transition-[transform,opacity] duration-200 hover:scale-105 active:scale-95 disabled:opacity-80 md:mt-0 md:ring-0"
            >
              {save.saving ? (
                <Spinner className="size-6" />
              ) : (
                <Save className="size-7" aria-hidden="true" />
              )}
            </button>
          ) : null
        ) : add ? (
          can(pageResource(pathname) ?? 'products', 'save') ? (
            <button
              key={pathname}
              type="button"
              onClick={add.onAdd}
              aria-label={add.label}
              title={add.label}
              className="-mt-7 mx-1 flex size-14 shrink-0 animate-turn-in items-center justify-center rounded-full bg-brand-700 text-white shadow-soft ring-4 ring-surface-raised transition-transform duration-200 hover:scale-105 active:scale-95 md:mt-0 md:ring-0"
            >
              <Plus className="size-7" aria-hidden="true" />
            </button>
          ) : null
        ) : can('products', 'save') ? (
          <NavLink
            key={pathname}
            to={STOCK_CREATE_PATH}
            aria-label="Yeni Stok Kartı"
            className="-mt-7 mx-1 flex size-14 shrink-0 animate-turn-in items-center justify-center rounded-full bg-brand-700 text-white shadow-soft ring-4 ring-surface-raised transition-transform duration-200 hover:scale-105 active:scale-95 md:mt-0 md:ring-0"
          >
            <Plus className="size-7" aria-hidden="true" />
          </NavLink>
        ) : null}

        {navRight
          .filter((item) => can(pageResource(item.path)!))
          .map((item) => (
            <DockLink key={item.id} item={item} siblings={[...navLeft, ...navRight]} />
          ))}
      </div>
    </nav>
  );
}
