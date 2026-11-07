import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { ToggleChip } from '../../../components/ui/ToggleChip';
import {
  emptyFilters,
  matchesFilters,
  type ProductFilters,
  type ProductItem,
  type ProductFilterOptions,
} from '../types';
import { useProductService } from '../services/product.service';
import { dataError } from '../../../lib/catalog-data';

interface ProductFilterSheetProps {
  products: ProductItem[];
  options?: ProductFilterOptions;
  search?: string;
  /** Fiyat aralığının uygulandığı ilk fiyat listesinin adı. */
  firstListName?: string | undefined;
  value: ProductFilters;
  onApply: (filters: ProductFilters) => void;
  onClose: () => void;
}

const STOCK_OPTIONS = [
  ['all', 'Hepsi'],
  ['in', 'Stokta var'],
  ['out', 'Tükenen'],
  ['unlimited', 'Sınırsız'],
] as const;
const SALES_OPTIONS = [
  ['all', 'Hepsi'],
  ['open', 'Satışta'],
  ['closed', 'Satışa kapalı'],
] as const;
const DEAL_OPTIONS = [
  ['all', 'Hepsi'],
  ['with', 'Fırsatlı'],
  ['without', 'Fırsatsız'],
] as const;

/** Listede gerçekten bulunan kategori ve markalar, tekrarsız. */
function distinct(products: ProductItem[], pick: (p: ProductItem) => [string | null, string]) {
  const map = new Map<string, string>();
  for (const p of products) {
    const [id, name] = pick(p);
    if (id) map.set(id, name);
  }
  return [...map]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

/**
 * Süzgeç paneli. Seçimler "Uygula" denene kadar listeyi değiştirmez; düğmede kaç ürünün
 * bulunacağı canlı yazar. "Sıfırla" hepsini kapatır.
 */
export function ProductFilterSheet({
  products,
  options,
  search = '',
  value,
  firstListName,
  onApply,
  onClose,
}: ProductFilterSheetProps) {
  const [draft, setDraft] = useState<ProductFilters>(value);
  const service = useProductService();
  const categories =
    options?.categories ??
    [
      ...new Map(
        products.flatMap((p) =>
          (p.categoryIds ?? (p.categoryId ? [p.categoryId] : [])).map(
            (id, i) => [id, p.categoryNames?.[i] ?? p.categoryName ?? 'Kategorisiz'] as const,
          ),
        ),
      ),
    ]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const brands = options?.brands ?? distinct(products, (p) => [p.brandId, p.brandName]);
  const draftKey = JSON.stringify({ draft, search });
  const [countResult, setCountResult] = useState<{ key: string; count: number } | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const validNumber = (text: string) => text === '' || /^\d{1,12}([.,]\d{1,6})?$/.test(text);
  const invalid =
    !validNumber(draft.minPrice) || !validNumber(draft.maxPrice)
      ? 'Geçerli bir fiyat girin.'
      : draft.minPrice &&
          draft.maxPrice &&
          Number(draft.minPrice.replace(',', '.')) > Number(draft.maxPrice.replace(',', '.'))
        ? 'En az fiyat, en çok fiyattan büyük olamaz.'
        : null;
  useEffect(() => {
    if (!options || invalid) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setCountError(null);
      const current = JSON.parse(draftKey) as { draft: ProductFilters; search: string };
      void service
        .count({ search: current.search, filters: current.draft, page: 1, pageSize: 1 })
        .then((count) => {
          if (active) setCountResult({ key: draftKey, count });
        })
        .catch((e) => {
          if (active) setCountError(dataError(e));
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draftKey, invalid, options, service]);
  const count = options
    ? countResult?.key === draftKey
      ? countResult.count
      : null
    : products.filter((p) => matchesFilters(p, draft)).length;

  const toggle = (key: 'categoryIds' | 'brandIds', id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }));

  return (
    <Sheet open onClose={onClose} title="Süzgeçler" size="lg">
      <div className="flex flex-col gap-6">
        <Group title="Kategori">
          {categories.map((c) => (
            <ToggleChip
              key={c.id}
              label={c.name}
              checked={draft.categoryIds.includes(c.id)}
              onChange={() => toggle('categoryIds', c.id)}
            />
          ))}
        </Group>
        <Group title="Marka">
          {brands.map((b) => (
            <ToggleChip
              key={b.id}
              label={b.name}
              checked={draft.brandIds.includes(b.id)}
              onChange={() => toggle('brandIds', b.id)}
            />
          ))}
        </Group>
        <Choice
          title="Stok durumu"
          options={STOCK_OPTIONS}
          value={draft.stock}
          onChange={(stock) => setDraft((d) => ({ ...d, stock }))}
        />
        <Choice
          title="Satış durumu"
          options={SALES_OPTIONS}
          value={draft.sales}
          onChange={(sales) => setDraft((d) => ({ ...d, sales }))}
        />
        <Choice
          title="Fırsat"
          options={DEAL_OPTIONS}
          value={draft.deal}
          onChange={(deal) => setDraft((d) => ({ ...d, deal }))}
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold tracking-wide text-ink-muted uppercase">
            {firstListName ?? 'Fiyat'} aralığı (KDV dahil)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="En az"
              numeric="decimal"
              value={draft.minPrice}
              onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
            />
            <TextField
              label="En çok"
              numeric="decimal"
              value={draft.maxPrice}
              onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {invalid || countError ? (
            <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{invalid ?? countError}</span>
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              flow={false}
              disabled={Boolean(invalid)}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              {count === null ? 'Ürünleri Göster' : `${count} Ürünü Göster`}
            </Button>
            <Button variant="outline" flow={false} onClick={() => setDraft(emptyFilters())}>
              Sıfırla
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-2">
      <p className="text-sm font-bold tracking-wide text-ink-muted uppercase">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Group title={title}>
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={[
            'inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors',
            value === key
              ? 'border-brand-600 bg-brand-50 text-brand-ink'
              : 'border-field-border text-ink-muted hover:border-brand-500 hover:text-ink',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </Group>
  );
}
