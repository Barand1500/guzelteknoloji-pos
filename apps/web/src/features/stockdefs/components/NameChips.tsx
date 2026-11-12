import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { StockDefsStore } from '../hooks/useStockDefs';
import type { DefList, NameItem } from '../types';

/** Yazı kutusu etiketi: Enter kaydeder, Esc vazgeçer, kutudan çıkmak da kaydeder (boşsa vazgeçer). */
function ChipInput({
  initial,
  label,
  placeholder,
  onDone,
}: {
  initial: string;
  label: string;
  placeholder: string;
  onDone: (value: string | null) => void;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    onDone(save && text.trim() ? text.trim() : null);
  };
  return (
    <input
      ref={ref}
      aria-label={label}
      value={text}
      placeholder={placeholder}
      maxLength={60}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
      onBlur={() => finish(true)}
      className="h-12 w-44 animate-fade-in rounded-2xl border border-brand-600 bg-surface px-4 text-lg font-bold outline-none"
    />
  );
}

/**
 * Cari Tipleri / Stok Tipleri: kısa adlı basit listeler için yazı etiketleri. Etikete basınca adı yerinde değişir,
 * ✕ siler (onay sorar), "+ Ekle" etiketi (ve alttaki "+") yeni ad yazdırır.
 */
export function NameChips({
  list,
  store,
  items,
  noun,
  hint,
}: {
  list: DefList;
  store: StockDefsStore;
  items: NameItem[];
  /** "Cari Tipi" */
  noun: string;
  hint: string;
}) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<NameItem | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction(`${noun} Ekle`, () => setAdding(true));

  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setProblem(dataError(e)));

  return (
    <section aria-label={noun + ' listesi'} className="rounded-[2rem] border border-line bg-surface-raised p-5 sm:p-6">
      <p className="text-ink-muted">{hint}</p>
      {problem ? (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      <ul aria-label={noun + ' etiketleri'} className="mt-4 flex flex-wrap items-center gap-2.5">
        {items.map((it, i) => (
          <li
            key={it.id}
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            className="animate-rise-in"
          >
            {editId === it.id ? (
              <ChipInput
                initial={it.name}
                label={`${it.name} yeni adı`}
                placeholder={noun}
                onDone={(v) => {
                  setEditId(null);
                  if (v && v !== it.name) void run(store.saveName(list, { name: v, shortName: it.shortName }, it.id));
                }}
              />
            ) : (
              <span className="group inline-flex h-12 items-center rounded-2xl bg-brand-50 pr-1.5 text-lg font-extrabold text-brand-ink">
                <button
                  type="button"
                  aria-label={`${it.name} adını değiştir`}
                  title="Adı değiştirmek için basın"
                  onClick={() => setEditId(it.id)}
                  className="h-full rounded-l-2xl pr-2 pl-4 hover:bg-brand-100/60"
                >
                  {it.name}
                </button>
                <button
                  type="button"
                  aria-label={`${it.name} sil`}
                  onClick={() => setDeleting(it)}
                  className="flex size-8 items-center justify-center rounded-full text-brand-ink/60 transition-colors hover:bg-brand-700 hover:text-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </span>
            )}
          </li>
        ))}
        <li>
          {adding ? (
            <ChipInput
              initial=""
              label={`Yeni ${noun.toLocaleLowerCase('tr')} adı`}
              placeholder={`Yeni ${noun.toLocaleLowerCase('tr')}…`}
              onDone={(v) => {
                setAdding(false);
                if (v) void run(store.saveName(list, { name: v, shortName: '' }));
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-12 items-center gap-1.5 rounded-2xl border border-dashed border-brand-500/60 px-4 font-bold text-brand-ink transition-colors hover:bg-brand-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              Ekle
            </button>
          )}
        </li>
      </ul>
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description={`${noun} silinecek.`}
        confirmLabel="Sil"
        onConfirm={() => {
          const d = deleting;
          setDeleting(null);
          if (d) void run(store.removeName(list, d.id));
        }}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
}
