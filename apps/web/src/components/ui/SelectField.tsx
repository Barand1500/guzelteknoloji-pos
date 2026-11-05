import { Check, ChevronDown, Plus, Search, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '../../lib/useMediaQuery';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export interface SelectOption {
  value: string;
  label: string;
  /** true ise listede çöp kutusu çıkar (kullanıcının eklediği/silebileceği seçenek). false: "sabit". */
  removable?: boolean;
}

export interface SelectCreator {
  placeholder: string;
  /** Verilirse adın yanında bir oran (%) kutusu da çıkar ve zorunlu olur (ör. KDV departmanı). */
  ratePlaceholder?: string;
  /** Kullanıcı yeni öğeyi onayladığında çağrılır; `rate` doğrulanmış, virgüllü yazımdır (örn. "8,5"). */
  onCreate: (label: string, rate?: string) => void;
}

/** "10", "%10", "8,5" → "10" / "8,5"; geçersiz ya da 0-100 dışıysa null. */
export function parseRate(text: string): string | null {
  const cleaned = text.replace('%', '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return String(value).replace('.', ',');
}

interface SelectFieldProps {
  label: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Verilirse listenin altında "Yeni ekle" satırı görünür (ayrı pencere açılmaz). */
  creator?: SelectCreator | undefined;
  /** Verilirse `removable` seçeneklerde silme düğmesi görünür. */
  onRemove?: ((value: string) => void) | undefined;
  /** Varsayılan: 7'den fazla seçenek varsa arama kutusu açılır. */
  searchable?: boolean | undefined;
  error?: string | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

/** Türkçe harf duyarlı, büyük/küçük harf farkı gözetmeyen karşılaştırma. */
const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Projenin TEK açılır liste (combobox) bileşeni: her yerde aynı görünür.
 * - Yüzen etiketli tetik düğmesi + yumuşak, yuvarlak köşeli panel; seçili satır vurgulu ve tikli.
 * - Altta yer yoksa (ör. mobilde alt çubuğa yakın) liste yukarı doğru açılır.
 * - Klavye: ↑ ↓ Home End Enter Esc. Ekran okuyucu için combobox/listbox rolleri tanımlıdır.
 * - Çok seçenekte arama, `creator` ile listeye yeni öğe ekleme, `onRemove` ile silme desteklenir.
 */
export function SelectField({
  label,
  options,
  value,
  onChange,
  creator,
  onRemove,
  searchable,
  error,
  id,
  className = '',
}: SelectFieldProps) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const listId = `${triggerId}-liste`;

  const [open, setOpen] = useState(false);
  // Liste, ekranın üstünde (fixed + portal) çizilir: kaydırmalı/kırpan kapların içinde de kesilmez.
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const [query, setQuery] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRate, setNewRate] = useState('');
  const [active, setActive] = useState(0);
  // Panelin çizileceği kap (tema renkleri data-theme kapsayıcısında tanımlıdır); açılırken belirlenir.
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Telefonda (48rem altı) liste ALTTAN açılan sheet olur; tablet/masaüstünde tetiğe bağlı panel.
  const phone = !useMediaQuery('(min-width: 48rem)');
  const showSearch = searchable ?? options.length > 7;
  const visible = useMemo(
    () => (query ? options.filter((o) => fold(o.label).includes(fold(query))) : options),
    [options, query],
  );
  const selected = options.find((o) => o.value === value);
  const optionId = (index: number) => `${listId}-${index}`;

  // Tetik düğmesinin ekrandaki konumuna göre paneli yerleştirir; altta yer yoksa yukarı açar.
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const up = below < 320 && rect.top > below;
    // Dar tetiklerde (ör. barkod türü) seçenek yazıları kesilmesin: en az 14rem, ekran içinde kal.
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
    setNewLabel('');
    setNewRate('');
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const closeList = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };
  const choose = (option: SelectOption) => {
    onChange(option.value);
    closeList(true);
  };

  // Açılınca arama kutusuna odaklan; dışarı tıklayınca kapat.
  useEffect(() => {
    if (!open) return;
    // Telefonda arama kutusuna otomatik odaklanmayız: ekran klavyesi listeyi kapatır.
    if (showSearch && !phone) searchRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    // Sayfa kayarken ya da pencere boyutu değişirken panel tetiğe yapışık kalsın.
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, showSearch, phone, place]);

  // Klavyeyle gezerken etkin satır görünür kalsın.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId yalnızca listId'ye bağlıdır
  }, [active, open]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    // "Yeni ekle" kutusunda yazarken ok tuşları listeyi gezmesin.
    if ((event.target as HTMLElement).dataset.creator) return;
    const last = visible.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        if (open && !showSearch) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (open && !showSearch) {
          event.preventDefault();
          setActive(last);
        }
        break;
      case 'Enter': {
        if (!open) break; // kapalıyken Enter düğmenin kendi tıklamasıyla açar
        event.preventDefault();
        const option = visible[active];
        if (option) choose(option);
        break;
      }
      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          closeList(true);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  // Oran (örn. KDV %) isteniyorsa: "10", "%10", "8,5" kabul edilir; 0-100 dışı geçersizdir.
  const parsedRate = parseRate(newRate);
  const canSubmit = newLabel.trim() !== '' && (!creator?.ratePlaceholder || parsedRate !== null);

  const submitNew = () => {
    const text = newLabel.trim();
    if (!creator || !canSubmit) return;
    creator.onCreate(text, parsedRate ?? undefined);
    closeList(true);
  };
  const onCreatorKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitNew();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeList(true);
    }
  };

  // role=presentation: klavye olayları yalnızca içteki combobox/arama kutusundan yukarı çıkanları yakalar.
  return (
    <div ref={rootRef} role="presentation" className="field" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? closeList() : openList())}
        className={`field-input flex items-center pr-11 text-left aria-expanded:border-brand-600 ${className}`}
      >
        {selected ? (
          <span className="truncate">{selected.label}</span>
        ) : (
          <span className="truncate text-ink-muted">Seçiniz</span>
        )}
      </button>
      <label htmlFor={triggerId} className="field-label" data-floated="true">
        {label}
      </label>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />

      {open && pos && portalTarget
        ? createPortal(
            <>
              {phone ? (
                <div aria-hidden="true" className="fixed inset-0 z-40 animate-fade-in bg-ink/40" />
              ) : null}
              <div
                ref={panelRef}
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
                {showSearch ? (
                  <div className="relative border-b border-line p-2">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-ink-muted"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(0);
                      }}
                      placeholder="Ara…"
                      aria-label={`${label} içinde ara`}
                      className="h-10 w-full rounded-xl bg-surface-muted pr-3 pl-9 text-sm text-ink outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-brand-600/40"
                    />
                  </div>
                ) : null}

                <ul
                  id={listId}
                  role="listbox"
                  aria-label={label}
                  tabIndex={-1}
                  aria-activedescendant={visible[active] ? optionId(active) : undefined}
                  className={`${phone ? 'max-h-[48dvh] min-h-0 flex-1' : 'max-h-60'} overflow-y-auto p-1.5`}
                >
                  {visible.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-ink-muted">Sonuç yok</li>
                  ) : (
                    visible.map((option, index) => {
                      const isSelected = option.value === value;
                      const canRemove = Boolean(onRemove) && option.removable === true;
                      return (
                        // Klavye ile seçim, odaktaki combobox tarafından (Enter + oklar) yapılır; satırın kendisi odaklanmaz.
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                        <li
                          key={option.value}
                          id={optionId(index)}
                          role="option"
                          aria-selected={isSelected}
                          onPointerEnter={() => setActive(index)}
                          onClick={() => choose(option)}
                          className={[
                            'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-base',
                            isSelected ? 'font-semibold text-brand-ink' : 'text-ink',
                            index === active ? 'bg-surface-muted' : '',
                            isSelected && index !== active ? 'bg-brand-50' : '',
                          ].join(' ')}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          {isSelected ? (
                            <Check className="size-4 shrink-0" aria-hidden="true" />
                          ) : null}
                          {canRemove ? (
                            <button
                              type="button"
                              aria-label={`${option.label} seçeneğini sil`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove?.(option.value);
                              }}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>

                {creator ? (
                  <div className="flex items-center gap-2 border-t border-line p-2">
                    <input
                      type="text"
                      data-creator="true"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={onCreatorKeyDown}
                      placeholder={creator.placeholder}
                      aria-label={creator.placeholder}
                      className="h-10 min-w-0 flex-1 rounded-xl bg-surface-muted px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-brand-600/40"
                    />
                    {creator.ratePlaceholder ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        data-creator="true"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        onKeyDown={onCreatorKeyDown}
                        placeholder="%"
                        aria-label={creator.ratePlaceholder}
                        className="h-10 w-20 shrink-0 rounded-xl bg-surface-muted px-3 text-right text-sm text-ink outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-brand-600/40"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={submitNew}
                      disabled={!canSubmit}
                      aria-label="Ekle"
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition-opacity disabled:opacity-40"
                    >
                      <Plus className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            </>,
            portalTarget,
          )
        : null}
    </div>
  );
}
