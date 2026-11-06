import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ValueKind } from '../types';

interface QuickAddBarProps {
  kind: ValueKind;
  /** Yazıyı ekler; hata varsa (aynı ad vb.) mesaj döndürür. */
  onAdd: (name: string, color: string | null) => string | null;
  /** Resimli gruplarda hızlı giriş yoktur; resim yüklemek için form açılır. */
  onOpenForm: () => void;
}

/**
 * Hızlı giriş: adı yaz, Enter'a bas, eklendi (kutu açık kalır, arka arkaya girilir). Renkli
 * gruplarda yanında renk seçici vardır. Resimli gruplarda resim gerektiği için form açılır.
 */
export function QuickAddBar({ kind, onAdd, onOpenForm }: QuickAddBarProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#4f5380');
  const [error, setError] = useState<string | null>(null);

  if (kind === 'image') {
    return (
      <button
        type="button"
        onClick={onOpenForm}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-field-border text-base font-semibold text-brand-ink transition-colors hover:border-brand-500 hover:bg-brand-50"
      >
        <Plus className="size-5" aria-hidden="true" />
        Resimli Özellik Ekle
      </button>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = text.trim();
    if (name === '') {
      setError('Önce özelliğin adını yazın.');
      return;
    }
    const problem = onAdd(name, kind === 'color' ? color : null);
    if (problem) {
      setError(problem);
      return;
    }
    setText('');
    setError(null);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-brand-600/70 bg-surface-raised p-1.5 pl-4 transition-colors focus-within:border-brand-600">
        {kind === 'color' ? (
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Yeni özelliğin rengi"
            className="size-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          />
        ) : null}
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          aria-label="Yeni özellik adı"
          placeholder={kind === 'color' ? 'Yeni renk yaz…' : "Yeni özellik yaz, Enter'a bas…"}
          maxLength={80}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-800 active:bg-brand-900"
        >
          <Plus className="size-4" aria-hidden="true" />
          Ekle
        </button>
      </div>
      {error ? (
        <p role="alert" className="px-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
