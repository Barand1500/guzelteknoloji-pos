import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { LOCATION_LEVELS, type LocationNode } from '../types';

type Mode = 'country' | 'tiered';

/**
 * Lokasyon ekle. Üstte küçük, altı çizgili tek seçim: "Ülke" (doğrudan ülke adı) ya da "Seviyeli" (İl,
 * İlçe, Semt, Mahalle, Sokak). Seviyeli seçilince seviye seçilir ve üst konumlar (Ülke › İl › …) aramalı
 * listelerle seçilir; bulunulan konumdan geldiyse hazır doludur.
 */
export function AddLocationSheet({
  nodes,
  path,
  onSave,
  onClose,
}: {
  nodes: LocationNode[];
  /** Bulunulan konumun yolu (üst konumlar bununla doldurulur). */
  path: string[];
  onSave: (parentId: string | null, name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(path.length === 0 ? 'country' : 'tiered');
  const [level, setLevel] = useState(Math.min(Math.max(path.length, 1), 5));
  const [anc, setAnc] = useState<string[]>(() => Array.from({ length: 5 }, (_, i) => path[i] ?? ''));
  const [name, setName] = useState('');
  const [error, setError] = useState<{ name?: string; parents?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const target = mode === 'country' ? 0 : level;
  const options = useMemo(
    () =>
      (k: number) =>
        nodes
          .filter((n) => n.level === k && (k === 0 || n.parentId === anc[k - 1]))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          .map((n) => ({ value: n.id, label: n.name })),
    [nodes, anc],
  );

  const pick = (k: number, id: string) => {
    setError({});
    setAnc((a) => a.map((v, i) => (i === k ? id : i > k ? '' : v)));
  };

  const submit = async () => {
    const next: typeof error = {};
    if (!name.trim()) next.name = `${LOCATION_LEVELS[target]} adı gerekli.`;
    if (mode === 'tiered' && anc.slice(0, level).some((v) => !v)) next.parents = 'Üst konumları seçin.';
    setError(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave(mode === 'country' ? null : anc[level - 1]!, name.trim());
    } catch (e) {
      setError({ save: dataError(e) });
    } finally {
      setSaving(false);
    }
  };

  const tab = (m: Mode, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      onClick={() => {
        setMode(m);
        setError({});
      }}
      className={`border-b-2 pb-0.5 text-sm font-bold transition-colors ${mode === m ? 'border-brand-600 text-brand-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
    >
      {text}
    </button>
  );

  return (
    <Sheet permission="save" open onClose={onClose} size="md" title="Lokasyon Ekle">
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Ne eklenecek" className="flex items-center gap-3">
          {tab('country', 'Ülke')}
          <span className="text-ink-muted" aria-hidden="true">
            ·
          </span>
          {tab('tiered', 'Seviyeli')}
        </div>

        {mode === 'tiered' ? (
          <div className="flex animate-fade-in flex-col gap-4">
            <SelectField
              label="Seviye"
              options={LOCATION_LEVELS.slice(1).map((l, i) => ({ value: String(i + 1), label: l }))}
              value={String(level)}
              onChange={(v) => setLevel(Number(v))}
            />
            {Array.from({ length: level }, (_, k) => (
              <SelectField
                key={k}
                label={LOCATION_LEVELS[k]!}
                options={options(k)}
                value={anc[k] ?? ''}
                onChange={(v) => pick(k, v)}
                searchable
              />
            ))}
            {error.parents ? (
              <p role="alert" className="text-sm text-danger">
                {error.parents}
              </p>
            ) : null}
          </div>
        ) : null}

        <TextField
          label={`${LOCATION_LEVELS[target]} adı`}
          value={name}
          error={error.name}
          maxLength={80}
          onChange={(e) => {
            setName(e.target.value);
            setError({});
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        {error.save ? (
          <p role="alert" className="text-sm text-danger">
            {error.save}
          </p>
        ) : null}
        <div className="flex gap-3 border-t border-line pt-4">
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
          <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void submit()}>
            Kaydet
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
