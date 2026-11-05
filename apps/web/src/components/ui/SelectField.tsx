import { Check, ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import {
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
  /** Kullanıcı listenin altına yeni bir ad yazıp onayladığında çağrılır. */
  onCreate: (label: string) => void;
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
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > 7;
  const visible = useMemo(
    () => (query ? options.filter((o) => fold(o.label).includes(fold(query))) : options),
    [options, query],
  );
  const selected = options.find((o) => o.value === value);
  const optionId = (index: number) => `${listId}-${index}`;

  const openList = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < 320 && rect.top > below);
    }
    setQuery('');
    setNewLabel('');
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
    if (showSearch) searchRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, showSearch]);

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

  const submitNew = () => {
    const text = newLabel.trim();
    if (!text || !creator) return;
    creator.onCreate(text);
    closeList(true);
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

      {open ? (
        <div
          className={[
            'absolute right-0 left-0 z-40 animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-card',
            openUp ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
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
            className="max-h-60 overflow-y-auto p-1.5"
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
                    {isSelected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitNew();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    closeList(true);
                  }
                }}
                placeholder={creator.placeholder}
                aria-label={creator.placeholder}
                className="h-10 min-w-0 flex-1 rounded-xl bg-surface-muted px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-brand-600/40"
              />
              <button
                type="button"
                onClick={submitNew}
                disabled={newLabel.trim() === ''}
                aria-label="Ekle"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition-opacity disabled:opacity-40"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
