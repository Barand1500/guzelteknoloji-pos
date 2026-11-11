import { Download, Pencil, Trash2, Truck, Percent } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePublishAddAction, usePublishSaveAction } from '../../app-shell/save-action';
import { useBrands } from '../../brands/hooks/useBrands';
import { useCategories } from '../../categories/hooks/useCategories';
import { SampleNote } from '../../orders/components/parts';
import { useCampaign } from '../hooks/useCampaign';
import {
  CAMPAIGN_SLUG,
  summarize,
  type CampaignKind,
  type CampaignRule,
  type GeneralRule,
} from '../types';
import { GeneralCard } from './GeneralCard';
import { RuleWizardSheet } from './RuleWizardSheet';

const fold = (s: string) => s.toLocaleLowerCase('tr');

function rulesToCsv(rules: CampaignRule[], kind: CampaignKind, names: (r: CampaignRule) => [string, string]) {
  const head = ['Kategoriler', 'Markalar', 'Cari Tipleri', 'Fiyat Listeleri', 'X Tutar Üzeri', 'Kural', 'Durum'];
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rules.map((r) => {
    const [cats, brands] = names(r);
    return [
      cats,
      brands,
      r.customerTypes.join(', ') || 'Hepsi',
      r.priceLists.join(', ') || 'Hepsi',
      String(r.minTotal),
      summarize(r, kind),
      r.active ? 'Aktif' : 'Pasif',
    ]
      .map(cell)
      .join(';');
  });
  return '﻿' + [head.map(cell).join(';'), ...lines].join('\r\n');
}

/**
 * Kampanya sayfası (Sepet İndirimi / Ücretsiz Kargo). Üstte GENEL KURAL: tek bir cümle ("Sepet 5.000 ₺
 * ve üzerindeyse %5 indirim uygula"), altında kimlere ve kaydırınca sonucu gösteren "Dene" çubuğu.
 * Altta ÖZEL KURALLAR: kategori/markaya özel; kart listesi, açma-kapama anahtarı, çift tık düzenle.
 * Değişiklik varsa alttaki yüzen adada "Kaydet" çıkar; "+" yeni kural sihirbazını açar.
 */
export function CampaignPage({ kind }: { kind: CampaignKind }) {
  const store = useCampaign(kind);
  const { categories } = useCategories();
  const { brands } = useBrands();
  const [draft, setDraft] = useState<GeneralRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ rule: CampaignRule | null } | null>(null);
  const [deleting, setDeleting] = useState<CampaignRule | null>(null);
  const [query, setQuery] = useState('');
  const cart = kind === 'cart';
  const roomy = useMediaQuery('(min-width: 40rem)');

  const general = draft ?? store.data?.general ?? null;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(store.data?.general);

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      await store.saveGeneral(draft);
      setDraft(null);
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  usePublishSaveAction(dirty ? { onSave: () => void save(), saving } : null);
  usePublishAddAction('Kural Ekle', () => setWizard({ rule: null }));

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const brandName = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const namesOf = (r: CampaignRule): [string, string] => [
    r.categoryIds.map((id) => catName.get(id) ?? '?').join(', ') || 'Tüm kategoriler',
    r.brandIds.map((id) => brandName.get(id) ?? '?').join(', ') || 'Tüm markalar',
  ];

  const rules = useMemo(() => {
    const q = fold(query.trim());
    const all = store.data?.rules ?? [];
    if (!q) return all;
    return all.filter((r) => fold(`${namesOf(r).join(' ')} ${summarize(r, kind)}`).includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.data, query, catName, brandName]);

  const run = async (action: () => Promise<unknown>) => {
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem(dataError(e));
    }
  };

  const exportCsv = () => {
    if (typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(
      new Blob([rulesToCsv(rules, kind, (r) => namesOf(r))], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${CAMPAIGN_SLUG[kind]}-kurallari.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (store.error && !store.data) return <Alert tone="error">{store.error}</Alert>;
  if (!general)
    return <div className="h-80 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  const Icon = cart ? Percent : Truck;
  const tool =
    'flex size-12 shrink-0 items-center justify-center rounded-full border border-field-border text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink';

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-24">
      {store.sample ? <SampleNote /> : null}
      {problem ? <Alert tone="error">{problem}</Alert> : null}

      <GeneralCard kind={kind} rule={general} onChange={setDraft} />


      <section aria-label="Özel kurallar" className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Özel Kurallar</h2>
          <p className="text-sm text-ink-muted">
            Belirli kategori ya da markalar için ayrı {cart ? 'indirim' : 'kargo'} kuralı. Alttaki +
            ile ekleyin.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Kural ara"
              placeholder="Kategori, marka veya kural ara…"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            aria-label="Kuralları dışa aktar"
            title="Dışa aktar (CSV)"
            className={tool}
          >
            <Download className="size-5" aria-hidden="true" />
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
            <Icon className="size-8 text-brand-600/60" aria-hidden="true" />
            <p className="font-bold">
              {query ? 'Aramaya uyan kural yok' : 'Henüz özel kural yok'}
            </p>
            {query ? null : (
              <button
                type="button"
                onClick={() => setWizard({ rule: null })}
                className="font-bold text-brand-ink underline"
              >
                İlk kuralı ekle
              </button>
            )}
          </div>
        ) : (
          <ul aria-label="Kurallar" className="flex flex-col gap-2.5">
            {rules.map((r, i) => {
              const [cats, brandsText] = namesOf(r);
              const chips = [...r.customerTypes, ...r.priceLists];
              const actions = (
                <span className="mt-1 flex gap-1 sm:mt-0">
                  <button
                    type="button"
                    aria-label="Kuralı düzenle"
                    onClick={() => setWizard({ rule: r })}
                    className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Kuralı sil"
                    onClick={() => setDeleting(r)}
                    className="inline-flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </span>
              );
              return (
                // Çift tık kısayoldur; kalem düğmesi aynı işi klavyeyle yapar.
                 
                <li
                  key={r.id}
                  onDoubleClick={() => setWizard({ rule: r })}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  className={`flex animate-rise-in items-center gap-3 rounded-3xl border bg-surface-raised p-4 transition-colors hover:border-brand-500/40 ${r.active ? 'border-line' : 'border-line opacity-70'}`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${r.active ? 'bg-brand-50 text-brand-ink' : 'bg-surface-muted text-ink-muted'}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{summarize(r, kind)}</span>
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink-muted">
                      <span className="min-w-0 truncate">
                        {cats} · {brandsText}
                      </span>
                      {chips.map((c) => (
                        <span
                          key={c}
                          className="shrink-0 rounded-md bg-brand-50 px-1.5 py-px text-[0.6875rem] font-bold text-brand-ink"
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                    {roomy ? null : actions}
                  </span>
                  <ToggleSwitch
                    label={`${summarize(r, kind)} aktif`}
                    checked={r.active}
                    onChange={(v) => void run(() => store.setRuleActive(r.id, v))}
                  />
                  {roomy ? actions : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {wizard ? (
        <RuleWizardSheet
          kind={kind}
          rule={wizard.rule}
          onSave={async (d) => {
            await store.saveRule(d, wizard.rule?.id);
            setWizard(null);
          }}
          onClose={() => setWizard(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title="Kural Silinsin Mi?"
        description={deleting ? summarize(deleting, kind) : ''}
        confirmLabel="Sil"
        onConfirm={() => {
          const r = deleting;
          setDeleting(null);
          if (r) void run(() => store.removeRule(r.id));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
