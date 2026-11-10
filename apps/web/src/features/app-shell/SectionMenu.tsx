import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router';
import { SECTIONS, sectionFor, type Section } from '../../config/sections';
import { pageResource, useWorkspace } from '../workspace/workspace-context';

/** Bölümün rengi: simge zemini (iki temada da okunur). */
const blob = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue} 78% 58%), hsl(${(hue + 28) % 360} 74% 48%))`,
});

/** 2×2 nokta ızgarası; menü açılınca kareler dönüp çarpıya ("✕") dönüşür. */
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

/**
 * Üst menü: sol üstteki animasyonlu düğme, iki bölmeli bir "bölüm gezgini" açar. Solda bölümler
 * (Anasayfa, Siparişler, Ürünler, Ayarlar …), sağda üzerine gelinen/dokunulan bölümün sayfaları
 * renkli kartlar olarak durur. Bölüm seçilince alttaki çubuk o bölümün sayfalarına döner.
 * Yapılmamış bölümler "Yakında" etiketiyle görünür. Esc, dış alan ya da sayfa değişimi kapatır.
 */
export function SectionMenu() {
  const { pathname } = useLocation();
  const { can } = useWorkspace();
  const current = sectionFor(pathname);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string>(current.id);
  const trigger = useRef<HTMLButtonElement>(null);

  // Sayfa değişince menü kapanır (yol dışarıdan değişmiş olabilir).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const shown: Section = SECTIONS.find((s) => s.id === preview) ?? current;
  const allowed = (path: string) => {
    const resource = pageResource(path);
    return resource === null || can(resource);
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setPreview(current.id);
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
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 top-0 mx-auto flex max-h-[92dvh] w-full max-w-4xl animate-rise-in flex-col overflow-hidden rounded-b-[2rem] border border-t-0 border-line bg-surface-raised shadow-card md:top-3 md:rounded-[2rem] md:border-t">
                <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[15rem_minmax(0,1fr)]">
                  {/* Bölümler */}
                  <div
                    role="tablist"
                    aria-label="Bölümler"
                    aria-orientation="vertical"
                    className="grid grid-cols-3 gap-2 bg-surface-muted/60 p-3 pt-4 md:flex md:flex-col md:gap-1 md:p-3"
                  >
                    {SECTIONS.map((s, i) => {
                      const Icon = s.icon;
                      const on = preview === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => setPreview(s.id)}
                          onMouseEnter={() => setPreview(s.id)}
                          onFocus={() => setPreview(s.id)}
                          style={{ animationDelay: `${i * 35}ms` }}
                          className={[
                            'flex animate-rise-in flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center transition-all duration-200 md:flex-row md:gap-3 md:p-2 md:text-left',
                            on
                              ? 'bg-surface-raised shadow-soft ring-1 ring-line'
                              : 'hover:bg-surface-raised/70',
                          ].join(' ')}
                        >
                          <span
                            style={blob(s.hue)}
                            className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-300 ${on ? 'scale-110 -rotate-6' : ''}`}
                          >
                            <Icon className="size-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[0.6875rem] leading-tight font-bold md:text-sm">
                              {s.label}
                            </span>
                            {s.id === current.id ? (
                              <span className="hidden text-xs font-semibold text-brand-ink md:block">
                                Buradasın
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Seçili bölümün sayfaları */}
                  <div
                    role="tabpanel"
                    aria-label={shown.label}
                    className="flex flex-col gap-4 p-4 md:p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        style={blob(shown.hue)}
                        className="flex size-12 items-center justify-center rounded-2xl text-white"
                      >
                        <shown.icon className="size-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xl font-extrabold tracking-tight">
                          {shown.label}
                        </p>
                        <p className="truncate text-sm text-ink-muted">{shown.tagline}</p>
                      </div>
                    </div>

                    <ul key={shown.id} className="grid gap-2.5 sm:grid-cols-2">
                      {shown.pages
                        .filter((page) => allowed(page.path))
                        .map((page, i) => {
                          const Icon = page.icon;
                          return (
                            <li
                              key={page.id}
                              style={{ animationDelay: `${i * 45}ms` }}
                              className="animate-rise-in"
                            >
                              <NavLink
                                to={page.path}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                  [
                                    'group/card flex min-h-16 items-center gap-3 rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft',
                                    isActive
                                      ? 'border-brand-600/50 bg-brand-50'
                                      : 'border-line bg-surface hover:border-brand-500/60',
                                  ].join(' ')
                                }
                              >
                                <Icon
                                  className="size-6 shrink-0 text-brand-ink"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-bold">{page.label}</span>
                                  <span className="block truncate text-sm text-ink-muted">
                                    {page.hint}
                                  </span>
                                </span>
                                <ArrowUpRight
                                  className="size-4 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover/card:opacity-100"
                                  aria-hidden="true"
                                />
                              </NavLink>
                            </li>
                          );
                        })}
                    </ul>

                    {shown.soon ? (
                      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                        Bu bölüm e-ticaret sitesiyle birlikte gelecek.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
