import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { StockDefsStore } from '../hooks/useStockDefs';
import { READY_UNITS, type NameDraft, type NameItem } from '../types';

function UnitSheet({
  unit,
  onSave,
  onClose,
}: {
  unit: NameItem | null;
  onSave: (draft: NameDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(unit?.name ?? '');
  const [short, setShort] = useState(unit?.shortName ?? '');
  const [errors, setErrors] = useState<{ name?: string; short?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Ad gerekli.';
    if (!short.trim()) next.short = 'Kısa ad gerekli.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim().toLocaleUpperCase('tr'), shortName: short.trim().toLocaleUpperCase('tr') });
    } catch (e) {
      setErrors({ save: dataError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet permission="save" open onClose={onClose} size="md" title={unit ? 'Ölçü Birimini Düzenle' : 'Ölçü Birimi Ekle'}>
      <div className="flex flex-col gap-4">
        {errors.save ? (
          <p role="alert" className="text-danger">
            {errors.save}
          </p>
        ) : null}
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <TextField label="Adı" value={name} error={errors.name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Kısa Adı"
            value={short}
            error={errors.short}
            maxLength={6}
            onChange={(e) => setShort(e.target.value.toUpperCase())}
          />
        </div>
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

/**
 * Ölçü Birimleri: ürünlerin birimi (ADET, KOLİ, KG…). Üstte hazır birimler tek dokunuşla eklenir (listede olmayanlar
 * görünür); kendi biriminiz için alttaki "+" ad ve kısa ad sorar.
 */
export function UnitsTab({ store }: { store: StockDefsStore }) {
  const units = store.data?.units ?? [];
  const [sheet, setSheet] = useState<{ unit: NameItem | null } | null>(null);
  const [deleting, setDeleting] = useState<NameItem | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction('Ölçü Birimi Ekle', () => setSheet({ unit: null }));

  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setProblem(dataError(e)));
  const have = new Set(units.map((u) => u.name.toLocaleUpperCase('tr')));
  const ready = READY_UNITS.filter((r) => !have.has(r.name));

  return (
    <div className="flex flex-col gap-4">
      {problem ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
          {problem}
        </p>
      ) : null}

      {ready.length > 0 ? (
        <section aria-label="Hazır birimler" className="flex flex-col gap-2">
          <p className="text-sm font-extrabold tracking-wider text-ink-muted uppercase">Tek dokunuşla ekle</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {ready.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => void run(store.saveName('olcu-birimleri', { name: r.name, shortName: r.shortName }))}
                aria-label={`${r.name} ekle`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-brand-500/60 px-4 font-bold text-brand-ink transition-colors hover:bg-brand-50"
              >
                <Plus className="size-4" aria-hidden="true" />
                {r.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <ul aria-label="Ölçü birimleri" className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
        {units.length === 0 ? (
          <li className="px-4 py-10 text-center text-ink-muted">Henüz ölçü birimi yok. Yukarıdan seçebilirsiniz.</li>
        ) : (
          units.map((u, i) => (
            <li key={u.id} className={`flex min-h-14 items-center gap-3 px-4 ${i > 0 ? 'border-t border-line' : ''}`}>
              <span className="min-w-0 flex-1 truncate font-bold">{u.name}</span>
              {u.shortName !== u.name ? (
                <span className="shrink-0 rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-extrabold text-brand-ink">
                  {u.shortName}
                </span>
              ) : null}
              <button
                type="button"
                aria-label={`${u.name} düzenle`}
                onClick={() => setSheet({ unit: u })}
                className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`${u.name} sil`}
                onClick={() => setDeleting(u)}
                className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))
        )}
      </ul>

      {sheet ? (
        <UnitSheet
          unit={sheet.unit}
          onSave={async (d) => {
            await store.saveName('olcu-birimleri', d, sheet.unit?.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Ölçü birimi silinecek; ürünlerde kullanılıyorsa sunucu silmeyi reddedebilir."
        confirmLabel="Sil"
        onConfirm={() => {
          const d = deleting;
          setDeleting(null);
          if (d) void run(store.removeName('olcu-birimleri', d.id));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
