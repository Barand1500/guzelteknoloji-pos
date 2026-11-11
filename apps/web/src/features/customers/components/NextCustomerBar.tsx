import { ArrowRight, Eye } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { formatMoney } from '../../home/components/parts';
import { balanceOf, type Customer } from '../types';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * "Sonraki müşteri" çubuğu (stok kartındaki "Sonraki ürün" ile aynı mantık): altı çizgili kutu
 * sıradaki müşterinin adını gösterir; yazınca liste açılır. Göz simgesinin üstüne gelince önizleme
 * çıkar, ok düğmesi o müşteriye geçirir.
 */
export function NextCustomerBar({
  customers,
  currentId,
  onGo,
}: {
  customers: Customer[];
  currentId: string;
  onGo: (id: string) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  const index = customers.findIndex((c) => c.id === currentId);
  const nextId = index >= 0 ? (customers[index + 1]?.id ?? null) : null;
  const targetId = chosenId ?? nextId;
  const target = customers.find((c) => c.id === targetId) ?? null;

  const options = useMemo(() => {
    const q = fold(query.trim());
    return customers
      .filter((c) => c.id !== currentId)
      .filter((c) => q === '' || fold(c.name).includes(q) || fold(c.email).includes(q))
      .slice(0, 8);
  }, [customers, query, currentId]);

  if (index < 0) return null;

  const pick = (c: Customer) => {
    setChosenId(c.id);
    setQuery('');
    setTyping(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setTyping(true);
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = typing ? options[highlight] : undefined;
      if (chosen) pick(chosen);
      else if (targetId) onGo(targetId);
    } else if (event.key === 'Escape' && typing) {
      event.preventDefault();
      setTyping(false);
      setQuery('');
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
        <input
          role="combobox"
          aria-expanded={typing}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Sonraki müşteri"
          autoComplete="off"
          placeholder="Müşteri ara…"
          value={typing ? query : (target?.name ?? '')}
          onFocus={() => {
            setTyping(true);
            setHighlight(0);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setTyping(false);
              setQuery('');
            }, 120);
          }}
          onChange={(e) => {
            setTyping(true);
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          className="w-full truncate border-0 border-b-2 border-line bg-transparent px-1 py-1.5 text-sm font-semibold text-ink transition-colors outline-none placeholder:font-normal placeholder:text-ink-muted hover:border-brand-500 focus:border-brand-600"
        />
        {typing ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Müşteriler"
            className="absolute top-full right-0 left-0 z-40 mt-1 max-h-72 min-w-56 overflow-y-auto rounded-2xl border border-line bg-surface-raised p-1 shadow-card"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-muted">Eşleşen müşteri yok.</li>
            ) : (
              options.map((c, i) => (
                // Seçim giriş kutusunda yapılır (ok tuşları + Enter); seçenekler odak almaz.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={c.id}
                  role="option"
                  aria-selected={i === highlight}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`cursor-pointer rounded-xl px-3 py-2 ${i === highlight ? 'bg-brand-50' : ''}`}
                >
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{c.email}</span>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <span className="group/eye relative">
        <button
          type="button"
          aria-label="Müşteri önizlemesi"
          disabled={!target}
          className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:bg-surface-muted disabled:opacity-40"
        >
          <Eye className="size-5" aria-hidden="true" />
        </button>
        {target ? (
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full right-0 z-40 mt-2 hidden w-64 flex-col gap-1 rounded-3xl border border-line bg-surface-raised p-3 shadow-card group-focus-within/eye:flex group-hover/eye:flex"
          >
            <span className="text-sm leading-snug font-bold">{target.name}</span>
            <span className="text-xs text-ink-muted">{target.phone}</span>
            <span className="truncate text-xs text-ink-muted">{target.email}</span>
            <span className="mt-1 flex items-center justify-between gap-2 text-sm font-extrabold">
              {target.priceList}
              <span>
                {balanceOf(target) === 0
                  ? 'Bakiye yok'
                  : formatMoney(Math.abs(balanceOf(target)))}
              </span>
            </span>
          </span>
        ) : null}
      </span>

      <button
        type="button"
        onClick={() => targetId && onGo(targetId)}
        disabled={!targetId}
        aria-label="Sonraki müşteriye geç"
        title={targetId ? 'Sonraki müşteriye geç' : 'Son müşteri'}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition-transform active:scale-95 disabled:opacity-40"
      >
        <ArrowRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
