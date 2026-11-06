import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { ToggleChip } from '../../../components/ui/ToggleChip';
import { emptyFilters, matchesFilters, type ProductFilters, type ProductItem } from '../types';

interface ProductFilterSheetProps {
  products: ProductItem[];
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
export function ProductFilterSheet({ products, value, onApply, onClose }: ProductFilterSheetProps) {
  const [draft, setDraft] = useState<ProductFilters>(value);
  const categories = distinct(products, (p) => [p.categoryId, p.categoryName]);
  const brands = distinct(products, (p) => [p.brandId, p.brandName]);
  const count = products.filter((p) => matchesFilters(p, draft)).length;

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
            Fiyat 1 aralığı (KDV dahil)
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

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            flow={false}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {count} Ürünü Göster
          </Button>
          <Button variant="outline" flow={false} onClick={() => setDraft(emptyFilters())}>
            Sıfırla
          </Button>
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
