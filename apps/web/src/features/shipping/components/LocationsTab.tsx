import { ChevronRight, Home, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { ShippingStore } from '../hooks/useShipping';
import { LOCATION_LEVELS, LOCATION_PLURAL, type LocationNode } from '../types';

const fold = (s: string) => s.toLocaleLowerCase('tr');

function NameSheet({
  title,
  label,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  label: string;
  initial: string;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setError('Ad gerekli.');
    setSaving(true);
    try {
      await onSave(name.trim());
    } catch (e) {
      setError(dataError(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet permission="save" open onClose={onClose} size="md" title={title}>
      <div className="flex flex-col gap-4">
        <TextField
          label={label}
          value={name}
          error={error}
          maxLength={80}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
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
 * Lokasyonlar. Referanstaki 5 açılır kutu + 6 "Ekle" düğmesi yerine adım adım iniş: üstte yol (Ülkeler ›
 * Türkiye › Adana), altında o düzeydeki kayıtlar. Bir kayda basınca bir alt düzeye inilir; alttaki "+" o düzeye
 * (İl, İlçe, Semt…) ekler.
 */
export function LocationsTab({ store }: { store: ShippingStore }) {
  const all = useMemo(() => store.data?.locations ?? [], [store.data]);
  const [path, setPath] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<{ node: LocationNode | null } | null>(null);
  const [deleting, setDeleting] = useState<LocationNode | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const level = path.length;
  const parentId = path[level - 1] ?? null;
  const one = LOCATION_LEVELS[level] ?? LOCATION_LEVELS[5];
  usePublishAddAction(`${one} Ekle`, () => setSheet({ node: null }));

  const byId = useMemo(() => new Map(all.map((l) => [l.id, l])), [all]);
  const childCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of all) if (l.parentId) m.set(l.parentId, (m.get(l.parentId) ?? 0) + 1);
    return m;
  }, [all]);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return all
      .filter((l) => l.parentId === parentId)
      .filter((l) => !q || fold(l.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [all, parentId, query]);

  const go = (nextPath: string[]) => {
    setPath(nextPath);
    setQuery('');
  };
  const crumbs = path.map((id) => byId.get(id)?.name ?? '?');
  const next = LOCATION_LEVELS[level + 1];

  return (
    <div className="flex flex-col gap-3">
      {problem ? <p role="alert" className="text-danger">{problem}</p> : null}

      {/* Yol */}
      <nav aria-label="Konum yolu" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => go([])}
          aria-current={level === 0 ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors ${level === 0 ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'}`}
        >
          <Home className="size-4" aria-hidden="true" />
          Ülkeler
        </button>
        {crumbs.map((name, i) => (
          <span key={path[i]} className="inline-flex items-center gap-1.5">
            <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            <button
              type="button"
              onClick={() => go(path.slice(0, i + 1))}
              aria-current={i === crumbs.length - 1 ? 'page' : undefined}
              className={`min-h-10 rounded-full px-3.5 text-sm font-bold transition-colors ${i === crumbs.length - 1 ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'}`}
            >
              {name}
            </button>
          </span>
        ))}
      </nav>

      <div>
        <h2 className="text-xl font-extrabold tracking-tight">{LOCATION_PLURAL[level]}</h2>
        <p className="text-sm text-ink-muted">
          {next ? `Bir ${one.toLocaleLowerCase('tr')} seçince altındaki ${LOCATION_PLURAL[level + 1]!.toLocaleLowerCase('tr')} açılır.` : 'En alt düzey.'}
        </p>
      </div>

      <SearchField value={query} onChange={setQuery} label={`${one} ara`} placeholder={`${one} ara…`} />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
          <MapPin className="size-8 text-brand-600/60" aria-hidden="true" />
          <p className="font-bold">{query ? 'Aramaya uyan kayıt yok' : `Henüz ${one.toLocaleLowerCase('tr')} yok`}</p>
          {query ? null : (
            <button type="button" onClick={() => setSheet({ node: null })} className="font-bold text-brand-ink underline">
              {one} ekle
            </button>
          )}
        </div>
      ) : (
        <ul aria-label={LOCATION_PLURAL[level]} className="flex flex-col gap-2">
          {rows.map((n, i) => {
            const count = childCount.get(n.id) ?? 0;
            const deeper = n.level < 5;
            return (
              <li
                key={n.id}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                className="flex animate-rise-in items-center gap-1 rounded-2xl border border-line bg-surface-raised pr-2 transition-colors hover:border-brand-500/40"
              >
                <button
                  type="button"
                  disabled={!deeper}
                  onClick={() => go([...path, n.id])}
                  aria-label={deeper ? `${n.name} içine gir` : n.name}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 text-left disabled:cursor-default"
                >
                  <span className="min-w-0 flex-1 truncate font-bold">{n.name}</span>
                  {deeper ? (
                    <span className="shrink-0 text-sm text-ink-muted">
                      {count} {LOCATION_LEVELS[n.level + 1]}
                    </span>
                  ) : null}
                  {deeper ? <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" /> : null}
                </button>
                <button
                  type="button"
                  aria-label={`${n.name} adını düzenle`}
                  onClick={() => setSheet({ node: n })}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${n.name} sil`}
                  onClick={() => setDeleting(n)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {sheet ? (
        <NameSheet
          title={sheet.node ? `${LOCATION_LEVELS[sheet.node.level]} Adını Düzenle` : `${one} Ekle`}
          label={`${sheet.node ? LOCATION_LEVELS[sheet.node.level] : one} adı`}
          initial={sheet.node?.name ?? ''}
          onSave={async (name) => {
            if (sheet.node) await store.renameLocation(sheet.node.id, name);
            else await store.addLocation(parentId, name);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description={
          deleting && (childCount.get(deleting.id) ?? 0) > 0
            ? 'Altındaki tüm kayıtlar da silinecek.'
            : 'Bu kayıt silinecek.'
        }
        confirmLabel="Sil"
        onConfirm={() => {
          const n = deleting;
          setDeleting(null);
          if (n) void store.removeLocation(n.id).catch((e: unknown) => setProblem(dataError(e)));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
