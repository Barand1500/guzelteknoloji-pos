import { Landmark, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { TaxStore } from '../hooks/useTaxes';
import { letterOf, type TaxOffice } from '../types';
import { TaxOfficeSheet } from './TaxSheets';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Vergi Daireleri: yüzlerce kayıt olabildiği için üstte arama ve A–Z harf süzgeci (yalnızca listede olan harfler),
 * altta sayfalama var. Hem harf hem arama birlikte çalışır.
 */
export function OfficesTab({ store }: { store: TaxStore }) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const [sheet, setSheet] = useState<{ office: TaxOffice | null } | null>(null);
  const [deleting, setDeleting] = useState<TaxOffice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction('Vergi Dairesi Ekle', () => setSheet({ office: null }));

  const letters = useMemo(
    () => [...new Set(store.offices.map((o) => letterOf(o.name)))].sort((a, b) => a.localeCompare(b, 'tr')),
    [store.offices],
  );
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return store.offices
      .filter((o) => !letter || letterOf(o.name) === letter)
      .filter((o) => !q || fold(o.name).includes(q))
      .sort((a, b) => Number(b.builtin) - Number(a.builtin) || a.name.localeCompare(b.name, 'tr'));
  }, [store.offices, query, letter]);

  const size = Math.max(1, Number(sizeText) || 10);
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * size, current * size);

  const chip = (on: boolean) =>
    `inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-extrabold transition-colors ${on ? 'border-brand-600 bg-brand-700 text-white' : 'border-field-border bg-surface text-ink-muted hover:border-brand-500 hover:text-ink'}`;

  return (
    <div className="flex flex-col gap-3">
      {problem ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      <SearchField
        value={query}
        onChange={(t) => {
          setQuery(t);
          setPage(1);
        }}
        label="Vergi dairesi ara"
        placeholder={`${store.offices.length.toLocaleString('tr-TR')} vergi dairesinde ara…`}
      />
      <div
        role="group"
        aria-label="Harf süzgeci"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
      >
        <button type="button" aria-pressed={letter === null} onClick={() => { setLetter(null); setPage(1); }} className={chip(letter === null)}>
          Tümü
        </button>
        {letters.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={letter === l}
            onClick={() => {
              setLetter(letter === l ? null : l);
              setPage(1);
            }}
            className={chip(letter === l)}
          >
            {l}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
          <Landmark className="size-8 text-brand-600/60" aria-hidden="true" />
          <p className="font-bold">Aramaya uyan vergi dairesi yok</p>
        </div>
      ) : (
        <ul aria-label="Vergi daireleri" className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
          {rows.map((o, i) => (
            <li
              key={o.id}
              className={`flex min-h-14 items-center gap-3 px-4 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-ink">
                {letterOf(o.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold">{o.name}</span>
              {o.builtin ? (
                <span className="shrink-0 rounded-md bg-surface-muted px-1.5 py-px text-[0.6875rem] font-bold text-ink-muted">
                  Varsayılan
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label={`${o.name} düzenle`}
                    onClick={() => setSheet({ office: o })}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${o.name} sil`}
                    onClick={() => setDeleting(o)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <PaginationBar
        total={filtered.length}
        from={filtered.length === 0 ? 0 : (current - 1) * size + 1}
        to={Math.min(filtered.length, current * size)}
        page={current}
        pageCount={pageCount}
        onPageChange={setPage}
        sizeText={sizeText}
        onSizeTextChange={(t) => {
          setSizeText(t);
          setPage(1);
        }}
        noun="vergi dairesi"
      />

      {sheet ? (
        <TaxOfficeSheet
          office={sheet.office}
          onSave={async (name) => {
            await store.saveOffice(name, sheet.office?.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Vergi dairesi silinir."
        confirmLabel="Sil"
        onConfirm={() => {
          const o = deleting;
          setDeleting(null);
          if (o) void store.removeOffice(o.id).catch((e: unknown) => setProblem(dataError(e)));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
