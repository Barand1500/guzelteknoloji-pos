import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '../../lib/useMediaQuery';

export interface MultiOption {
  id: string;
  name: string;
  /** Ağaç görünümü için derinlik (0 = üst düzey); verilirse satır içeri girintilenir. */
  depth?: number;
  /** Aramada gösterilen üst yol ("Üst › Alt" için "Üst"). */
  path?: string;
  parentId?: string | null;
  active?: boolean;
}

interface MultiSelectFieldProps {
  label: string;
  options: readonly MultiOption[];
  /** Seçili kimlikler. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Hiçbiri seçili değilken tetikte yazan metin (varsayılan "Hepsi"). */
  emptyText?: string;
  /** true: seçilenler çip olarak tetiğin İÇİNDE görünür (altta ayrı çip satırı çıkmaz). */
  inlineChips?: boolean;
  /** true: seçilenler tetiğin içinde "A, B" diye yazılır; altta çip satırı çıkmaz. */
  listText?: boolean;
  /** Listenin altına eklenen içerik (ör. hızlı ekleme formu). */
  footer?: ReactNode;
}

const fold = (s: string) => s.toLocaleLowerCase('tr');
/** Seçili çiplerden en çok bu kadarı gösterilir; fazlası "+N" olur (kalabalık olmasın). */
const MAX_CHIPS = 6;

/**
 * Çoklu seçimli, aranabilir açılır kutu. Görünüm ve davranış tekli `SelectField` ile aynıdır:
 * aynı alan tetiği, ekranın üstünde (kırpılmayan) yüzen panel, telefonda alttan açılan sheet,
 * aynı satır biçimi; fark yalnızca birden çok satırın ✓ alabilmesi ve panelin seçimde kapanmamasıdır.
 * Tetik özet yazar ("Hepsi" / "3 seçili"); seçilenler altında silinebilir çipler olarak görünür.
 */
export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  emptyText = 'Hepsi',
  inlineChips = false,
  listText = false,
  footer,
}: MultiSelectFieldProps) {
  const id = useId();
  const listId = `${id}-panel`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const phone = !useMediaQuery('(min-width: 48rem)');

  const tree = useMemo(() => {
    if (!options.some((o) => o.parentId)) return options;
    const result: MultiOption[] = [];
    const seen = new Set<string>();
    const visit = (o: MultiOption, depth: number, path: string, parentActive = true) => {
      if (seen.has(o.id)) return;
      seen.add(o.id);
      const active = parentActive && o.active !== false;
      result.push({ ...o, depth, path, active });
      options
        .filter((child) => child.parentId === o.id)
        .forEach((child) => visit(child, depth + 1, path ? `${path} › ${o.name}` : o.name, active));
    };
    options
      .filter((o) => !o.parentId || !options.some((parent) => parent.id === o.parentId))
      .forEach((o) => visit(o, 0, ''));
    options.filter((o) => !seen.has(o.id)).forEach((o) => visit(o, 0, ''));
    return result;
  }, [options]);
  const visible = useMemo(
    () =>
      tree.filter((o) => {
        if (query) return fold(`${o.path ?? ''} ${o.name}`).includes(fold(query));
        let parent = o.parentId;
        const seen = new Set<string>([o.id]);
        while (parent && !seen.has(parent)) {
          if (!options.some((p) => p.id === parent)) break;
          seen.add(parent);
          if (!expanded.has(parent)) return false;
          parent = options.find((p) => p.id === parent)?.parentId;
        }
        return true;
      }),
    [tree, query, expanded, options],
  );
  const chosen = options.filter((o) => value.includes(o.id));
  const toggle = (optionId: string) =>
    onChange(value.includes(optionId) ? value.filter((x) => x !== optionId) : [...value, optionId]);

  const summary =
    value.length === 0
      ? emptyText
      : value.length === 1
        ? (chosen[0]?.name ?? '1 seçili')
        : listText
          ? chosen.map((o) => o.name).join(', ')
          : `${value.length} seçili`;

  // Tetiğin konumuna göre paneli yerleştirir; altta yer yoksa yukarı açar.
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const up = below < 320 && rect.top > below;
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 224), window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    setPos(
      up
        ? { left, width, bottom: window.innerHeight - rect.top + 8 }
        : { left, width, top: rect.bottom + 8 },
    );
  }, []);

  const openList = () => {
    place();
    setPortalTarget(rootRef.current?.closest('[data-theme]') ?? document.body);
    setQuery('');
    setOpen(true);
  };
  const closeList = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    // Telefonda arama kutusuna otomatik odaklanmayız: ekran klavyesi listeyi kapatır.
    if (!phone) searchRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeList(true);
      }
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, phone, place, closeList]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={rootRef} className="field">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => (open ? closeList() : openList())}
          className="field-input flex items-center pr-11 text-left aria-expanded:border-brand-600"
        >
          {inlineChips && chosen.length > 0 ? (
            <span className="flex min-w-0 items-center gap-1.5">
              {chosen.slice(0, 2).map((o) => (
                <span
                  key={o.id}
                  className="max-w-[9rem] truncate rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-ink"
                >
                  {o.name}
                </span>
              ))}
              {chosen.length > 2 ? (
                <span className="shrink-0 rounded-full bg-brand-700 px-2 py-1 text-xs font-bold text-white">
                  +{chosen.length - 2}
                </span>
              ) : null}
            </span>
          ) : (
            <span className={`truncate ${value.length === 0 ? 'text-ink-muted' : ''}`}>
              {summary}
            </span>
          )}
        </button>
        <label htmlFor={id} className="field-label" data-floated="true">
          {label}
        </label>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && pos && portalTarget
        ? createPortal(
            <>
              {phone ? (
                <div aria-hidden="true" className="fixed inset-0 z-40 animate-fade-in bg-ink/40" />
              ) : null}
              <div
                ref={panelRef}
                id={listId}
                role="group"
                aria-label={`${label} seçenekleri`}
                style={phone ? undefined : { position: 'fixed', ...pos }}
                className={
                  phone
                    ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] animate-sheet-in flex-col overflow-hidden rounded-t-[1.75rem] border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-card'
                    : 'z-50 animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-card'
                }
              >
                {phone ? (
                  <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
                    <p className="text-lg font-extrabold">{label}</p>
                    <button
                      type="button"
                      onClick={() => closeList(true)}
                      aria-label="Kapat"
                      className="inline-flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                <div className="relative border-b border-line p-2">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ara…"
                    aria-label={`${label} içinde ara`}
                    className="h-10 w-full rounded-xl bg-surface-muted pr-3 pl-9 text-sm text-ink outline-none placeholder:text-ink-muted"
                  />
                </div>
                <ul
                  className={`${phone ? 'max-h-[48dvh] min-h-0 flex-1' : 'max-h-60'} overflow-y-auto p-1.5`}
                >
                  {visible.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-ink-muted">Sonuç yok</li>
                  ) : (
                    visible.map((o) => {
                      const on = value.includes(o.id);
                      return (
                        <li key={o.id} className="flex items-center">
                          {options.some((child) => child.parentId === o.id) && (
                            <button
                              type="button"
                              aria-label={`${o.name} alt kategorileri`}
                              aria-expanded={expanded.has(o.id)}
                              onClick={() =>
                                setExpanded((old) => {
                                  const next = new Set(old);
                                  if (next.has(o.id)) next.delete(o.id);
                                  else next.add(o.id);
                                  return next;
                                })
                              }
                              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-surface-muted"
                            >
                              <ChevronDown
                                className={`size-4 ${expanded.has(o.id) ? '' : '-rotate-90'}`}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            role="checkbox"
                            aria-label={query && o.path ? `${o.path} › ${o.name}` : o.name}
                            aria-description={o.active === false ? 'Pasif kategori' : undefined}
                            aria-checked={on}
                            onClick={() => toggle(o.id)}
                            style={
                              o.depth && !query
                                ? { paddingLeft: `${0.75 + o.depth * 1.25}rem` }
                                : undefined
                            }
                            className={[
                              'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-base hover:bg-surface-muted',
                              o.active === false
                                ? 'text-ink-muted'
                                : on
                                  ? 'bg-brand-50 font-semibold text-brand-ink'
                                  : 'text-ink',
                            ].join(' ')}
                          >
                            {o.depth && !query ? (
                              <span
                                aria-hidden="true"
                                className="-mt-2.5 inline-block h-4 w-3 shrink-0 rounded-bl-md border-b-2 border-l-2 border-line"
                              />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate">
                              {query && o.path ? (
                                <span className="font-normal text-ink-muted">{o.path} › </span>
                              ) : null}
                              <span className={o.depth || on ? '' : 'font-semibold'}>{o.name}</span>
                            </span>
                            {o.active === false && (
                              <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
                                Pasif
                              </span>
                            )}
                            {on ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                {footer}
                {value.length > 0 ? (
                  <div className="border-t border-line p-2">
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="min-h-9 rounded-full px-3 text-sm font-semibold text-brand-ink hover:bg-brand-50"
                    >
                      Seçimi Temizle
                    </button>
                  </div>
                ) : null}
              </div>
            </>,
            portalTarget,
          )
        : null}

      {chosen.length > 0 && !inlineChips && !listText ? (
        <ul aria-label={`Seçili ${label.toLocaleLowerCase('tr')}`} className="flex flex-wrap gap-2">
          {chosen.slice(0, MAX_CHIPS).map((o) => (
            <li
              key={o.id}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm font-semibold text-brand-ink"
            >
              {o.name}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                aria-label={`${o.name} seçimini kaldır`}
                className="inline-flex size-7 items-center justify-center rounded-full hover:bg-brand-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          {chosen.length > MAX_CHIPS ? (
            <li className="inline-flex min-h-9 items-center px-2 text-sm font-semibold text-ink-muted">
              +{chosen.length - MAX_CHIPS}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
