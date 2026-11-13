import { useEffect, useState } from 'react';
import { siteService } from '../services/site.service';
import { dataError } from '../../../lib/catalog-data';
import { SelectField } from './SiteSelect';
import { SearchField } from '../../../components/ui/SearchField';
import { Alert } from '../../../components/ui/Alert';

type Option = { value: string; label: string };
export function WidgetDataPicker({
  type,
  ids,
  demo,
  onChange,
}: {
  type: 'urun' | 'kategori';
  ids: string;
  demo: boolean;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const chosen = ids.split(',').filter(Boolean);
  useEffect(() => {
    if (demo) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void siteService
        .widgetData(type, search)
        .then((rows) => {
          if (active) {
            setOptions(rows);
            setError(null);
          }
        })
        .catch((cause) => {
          if (active) {
            setOptions([]);
            setError(dataError(cause));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [type, search, demo]);
  useEffect(() => {
    if (demo || !ids) return;
    let active = true;
    void siteService
      .widgetData(type, '', ids)
      .then((rows) => {
        if (active) setSelected(rows);
      })
      .catch((cause) => {
        if (active) setError(dataError(cause));
      });
    return () => {
      active = false;
    };
  }, [type, ids, demo]);
  const label = type === 'urun' ? 'Ürün' : 'Kategori';
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <p className="text-sm font-bold">Veriler</p>
      <SearchField label={`${label} ara`} value={search} onChange={setSearch} />
      <SelectField
        label={`${label} Ekle`}
        searchable={false}
        value=""
        options={options.filter((option) => !chosen.includes(option.value))}
        onChange={(value) => {
          if (value && chosen.length < 50) onChange([...chosen, value].join(','));
        }}
      />
      {loading && <p className="text-xs text-ink-muted">Liste yükleniyor…</p>}
      {!loading && !options.length && !demo && !error && (
        <p className="text-xs text-ink-muted">Eşleşen kayıt yok.</p>
      )}
      <p className="text-xs text-ink-muted">
        En fazla 50 kayıt. Arama ilk 50 eşleşmeyi gösterir; seçilen sıra korunur.
      </p>
      <ol className="space-y-2">
        {chosen.map((id, index) => (
          <li
            key={id}
            className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-2 text-sm"
          >
            <span>
              {index + 1}.{' '}
              {[...selected, ...options].find((option) => option.value === id)?.label ??
                `${label} #${id}`}
            </span>
            <button
              type="button"
              className="min-h-10 px-3 text-danger"
              aria-label={`${label} ${id} kaldır`}
              onClick={() => onChange(chosen.filter((value) => value !== id).join(','))}
            >
              Kaldır
            </button>
          </li>
        ))}
      </ol>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
