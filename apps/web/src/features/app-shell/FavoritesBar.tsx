import { Check, Plus, Search, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { SECTIONS, type SectionPage } from '../../config/sections';
import { pageResource, useWorkspace } from '../workspace/workspace-context';
import { MAX_FAVORITES, useFavorites } from './favorites';

const fold = (s: string) => s.toLocaleLowerCase('tr');
const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(path + '/');

/**
 * Geniş ekranda gece/gündüz düğmesinin yanındaki üç favori yuvası. Boş yuva "+" ile başlar: basınca bir açılır
 * kutu çıkar (en üstte "şu anki sayfayı ekle", altında aranabilir tüm sayfalar); seçilen sayfa yuvaya kapsül
 * olarak oturur ve tek tıkla açılır. Kapsülün üstüne gelince ✕ çıkar, favoriden kaldırır. Dar ekranlarda (xl altı)
 * kapsülde yalnızca simge görünür. Telefonda hiç gösterilmez.
 */
export function FavoritesBar() {
  const { paths, add, remove } = useFavorites();
  const { pathname } = useLocation();
  const { can } = useWorkspace();
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);

  // Yetkisi olan, yapılmış sayfaların düz listesi (bölümüne göre gruplanır).
  const catalog = useMemo(() => {
    const out: { section: string; page: SectionPage }[] = [];
    for (const s of SECTIONS) {
      if (s.soon) continue;
      for (const p of s.pages) {
        const r = pageResource(p.path);
        if (r === null || can(r)) out.push({ section: s.label, page: p });
      }
    }
    return out;
  }, [can]);
  const byPath = useMemo(() => new Map(catalog.map((c) => [c.page.path, c.page])), [catalog]);

  useEffect(() => {
    if (openSlot === null) return;
    const down = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpenSlot(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSlot(null);
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [openSlot]);

  const current = catalog.find((c) => matches(pathname, c.page.path))?.page ?? null;
  const q = fold(query.trim());
  const shown = catalog.filter(({ page, section }) => !q || fold(`${page.label} ${section}`).includes(q));
  const groups = [...new Set(shown.map((c) => c.section))];

  const pick = (path: string) => {
    add(path);
    setOpenSlot(null);
    setQuery('');
  };

  return (
    <div
      ref={box}
      role="group"
      aria-label="Favori sayfalar"
      className="relative flex items-center gap-1.5"
    >
      {Array.from({ length: MAX_FAVORITES }, (_, i) => {
        const path = paths[i];
        const page = path ? byPath.get(path) : undefined;
        if (path && page) {
          const Icon = page.icon;
          const on = matches(pathname, path);
          return (
            <span key={path} className="group/fav relative animate-turn-in">
              <Link
                to={path}
                title={page.label}
                aria-label={`Favori: ${page.label}`}
                aria-current={on ? 'page' : undefined}
                className={`inline-flex h-11 max-w-[10rem] items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors ${on ? 'border-brand-600 bg-brand-50 text-brand-ink' : 'border-line bg-surface-raised text-ink hover:border-brand-500 hover:text-brand-ink'}`}
              >
                <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                <span className="hidden truncate xl:inline">{page.label}</span>
              </Link>
              <button
                type="button"
                aria-label={`${page.label} favoriden çıkar`}
                onClick={() => remove(path)}
                className="absolute -top-1.5 -right-1.5 flex size-5 scale-75 items-center justify-center rounded-full bg-ink text-white opacity-0 transition-all group-focus-within/fav:scale-100 group-focus-within/fav:opacity-100 group-hover/fav:scale-100 group-hover/fav:opacity-100"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          );
        }
        // Boş yuva: hangi sıradaki yuva olduğu açılır kutuyu yerleştirmek için tutulur.
        return (
          <button
            key={`bos-${i}`}
            type="button"
            aria-label={`Favori ekle ${i + 1}`}
            aria-expanded={openSlot === i}
            title="Favori sayfa ekle"
            onClick={() => {
              setQuery('');
              setOpenSlot(openSlot === i ? null : i);
            }}
            className={`flex size-11 items-center justify-center rounded-full border border-dashed transition-colors ${openSlot === i ? 'border-brand-600 bg-brand-50 text-brand-ink' : 'border-line-strong/60 text-ink-muted hover:border-brand-500 hover:bg-brand-50 hover:text-brand-ink'}`}
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        );
      })}

      {openSlot !== null ? (
        <div
          role="dialog"
          aria-label="Favori sayfa seç"
          className="absolute top-full right-0 z-50 mt-2 w-80 animate-fade-in overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card"
        >
          <div className="border-b border-line p-3">
            <label className="flex h-11 items-center gap-2 rounded-2xl border border-field-border bg-surface px-3 focus-within:border-brand-600">
              <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <input
                // Açılır kutu kullanıcının isteğiyle açıldı; aramaya doğrudan yazılabilsin.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                type="search"
                aria-label="Favoriye eklenecek sayfa ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sayfa ara…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
              />
            </label>
            {current && !paths.includes(current.path) && q === '' ? (
              <button
                type="button"
                onClick={() => pick(current.path)}
                className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-2xl bg-brand-50 px-3 text-left text-sm font-bold text-brand-ink transition-colors hover:bg-brand-100/60"
              >
                <Star className="size-4 shrink-0 fill-current" aria-hidden="true" />
                <span className="min-w-0 truncate">Şu anki sayfayı ekle: {current.label}</span>
              </button>
            ) : null}
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">“{query.trim()}” ile eşleşen sayfa yok.</p>
            ) : (
              groups.map((g) => (
                <div key={g} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-[0.6875rem] font-extrabold tracking-wider text-ink-muted uppercase">{g}</p>
                  {shown
                    .filter((c) => c.section === g)
                    .map(({ page }) => {
                      const Icon = page.icon;
                      const have = paths.includes(page.path);
                      return (
                        <button
                          key={page.path}
                          type="button"
                          disabled={have}
                          onClick={() => pick(page.path)}
                          className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition-colors enabled:hover:bg-brand-50 disabled:text-ink-muted"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{page.label}</span>
                          {have ? <Check className="size-4 shrink-0 text-success" aria-label="Favorilerde" /> : null}
                        </button>
                      );
                    })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
