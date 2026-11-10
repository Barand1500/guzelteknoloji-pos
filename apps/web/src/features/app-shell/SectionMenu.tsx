import { Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { SECTIONS, sectionFor, type Section } from '../../config/sections';
import { Tile } from './MenuTile';
import { PhoneMenu } from './PhoneMenu';
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

/**
 * Üst menü ("Başlat Menüsü"): sol üstteki animasyonlu düğme, aramalı bir panel açar. Solda
 * KATEGORİLER (bölümler, sayfa sayılarıyla), sağda seçili bölümün sayfaları kare kutular olarak
 * durur. Üstteki arama kutusu tüm bölümlerin sayfalarında arar. Bölüm değişince alttaki çubuk o
 * bölümün sayfalarına döner. Yapılmamış bölümler "Yakında" görünür. Esc, ✕ ya da dış alan kapatır.
 */
export function SectionMenu() {
  const { pathname } = useLocation();
  const { can } = useWorkspace();
  // Telefonda menü alttan açılan kadranlı bir sayfadır; geniş ekranda düğmenin altına açılan panel.
  const phone = !useMediaQuery('(min-width: 48rem)');
  const current = sectionFor(pathname);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string>(current.id);
  const [query, setQuery] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  // Panel, düğmenin hemen altına (sol kenarı düğmeyle aynı hizada) açılır.
  const [anchor, setAnchor] = useState({ top: 64, left: 16 });

  // Menü açılınca (geniş ekranda) arama kutusu hazır olsun; telefonda klavye açılmasın.
  useEffect(() => {
    if (open && !phone) searchBox.current?.focus();
  }, [open, phone]);

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

  // Ctrl+Q: menüyü açar/kapatır (her sayfada).
  const toggleRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        toggleRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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

  const toggleMenu = () => {
    const box = trigger.current?.getBoundingClientRect();
    if (box) setAnchor({ top: Math.round(box.bottom + 10), left: Math.round(box.left) });
    setPreview(current.id);
    setQuery('');
    setOpen((v) => !v);
  };
  // Kısayol her zaman güncel durumla çalışsın.
  useEffect(() => {
    toggleRef.current = toggleMenu;
  });

  // Ok tuşlarıyla gezinme: arama → kategoriler → sayfa kutuları (Enter açar).
  const onPanelKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!keys.includes(e.key) || e.ctrlKey || e.altKey || e.metaKey) return;
    const root = e.currentTarget;
    const active = document.activeElement as HTMLElement | null;
    const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-tile]')];
    const tabList = root.querySelector<HTMLElement>('[role="tablist"]');
    const rowTabs = tabList ? getComputedStyle(tabList).flexDirection === 'row' : false;
    const selectedTab = tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0];
    const go = (el: HTMLElement | undefined) => {
      if (!el) return;
      e.preventDefault();
      el.focus();
    };
    const pickTab = (el: HTMLElement | undefined) => {
      if (!el) return;
      e.preventDefault();
      const id = el.querySelector<HTMLElement>('[data-tab-id]')?.dataset.tabId;
      if (id) {
        setQuery('');
        setPreview(id);
      }
      el.focus();
    };
    const inSearch = active === searchBox.current;
    const tabIndex = active ? tabs.indexOf(active) : -1;
    const tileIndex = active ? tiles.indexOf(active) : -1;

    if (inSearch) {
      // Yazı alanında yalnızca aşağı ok menüye geçer (sol/sağ imleci hareket ettirir).
      if (e.key !== 'ArrowDown') return;
      go(q === '' ? selectedTab : tiles[0]);
    } else if (tabIndex >= 0) {
      const prev = rowTabs ? 'ArrowLeft' : 'ArrowUp';
      const next = rowTabs ? 'ArrowRight' : 'ArrowDown';
      if (e.key === prev) {
        if (tabIndex === 0) go(searchBox.current ?? undefined);
        else pickTab(tabs[tabIndex - 1]);
      } else if (e.key === next) pickTab(tabs[Math.min(tabs.length - 1, tabIndex + 1)]);
      else if (e.key === (rowTabs ? 'ArrowDown' : 'ArrowRight')) go(tiles[0]);
      else if (rowTabs && e.key === 'ArrowUp') go(searchBox.current ?? undefined);
    } else if (tileIndex >= 0) {
      // Izgara sütun sayısı: ilk satırdaki kutu sayısı.
      const cols = Math.max(1, tiles.filter((t) => t.offsetTop === tiles[0]!.offsetTop).length);
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key]!;
      const target = tileIndex + step;
      if (e.key === 'ArrowLeft' && tileIndex % cols === 0)
        go(q === '' ? selectedTab : (searchBox.current ?? undefined));
      else if (e.key === 'ArrowUp' && target < 0)
        go(q === '' && rowTabs ? selectedTab : (searchBox.current ?? undefined));
      else if (target >= 0 && target < tiles.length) go(tiles[target]);
      else if (e.key === 'ArrowDown') e.preventDefault();
    }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggleMenu}
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

      {open && phone
        ? createPortal(
            <PhoneMenu
              current={current}
              preview={preview}
              onPreview={setPreview}
              query={query}
              onQuery={setQuery}
              close={close}
              pagesOf={pagesOf}
              results={results}
            />,
            document.body,
          )
        : null}

      {open && !phone
        ? createPortal(
            <div
              className="fixed inset-0 z-50"
              role="dialog"
              aria-label="Ana menü"
              aria-modal="false"
            >
              {/* Görünmez yakalayıcı: panelin dışına dokunmak kapatır (ekran kararmaz). */}
              <div className="absolute inset-0" onClick={close} aria-hidden="true" />
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- ok tuşları içindeki öğelerden gelir */}
              <div
                style={
                  {
                    top: anchor.top,
                    height: `min(36rem, calc(100dvh - ${anchor.top}px - 0.75rem))`,
                    '--menu-left': `${anchor.left}px`,
                  } as React.CSSProperties
                }
                onKeyDown={onPanelKey}
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

                <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] border-t border-line md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-1">
                  {/* Kategoriler (telefonda yatay kayar) */}
                  <div className="flex min-h-0 min-w-0 flex-col md:border-r md:border-line">
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
                              'flex min-h-12 w-full min-w-0 shrink-0 items-center gap-3 rounded-xl border px-3.5 text-left text-sm font-bold transition-colors max-md:w-auto max-md:max-w-[12rem]',
                              on
                                ? 'border-brand-600 bg-brand-50 text-brand-ink'
                                : 'border-line bg-surface text-ink hover:border-brand-500/60',
                            ].join(' ')}
                          >
                            <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                            <span
                              data-tab-id={s.id}
                              className="min-w-0 flex-1 truncate"
                              title={s.label}
                            >
                              {s.label}
                            </span>
                            <span
                              aria-hidden="true"
                              className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-ink-muted"
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
                    className="min-h-0 min-w-0 overflow-y-auto p-4 md:p-6"
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
