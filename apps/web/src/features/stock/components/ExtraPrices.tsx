import { ChevronDown, ListPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { extraNet, formatMoney } from '../stock.calc';
import { uid } from '../stock.rules';
import type { ExtraPrice } from '../types';

interface ExtraPricesProps {
  /** "Alış" ya da "Satış". */
  title: string;
  items: ExtraPrice[];
  defaultCurrency: string;
  currencies: SelectOption[];
  onChange: (items: ExtraPrice[]) => void;
}

/**
 * Ana fiyata ek, açıklamalı fiyatlar (ör. "Bayi", "Kampanya"). Ayrı pencere açılmaz:
 * düğmeye basınca blok içinde katlanır. Açıklama + fiyat + iskonto + para birimi → Ekle.
 */
export function ExtraPrices({
  title,
  items,
  defaultCurrency,
  currencies,
  onChange,
}: ExtraPricesProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);

  const canAdd = amount.trim() !== '';
  const add = () => {
    if (!canAdd) return;
    onChange([...items, { id: uid(), note: note.trim(), amount, discount, currency }]);
    setNote('');
    setAmount('');
    setDiscount('');
  };

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-1 text-sm font-semibold text-brand-ink"
      >
        <ListPlus className="size-5" aria-hidden="true" />
        Ek {title} Fiyatları{items.length > 0 ? ` (${items.length})` : ''}
        <ChevronDown
          className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="mt-3 flex animate-fade-in flex-col gap-3">
          <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
            <div className="col-span-6 md:col-span-12">
              <TextField label="Açıklama" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="col-span-3 md:col-span-4">
              <TextField
                label="Fiyat"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
              />
            </div>
            <div className="col-span-3 md:col-span-3">
              <TextField
                label="İskonto (%)"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="col-span-3 md:col-span-3">
              <SelectField
                label="Para Birimi"
                options={currencies}
                value={currency}
                onChange={setCurrency}
              />
            </div>
            <button
              type="button"
              onClick={add}
              disabled={!canAdd}
              className="col-span-3 min-h-14 rounded-control bg-brand-700 px-4 text-base font-semibold text-white transition-opacity disabled:opacity-40 md:col-span-2"
            >
              Ekle
            </button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
              Henüz ek fiyat yok.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label={`Ek ${title.toLowerCase()} fiyatları`}>
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2 text-sm"
                >
                  <span className="w-5 shrink-0 text-ink-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {item.note || 'Açıklamasız'}
                  </span>
                  {item.discount ? (
                    <span className="shrink-0 text-ink-muted">%{item.discount}</span>
                  ) : null}
                  <span className="shrink-0 font-bold">
                    {formatMoney(extraNet(item.amount, item.discount), item.currency)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${item.note || 'Ek fiyat'} sil`}
                    onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
