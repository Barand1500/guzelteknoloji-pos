import { ChevronDown, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { PickList } from '../../../components/ui/PickList';
import { useBrands } from '../../brands/hooks/useBrands';
import { useCategories } from '../../categories/hooks/useCategories';
import { flattenTree } from '../../categories/tree';
import { useProducts } from '../../products/hooks/useProducts';
import type { Deal, DealProductRef } from '../types';
import { OverlapNotes, overlapNotes } from '../overlap';

interface DealBulkAssignProps {
  deal: Deal;
  /** Panelin güncel ürün listesi (hangi ürünün hangi fırsatı olduğu). */
  refs: DealProductRef[];
  allDeals: Deal[];
  /** Ürünleri fırsata ekler; hata olursa false döner. */
  onAdd: (ids: string[]) => Promise<void>;
}

type Mode = 'brand' | 'category';

/**
 * "Marka ya da kategoriyle ekle": fırsatı bir markanın ("tüm Samsung ürünleri") ya da bir
 * kategorinin (alt kategorileri dahil) bütün ürünlerine tek seferde uygular. Zaten fırsatta olanlar
 * atlanır; eklemeden önce kaç ürünün ekleneceği ve rozet çakışması görünür.
 */
export function DealBulkAssign({ deal, refs, allDeals, onAdd }: DealBulkAssignProps) {
  const { products } = useProducts();
  const { brands } = useBrands();
  const cats = useCategories();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('brand');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const known = useMemo(() => new Set(refs.map((r) => r.id)), [refs]);
  const inDeal = useMemo(
    () => new Set(refs.filter((r) => r.dealIds.includes(deal.id)).map((r) => r.id)),
    [refs, deal.id],
  );

  // Kategori ve alt kategorilerinin kimlikleri.
  const subtree = (id: string): Set<string> => {
    const out = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of cats.categories)
        if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
          out.add(c.id);
          grew = true;
        }
    }
    return out;
  };

  const idsFor = (m: Mode, v: string): string[] => {
    if (!v) return [];
    const tree = m === 'category' ? subtree(v) : null;
    return products
      .filter((p) => (m === 'brand' ? p.brandId === v : p.categoryIds.some((c) => tree?.has(c))))
      .map((p) => p.id)
      .filter((id) => known.has(id));
  };

  const options = useMemo(() => {
    if (mode === 'brand')
      return brands
        .map((b) => ({ value: b.id, label: b.name, count: idsFor('brand', b.id).length }))
        .filter((o) => o.count > 0)
        .map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }));
    return flattenTree(cats.categories).map(({ category: c, depth }) => ({
      value: c.id,
      label: `${c.name} (${idsFor('category', c.id).length})`,
      depth,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, brands, cats.categories, products, known]);

  const matching = idsFor(mode, value);
  const toAdd = matching.filter((id) => !inDeal.has(id));
  const notes = overlapNotes(deal, allDeals, refs, toAdd);

  const submit = async () => {
    if (toAdd.length === 0 || busy) return;
    setBusy(true);
    try {
      await onAdd(toAdd);
      setValue('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-line bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 px-4 text-left font-bold"
      >
        <Layers className="size-5 text-brand-ink" aria-hidden="true" />
        <span className="flex-1">Marka veya kategoriyle ekle</span>
        <ChevronDown
          className={`size-5 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="flex animate-fade-in flex-col gap-3 border-t border-line p-4">
          <div role="radiogroup" aria-label="Neye göre" className="flex gap-2">
            {(
              [
                ['brand', 'Marka'],
                ['category', 'Kategori'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                onClick={() => {
                  setMode(id);
                  setValue('');
                }}
                className={[
                  'min-h-9 rounded-full border px-4 text-sm font-bold transition-colors',
                  mode === id
                    ? 'border-brand-600 bg-brand-700 text-white'
                    : 'border-field-border text-ink-muted hover:border-brand-500',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <PickList
            label={mode === 'brand' ? 'Marka seç' : 'Kategori seç'}
            options={options}
            value={value}
            onChange={setValue}
          />
          {value ? (
            <p className="text-sm text-ink-muted" aria-live="polite">
              <b className="text-ink">{toAdd.length} ürün</b> eklenecek
              {matching.length > toAdd.length
                ? ` (${matching.length - toAdd.length} ürün zaten bu fırsatta)`
                : ''}
              .
            </p>
          ) : null}
          <OverlapNotes notes={notes} />
          <Button
            flow={false}
            disabled={toAdd.length === 0}
            loading={busy}
            loadingLabel="Ekleniyor…"
            onClick={() => void submit()}
          >
            {toAdd.length > 0 ? `${toAdd.length} Ürünü Ekle` : 'Ekle'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
