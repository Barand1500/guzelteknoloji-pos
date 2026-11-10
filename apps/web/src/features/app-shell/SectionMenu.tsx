import { Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router';
import { SECTIONS, sectionFor, type Section, type SectionPage } from '../../config/sections';
import { pageResource, useWorkspace } from '../workspace/workspace-context';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Menü simgesi: dört yuvarlak kareden oluşan "uygulama ızgarası". Köşegen iki kare dolu, diğer
 * ikisi yarı saydamdır; üzerine gelince simge çeyrek tur döner, menü açılınca kareler birleşip
 * çarpıya ("✕") dönüşür.
 */
function MenuGlyph({ open }: { open: boolean }) {
  const dot =
    'absolute size-[0.5625rem] rounded-[0.2rem] bg-current transition-all duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]';
  return (
    <span
      aria-hidden="true"
      className={`relative block size-[1.25rem] transition-transform duration-500 ${open ? '' : 'group-hover:rotate-90'}`}
    >
      <span
        className={`${dot} ${open ? 'top-[0.5rem] left-[0.05rem] h-[0.1875rem] w-[1.15rem] rotate-45 rounded-full' : 'top-0 left-0'}`}
      />
      <span
        className={`${dot} ${open ? 'top-[0.5rem] left-[0.05rem] h-[0.1875rem] w-[1.15rem] -rotate-45 rounded-full' : 'top-0 right-0 opacity-55'}`}
      />
      <span className={`${dot} ${open ? 'scale-0 opacity-0' : 'bottom-0 left-0 opacity-55'}`} />
      <span className={`${dot} ${open ? 'scale-0 opacity-0' : 'right-0 bottom-0'}`} />
    </span>
  );
}

/** Menüdeki bir sayfa karesi: yuvarlak köşeli simge kutusu ve altında ad. */
function Tile({
  page,
  soon,
  onGo,
  index,
}: {
  page: SectionPage;
  soon?: boolean;
  onGo: () => void;
  index: number;
}) {
  const Icon = page.icon;
  return (
    <li style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }} className="animate-rise-in">
      <NavLink
        to={page.path}
        onClick={onGo}
        className={({ isActive }) =>
          [
            'group flex h-full min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-soft',
            isActive ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
          ].join(' ')
        }
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-surface-muted text-ink transition-colors group-hover:bg-brand-50 group-hover:text-brand-ink">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-sm leading-tight font-bold">{page.label}</span>
        {soon ? <span className="-mt-1.5 text-xs text-ink-muted">Yakında</span> : null}
      </NavLink>
    </li>
  );
}

/**
 * Üst menü ("Başlat Menüsü"): sol üstteki animasyonlu düğme, aramalı bir panel açar. Solda
 * KATEGORİLER (bölümler, sayfa sayılarıyla), sağda seçili bölümün sayfaları kare kutular olarak
 * durur. Üstteki arama kutusu tüm bölümlerin sayfalarında arar. Bölüm değişince alttaki çubuk o
 * bölümün sayfalarına döner. Yapılmamış bölümler "Yakında" görünür. Esc, ✕ ya da dış alan kapatır.
 */
export function SectionMenu() {
  const { pathname } = useLocation();
  const { can } = useWorkspace();
  const current = sectionFor(pathname);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string>(current.id);
  const [query, setQuery] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  // Panel, düğmenin hemen altına (sol kenarı düğmeyle aynı hizada) açılır.
  const [anchor, setAnchor] = useState({ top: 64, left: 16 });

  // Menü açılınca arama kutusu hazır olsun.
  useEffect(() => {
    if (open) searchBox.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  // Sayfa değişince menü kapanır (yol dışarıdan değişmiş olabilir).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setOpen(false);
      setQuery('');
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        setQuery('');
        trigger.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const allowed = (path: string) => {
    const resource = pageResource(path);
    return resource === null || can(resource);
  };
  const pagesOf = (s: Section) => s.pages.filter((p) => allowed(p.path));

  const shown: Section = SECTIONS.find((s) => s.id === preview) ?? current;
  const q = fold(query.trim());
  const results = useMemo(
    () =>
      q === ''
        ? []
        : SECTIONS.flatMap((s) =>
            s.pages
              .filter(
                (p) =>
                  allowed(p.path) &&
                  (fold(p.label).includes(q) ||
                    fold(p.hint).includes(q) ||
                    fold(s.label).includes(q)),
              )
              .map((page) => ({ section: s, page })),
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, can],
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setAnchor({ top: Math.round(box.bottom + 10), left: Math.round(box.left) });
          setPreview(current.id);
          setQuery('');
          setOpen((v) => !v);
        }}
        aria-label="Ana menü"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 pr-4 pl-3.5 text-white shadow-soft ring-1 ring-white/25 ring-inset transition-[transform,filter] duration-200 hover:brightness-110 active:scale-95"
      >
        <MenuGlyph open={open} />
        <span className="text-sm font-extrabold tracking-tight max-sm:sr-only">
          {current.label}
        </span>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50"
              role="dialog"
              aria-label="Ana menü"
              aria-modal="false"
            >
              {/* Görünmez yakalayıcı: panelin dışına dokunmak kapatır (ekran kararmaz). */}
              <div className="absolute inset-0" onClick={close} aria-hidden="true" />
              <div
                style={
                  {
                    top: anchor.top,
                    height: `min(36rem, calc(100dvh - ${anchor.top}px - 0.75rem))`,
                    '--menu-left': `${anchor.left}px`,
                  } as React.CSSProperties
                }
                className="absolute inset-x-3 flex origin-top-left animate-pop flex-col overflow-hidden rounded-3xl border border-brand-600/60 bg-surface-raised shadow-card md:inset-x-auto md:left-[var(--menu-left)] md:w-[46rem] md:max-w-[calc(100vw-2rem)]"
              >
                {/* Başlık + kapat */}
                <div className="flex items-center gap-2.5 px-5 pt-5 md:px-6">
                  <h2 className="flex-1 text-xl font-extrabold tracking-tight">Başlat Menüsü</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setPreview('ayarlar');
                    }}
                    aria-label="Ayarlar"
                    title="Ayarlar"
                    aria-pressed={q === '' && shown.id === 'ayarlar'}
                    className={[
                      'group/gear inline-flex size-11 items-center justify-center rounded-xl border transition-colors',
                      q === '' && shown.id === 'ayarlar'
                        ? 'border-brand-600 bg-brand-50 text-brand-ink'
                        : 'border-line text-ink-muted hover:bg-surface-muted hover:text-ink',
                    ].join(' ')}
                  >
                    <Settings
                      className="size-5 transition-transform duration-500 group-hover/gear:rotate-90"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Menüyü kapat"
                    className="inline-flex size-11 items-center justify-center rounded-xl border border-line text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Arama */}
                <div className="px-5 pt-4 pb-4 md:px-6">
                  <label className="flex h-13 items-center gap-3 rounded-2xl border border-line bg-surface px-4 transition-colors focus-within:border-brand-600">
                    <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                    <input
                      ref={searchBox}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Menüde ara"
                      placeholder="Sayfa veya bölüm ara…"
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted"
                    />
                  </label>
                </div>

                <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] border-t border-line md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-1">
                  {/* Kategoriler (telefonda yatay kayar) */}
                  <div className="flex min-h-0 flex-col md:border-r md:border-line">
                    <p className="hidden px-6 pt-5 pb-3 text-xs font-extrabold tracking-wider text-ink-muted md:block">
                      KATEGORİLER
                    </p>
                    <div
                      role="tablist"
                      aria-label="Bölümler"
                      aria-orientation="vertical"
                      className="flex gap-2.5 overflow-x-auto p-4 [scrollbar-width:none] md:flex-col md:overflow-x-visible md:overflow-y-auto md:px-4 md:pt-0 md:pb-5"
                    >
                      {SECTIONS.filter((s) => s.id !== 'ayarlar').map((s) => {
                        const Icon = s.icon;
                        const on = q === '' && shown.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => {
                              setQuery('');
                              setPreview(s.id);
                            }}
                            className={[
                              'flex min-h-12 shrink-0 items-center gap-3 rounded-xl border px-3.5 text-left text-sm font-bold transition-colors',
                              on
                                ? 'border-brand-600 bg-brand-50 text-brand-ink'
                                : 'border-line bg-surface text-ink hover:border-brand-500/60',
                            ].join(' ')}
                          >
                            <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                            <span className="flex-1 whitespace-nowrap">{s.label}</span>
                            <span
                              aria-hidden="true"
                              className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-ink-muted"
                            >
                              {s.soon ? '—' : pagesOf(s).length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sayfalar */}
                  <div
                    role="tabpanel"
                    aria-label={q === '' ? shown.label : 'Arama sonuçları'}
                    className="min-h-0 overflow-y-auto p-5 md:p-6"
                  >
                    {q === '' ? (
                      <>
                        <p className="mb-4 flex items-center gap-2 text-xs font-extrabold tracking-wider text-ink-muted uppercase">
                          {shown.label}
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">
                            {pagesOf(shown).length}
                          </span>
                          <span className="font-semibold tracking-normal normal-case">
                            · {shown.tagline}
                          </span>
                        </p>
                        <ul
                          key={shown.id}
                          className="grid grid-cols-2 gap-3 min-[26rem]:grid-cols-3 md:grid-cols-3"
                        >
                          {pagesOf(shown).map((page, i) => (
                            <Tile
                              key={page.id}
                              page={page}
                              soon={shown.soon}
                              index={i}
                              onGo={close}
                            />
                          ))}
                        </ul>
                      </>
                    ) : results.length === 0 ? (
                      <p className="py-10 text-center text-ink-muted">
                        “{query.trim()}” ile eşleşen sayfa yok.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-3 min-[26rem]:grid-cols-3 md:grid-cols-3">
                        {results.map(({ page, section }, i) => (
                          <Tile
                            key={`${section.id}-${page.id}`}
                            page={page}
                            soon={section.soon}
                            index={i}
                            onGo={close}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-ink-muted md:px-6">
                  <span>Şu an: {current.label}</span>
                  <span>Esc ile kapanır</span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
