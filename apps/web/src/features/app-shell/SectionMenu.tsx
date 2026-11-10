import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router';
import { SECTIONS, sectionFor, type Section, type SectionPage } from '../../config/sections';
import { pageResource, useWorkspace } from '../workspace/workspace-context';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/** 2×2 kare ızgarası; menü açılınca kareler dönüp çarpıya ("✕") dönüşür. */
function MenuGlyph({ open }: { open: boolean }) {
  const dot = 'absolute size-[0.6rem] rounded-[0.2rem] bg-current transition-all duration-500';
  return (
    <span aria-hidden="true" className="relative block size-5">
      <span
        className={`${dot} ${open ? 'top-[0.45rem] left-[0.1rem] w-[1.1rem] rotate-45' : 'top-0 left-0'}`}
      />
      <span
        className={`${dot} ${open ? 'top-[0.45rem] left-[0.1rem] w-[1.1rem] -rotate-45' : 'top-0 right-0'}`}
      />
      <span className={`${dot} ${open ? 'scale-0 opacity-0' : 'bottom-0 left-0'}`} />
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
            'group flex h-full min-h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-soft',
            isActive ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
          ].join(' ')
        }
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-surface-muted text-ink transition-colors group-hover:bg-brand-50 group-hover:text-brand-ink">
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
        onClick={() => {
          setPreview(current.id);
          setQuery('');
          setOpen((v) => !v);
        }}
        aria-label="Ana menü"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full bg-brand-700 pr-4 pl-3.5 text-white shadow-soft transition-[transform,background-color] duration-200 hover:bg-brand-800 active:scale-95"
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
              aria-modal="true"
            >
              <div
                className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-sm"
                onClick={close}
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 top-0 mx-auto flex h-[min(34rem,92dvh)] w-full max-w-3xl animate-rise-in flex-col overflow-hidden rounded-b-3xl border border-t-0 border-line bg-surface-raised shadow-card md:top-4 md:rounded-3xl md:border-t">
                {/* Başlık + kapat */}
                <div className="flex items-center gap-3 px-4 pt-4 md:px-5">
                  <h2 className="flex-1 text-lg font-extrabold tracking-tight">Başlat Menüsü</h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Menüyü kapat"
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Arama */}
                <div className="px-4 pt-3 pb-3 md:px-5">
                  <label className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 transition-colors focus-within:border-brand-600">
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
                    <p className="hidden px-5 pt-4 pb-2 text-xs font-extrabold tracking-wider text-ink-muted md:block">
                      KATEGORİLER
                    </p>
                    <div
                      role="tablist"
                      aria-label="Bölümler"
                      aria-orientation="vertical"
                      className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] md:flex-col md:gap-2 md:overflow-x-visible md:overflow-y-auto md:px-3 md:pt-0"
                    >
                      {SECTIONS.map((s) => {
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
                            onMouseEnter={() => q === '' && setPreview(s.id)}
                            className={[
                              'flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-bold transition-colors',
                              on
                                ? 'border-brand-600 bg-brand-50 text-brand-ink'
                                : 'border-line bg-surface text-ink hover:border-brand-500/60',
                            ].join(' ')}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
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
                    className="min-h-0 overflow-y-auto p-4 md:p-5"
                  >
                    {q === '' ? (
                      <>
                        <p className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-wider text-ink-muted uppercase">
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
                          className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4"
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
                      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4">
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

                <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-ink-muted md:px-5">
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
