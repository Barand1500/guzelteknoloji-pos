import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { COLOR_PALETTE, nearestColorName } from '../color-names';
import type { ValueKind } from '../types';

interface QuickAddBarProps {
  kind: ValueKind;
  /** Adları ekler (virgülle ayrılmış her ad ayrı özellik); hata varsa mesaj döndürür. */
  onAdd: (names: string[], color: string | null) => Promise<string | null>;
  /** Resimli gruplarda hızlı giriş yoktur; resim yüklemek için form açılır. */
  onOpenForm: () => void;
}

/** "S, M, L ,xl" → ["S", "M", "L", "xl"] (boşlar ve tekrarlar atılır). */
export function splitNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const name = part.trim();
    const key = name.toLocaleLowerCase('tr');
    if (name === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Hızlı giriş: adı yaz, Enter'a bas, eklendi (kutu açık kalır). Virgülle ayrılan her ad ayrı
 * özellik olur ("S, M, L, XL"). Renkli gruplarda hazır renk paleti vardır; renk seçilince adı boşsa
 * en yakın renk adı kendiliğinden yazılır. Resimli gruplarda resim gerektiği için form açılır.
 */
export function QuickAddBar({ kind, onAdd, onOpenForm }: QuickAddBarProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#4f5380');
  // Son otomatik yazılan ad: kullanıcı elle değiştirmediyse yeni renk seçilince güncellenir.
  const [autoName, setAutoName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const pick = (hex: string, name: string) => {
    setColor(hex);
    if (text.trim() === '' || text === autoName) {
      setText(name);
      setAutoName(name);
    }
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const names = splitNames(text);
    if (names.length === 0) {
      setError('Önce özelliğin adını yazın.');
      return;
    }
    setBusy(true);
    const problem = await onAdd(names, kind === 'color' ? color : null);
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    setText('');
    setAutoName('');
    setError(null);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-brand-600/70 bg-surface-raised p-1.5 pl-4 transition-colors focus-within:border-brand-600">
        {kind === 'color' ? (
          <input
            type="color"
            value={color}
            onChange={(e) => pick(e.target.value, nearestColorName(e.target.value))}
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
          placeholder={
            kind === 'color' ? 'Yeni renk yaz…' : 'Yeni özellik yaz (S, M, L gibi virgülle çoğalt)…'
          }
          maxLength={400}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-800 active:bg-brand-900"
        >
          <Plus className="size-4" aria-hidden="true" />
          Ekle
        </button>
      </div>
      {kind === 'color' ? (
        <div role="group" aria-label="Hazır renkler" className="flex flex-wrap gap-2 px-1">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => pick(c.hex, c.name)}
              aria-label={`Renk ${c.name}`}
              aria-pressed={color === c.hex}
              title={c.name}
              style={{ backgroundColor: c.hex }}
              className={[
                'size-8 rounded-full ring-1 ring-black/15 transition-transform',
                color === c.hex ? 'scale-110 outline-2 outline-offset-2 outline-brand-600' : '',
              ].join(' ')}
            />
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="px-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
