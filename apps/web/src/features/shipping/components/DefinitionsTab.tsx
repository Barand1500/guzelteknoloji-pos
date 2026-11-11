import { ListChecks, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { ShippingStore } from '../hooks/useShipping';
import { LIST_DEFS, type DefDraft, type DefItem, type ListKey } from '../types';

function ItemSheet({
  def,
  item,
  onSave,
  onClose,
}: {
  def: (typeof LIST_DEFS)[number];
  item: DefItem | null;
  onSave: (draft: DefDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DefDraft>({
    title: item?.title ?? '',
    short: item?.short ?? '',
    text: item?.text ?? '',
  });
  const [errors, setErrors] = useState<{ title?: string; short?: string }>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    const next: typeof errors = {};
    if (!draft.title.trim()) next.title = `${def.short ? 'Ad' : 'Başlık'} gerekli.`;
    if (def.short && !draft.short.trim()) next.short = 'Kısa ad gerekli.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setProblem(null);
    try {
      await onSave({ ...draft, title: draft.title.trim(), short: draft.short.trim() });
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      size="md"
      title={item ? `${def.one} Düzenle` : `${def.one} Ekle`}
    >
      <div className="flex flex-col gap-4">
        {problem ? <p role="alert" className="text-danger">{problem}</p> : null}
        <TextField
          label={def.short ? 'Adı' : 'Başlık'}
          value={draft.title}
          error={errors.title}
          maxLength={100}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        {def.short ? (
          <TextField
            label="Kısa Adı"
            value={draft.short}
            error={errors.short}
            maxLength={12}
            onChange={(e) => setDraft((d) => ({ ...d, short: e.target.value }))}
          />
        ) : (
          <TextAreaField
            label="Metin (isteğe bağlı)"
            rows={5}
            value={draft.text}
            maxLength={2000}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          />
        )}
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
 * Tanımlar. Referanstaki 7 ayrı sekme (Gönderi Tipleri, Kargo Tipleri, Alım Şekilleri, Teslimat Şekilleri,
 * Teslimat Modelleri, Ulaştırma Türleri, Yasak Kargolar) aynı iskeleti paylaştığı için tek yerde, hap
 * seçiciyle toplandı. Hepsi: ad/başlık + kısa ad ya da açıklama metni.
 */
export function DefinitionsTab({ store }: { store: ShippingStore }) {
  const [key, setKey] = useState<ListKey>('gonderi-tipleri');
  const def = LIST_DEFS.find((d) => d.key === key)!;
  const items = store.data?.lists[key] ?? [];
  const [sheet, setSheet] = useState<{ item: DefItem | null } | null>(null);
  const [deleting, setDeleting] = useState<DefItem | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction(`${def.one} Ekle`, () => setSheet({ item: null }));

  return (
    <div className="flex flex-col gap-4">
      {problem ? <p role="alert" className="text-danger">{problem}</p> : null}
      <div
        role="tablist"
        aria-label="Tanım listeleri"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
      >
        {LIST_DEFS.map((d) => {
          const on = d.key === key;
          const count = store.data?.lists[d.key].length ?? 0;
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setKey(d.key)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all duration-200 ${on ? 'border-brand-600 bg-brand-700 text-white shadow-soft' : 'border-field-border bg-surface text-ink-muted hover:border-brand-500 hover:text-ink'}`}
            >
              {d.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-white/20' : 'bg-surface-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
          <ListChecks className="size-8 text-brand-600/60" aria-hidden="true" />
          <p className="font-bold">Henüz {def.one.toLocaleLowerCase('tr')} yok</p>
          <button type="button" onClick={() => setSheet({ item: null })} className="font-bold text-brand-ink underline">
            {def.one} ekle
          </button>
        </div>
      ) : (
        <ul aria-label={def.label} className="grid grid-cols-[minmax(0,1fr)] gap-2.5 lg:grid-cols-2">
          {items.map((it, i) => (
            // Çift tık kısayoldur; kalem düğmesi aynı işi klavyeyle yapar.
             
            <li
              key={it.id}
              onDoubleClick={() => setSheet({ item: it })}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className="flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4 transition-colors hover:border-brand-500/40"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-extrabold">{it.title}</span>
                  {def.short && it.short ? (
                    <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-px text-[0.6875rem] font-bold text-brand-ink">
                      {it.short}
                    </span>
                  ) : null}
                </span>
                {!def.short ? (
                  <span className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
                    {it.text || 'Açıklama yok'}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                aria-label={`${it.title} düzenle`}
                onClick={() => setSheet({ item: it })}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`${it.title} sil`}
                onClick={() => setDeleting(it)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheet ? (
        <ItemSheet
          key={sheet.item?.id ?? 'yeni'}
          def={def}
          item={sheet.item}
          onSave={async (d) => {
            await store.saveItem(key, d, sheet.item?.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.title ?? ''} Silinsin Mi?`}
        description={`${def.one} silinecek.`}
        confirmLabel="Sil"
        onConfirm={() => {
          const it = deleting;
          setDeleting(null);
          if (it) void store.removeItem(key, it.id).catch((e: unknown) => setProblem(dataError(e)));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
