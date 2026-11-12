import { ArrowUpRight, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Segmented } from '../../../components/ui/Segmented';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { PRODUCTS_PATH } from '../../../config/navigation';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { StockDefsStore } from '../hooks/useStockDefs';
import { RangeCalendar } from './RangeCalendar';
import {
  formatDay,
  periodNote,
  periodProgress,
  periodState,
  type PriceList,
  type PriceListDraft,
  type PriceListKind,
} from '../types';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATE_LABEL = { always: 'Her zaman', upcoming: 'Yaklaşıyor', running: 'Devam ediyor', ended: 'Bitti' } as const;
const STATE_TONE = {
  always: 'bg-surface-muted text-ink-muted',
  upcoming: 'bg-accent-soft text-brand-800',
  running: 'bg-success-soft text-success',
  ended: 'bg-danger-soft text-danger',
} as const;

/** Fiyat listesi ekle/düzenle: ad, tip (Genel / Özel) ve özel listede başlangıç-bitiş tarihleri. */
function PriceListSheet({
  list,
  onSave,
  onClose,
}: {
  list: PriceList | null;
  onSave: (draft: PriceListDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(list?.name ?? '');
  const [kind, setKind] = useState<PriceListKind>(list?.kind ?? 'general');
  const [start, setStart] = useState(list?.start ?? '');
  const [end, setEnd] = useState(list?.end ?? '');
  const [errors, setErrors] = useState<{ name?: string; start?: string; end?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Ad gerekli.';
    if (kind === 'special') {
      if (!start) next.start = 'Başlangıç tarihi gerekli.';
      else if (!end) next.end = 'Bitiş tarihini de seçin.';
      else if (end < start) next.end = 'Bitiş, başlangıçtan önce olamaz.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim().toLocaleUpperCase('tr'),
        kind,
        start: kind === 'special' ? start : null,
        end: kind === 'special' ? end : null,
      });
    } catch (e) {
      setErrors({ save: dataError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet permission="save" open onClose={onClose} size="md" title={list ? 'Fiyat Listesini Düzenle' : 'Fiyat Listesi Ekle'}>
      <div className="flex flex-col gap-4">
        {errors.save ? (
          <p role="alert" className="text-danger">
            {errors.save}
          </p>
        ) : null}
        <TextField
          label="Adı"
          value={name}
          error={errors.name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
        <Segmented
          label="Liste tipi"
          value={kind}
          options={[
            { value: 'general', label: 'Genel (hep geçerli)' },
            { value: 'special', label: 'Özel (tarihli)' },
          ]}
          onChange={(v) => setKind(v as PriceListKind)}
        />
        {kind === 'special' ? (
          <div className="animate-fade-in">
            <RangeCalendar
              start={start}
              end={end}
              error={errors.start ?? errors.end}
              onChange={(a, b) => {
                setStart(a);
                setEnd(b);
              }}
            />
          </div>
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

/**
 * Fiyat Listeleri: her liste bir kart. Genel liste her zaman geçerlidir; özel liste tarih aralıklıdır ve kartta
 * "Yaklaşıyor / Devam ediyor / Bitti" ile geçen sürenin çubuğu görünür. Yıldız varsayılan listeyi seçer (tek).
 * "Ürünleri gör" Ürünler sayfasına gider (orada her ürünün fiyatı bu listelerin adıyla görünür).
 */
export function PriceListsTab({ store }: { store: StockDefsStore }) {
  const lists = store.data?.priceLists ?? [];
  const [sheet, setSheet] = useState<{ list: PriceList | null } | null>(null);
  const [deleting, setDeleting] = useState<PriceList | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const today = todayIso();
  usePublishAddAction('Fiyat Listesi Ekle', () => setSheet({ list: null }));

  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setProblem(dataError(e)));

  return (
    <div className="flex flex-col gap-3">
      {problem ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      <ul aria-label="Fiyat listeleri" className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        {lists.map((l, i) => {
          const state = periodState(l, today);
          const progress = periodProgress(l, today);
          return (
            <li
              key={l.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className={`animate-rise-in rounded-3xl border bg-surface-raised p-4 ${l.isDefault ? 'border-brand-500/50 ring-2 ring-brand-500/10' : 'border-line'}`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={l.isDefault ? `${l.name} varsayılan liste` : `${l.name} varsayılan yap`}
                  aria-pressed={l.isDefault}
                  disabled={l.isDefault}
                  onClick={() => void run(store.setDefaultPriceList(l.id))}
                  title={l.isDefault ? 'Varsayılan liste' : 'Varsayılan yap'}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${l.isDefault ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted hover:bg-brand-50 hover:text-brand-ink'}`}
                >
                  <Star className={`size-5 ${l.isDefault ? 'fill-current' : ''}`} aria-hidden="true" />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-lg leading-tight font-extrabold">{l.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATE_TONE[state]}`}>
                      {l.kind === 'general' ? 'Genel' : STATE_LABEL[state]}
                    </span>
                    {l.isDefault ? <span className="text-xs font-bold text-brand-ink">Varsayılan</span> : null}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`${l.name} düzenle`}
                  onClick={() => setSheet({ list: l })}
                  className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                {l.isDefault ? null : (
                  <button
                    type="button"
                    aria-label={`${l.name} sil`}
                    onClick={() => setDeleting(l)}
                    className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              {l.kind === 'special' && l.start && l.end ? (
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-semibold text-ink-muted">
                    <span>{formatDay(l.start)}</span>
                    <span>{formatDay(l.end)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${state === 'ended' ? 'bg-danger' : 'bg-success'}`}
                      style={{ width: `${progress ?? 0}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-right text-xs font-bold ${state === 'ended' ? 'text-danger' : 'text-ink-muted'}`}>
                    {periodNote(l, today)}
                  </p>
                </div>
              ) : null}
              <Link
                to={`${PRODUCTS_PATH}?liste=${encodeURIComponent(l.name)}`}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-50 px-4 text-sm font-bold text-brand-ink hover:bg-brand-100/60"
              >
                Ürünleri gör
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      {sheet ? (
        <PriceListSheet
          list={sheet.list}
          onSave={async (d) => {
            await store.savePriceList(d, sheet.list?.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Fiyat listesi ve ürünlerdeki bu listeye ait fiyatlar silinir."
        confirmLabel="Sil"
        onConfirm={() => {
          const d = deleting;
          setDeleting(null);
          if (d) void run(store.removePriceList(d.id));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
