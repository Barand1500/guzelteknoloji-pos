import {
  CornerDownLeft,
  Images,
  Package,
  Plus,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BULK_IMAGES_PATH,
  DEALS_PATH,
  STOCK_CREATE_PATH,
  navLeft,
  navRight,
  stockEditPath,
} from '../../config/navigation';
import { emptyFilters, type ProductItem } from '../products/types';
import { useProductService } from '../products/services/product.service';
import { pageResource, useWorkspace } from '../workspace/workspace-context';

interface Entry {
  id: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  to: string;
  group: 'Sayfalar' | 'Ürünler';
}

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Ctrl + K (Mac: ⌘ K) ile her yerden açılan hızlı arama: ekranın ortasında tek bir kutu. Sayfalar
 * (kategoriler, markalar, yeni stok kartı…) ve ürünler (ad, kod, barkod) birlikte aranır; ↑ ↓ ile
 * gezilir, Enter açar, Esc kapatır. Yetkisi olmayan sayfalar listede çıkmaz.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const { can } = useWorkspace();
  const productService = useProductService();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ query: string; items: ProductItem[] } | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // Ctrl/⌘ + K
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Açılınca kutuya odaklanır.
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const pages = useMemo<Entry[]>(() => {
    const nav = [...navLeft, ...navRight]
      .filter((item) => can(pageResource(item.path)!))
      .map<Entry>((item) => ({
        id: item.id,
        title: item.label,
        hint: 'Sayfa',
        icon: item.icon,
        to: item.path,
        group: 'Sayfalar',
      }));
    const extra: Entry[] = [
      {
        id: 'yeni',
        title: 'Yeni Stok Kartı',
        hint: 'Ürün ekle',
        icon: Plus,
        to: STOCK_CREATE_PATH,
        group: 'Sayfalar',
      },
      {
        id: 'firsat',
        title: 'Fırsat Yönetimi',
        hint: 'Sayfa',
        icon: Sparkles,
        to: DEALS_PATH,
        group: 'Sayfalar',
      },
      {
        id: 'toplu',
        title: 'Toplu Görsel',
        hint: 'Sayfa',
        icon: Images,
        to: BULK_IMAGES_PATH,
        group: 'Sayfalar',
      },
    ];
    return can('products') ? [...nav, ...extra] : nav;
  }, [can]);

  // Ürün araması: yazma durunca (250 ms) sunucudan en çok 6 sonuç.
  const text = query.trim();
  useEffect(() => {
    if (!open || text === '') return;
    let current = true;
    const timer = window.setTimeout(() => {
      productService
        .listPage({ search: text, filters: emptyFilters(), page: 1, pageSize: 6 })
        .then((page) => {
          if (current) setFound({ query: text, items: page.items });
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [open, text, productService]);

  const entries = useMemo<Entry[]>(() => {
    const matchedPages =
      text === '' ? pages : pages.filter((p) => fold(p.title).includes(fold(text)));
    const products =
      text !== '' && found?.query === text
        ? found.items.map<Entry>((p) => ({
            id: `p-${p.id}`,
            title: p.name,
            hint: p.code,
            icon: Package,
            to: stockEditPath(p.id),
            group: 'Ürünler',
          }))
        : [];
    return [...matchedPages, ...products];
  }, [pages, text, found]);

  const current = Math.min(active, Math.max(0, entries.length - 1));
  useEffect(() => {
    document.getElementById(`palet-${current}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [current]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setQuery('');
    setFound(null);
    setActive(0);
  };

  const go = (entry: Entry | undefined) => {
    if (!entry) return;
    close();
    navigate(entry.to);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[16vh]">
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
      />
      {/* Klavye (↑ ↓ Enter Esc) kutudan yukarı çıkan olaylarla yönetilir. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hızlı arama"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(Math.min(entries.length - 1, current + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(Math.max(0, current - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            go(entries[current]);
          }
        }}
        className="relative w-full max-w-xl animate-pop overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palet-liste"
            aria-activedescendant={entries[current] ? `palet-${current}` : undefined}
            aria-label="Hızlı arama"
            placeholder="Ürün, kod ya da sayfa ara…"
            className="h-16 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs font-semibold text-ink-muted sm:block">
            Esc
          </kbd>
        </div>

        <ul
          id="palet-liste"
          role="listbox"
          aria-label="Sonuçlar"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {entries.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-ink-muted">
              {text === ''
                ? 'Yazmaya başlayın.'
                : found?.query === text
                  ? 'Sonuç bulunamadı.'
                  : 'Aranıyor…'}
            </li>
          ) : (
            entries.map((entry, index) => {
              const Icon = entry.icon;
              const heading = index === 0 || entries[index - 1]!.group !== entry.group;
              return (
                <li key={entry.id} role="presentation">
                  {heading ? (
                    <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wide text-ink-muted uppercase">
                      {entry.group}
                    </p>
                  ) : null}
                  <div
                    id={`palet-${index}`}
                    role="option"
                    aria-selected={index === current}
                    tabIndex={-1}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => go(entry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') go(entry);
                    }}
                    className={[
                      'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3',
                      index === current ? 'bg-brand-50' : '',
                    ].join(' ')}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{entry.title}</span>
                    <span className="shrink-0 text-sm text-ink-muted">{entry.hint}</span>
                    {index === current ? (
                      <CornerDownLeft
                        className="size-4 shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <p className="border-t border-line px-5 py-2.5 text-xs text-ink-muted">
          ↑ ↓ ile gezin · Enter açar · Esc kapatır
        </p>
      </div>
    </div>
  );
}
