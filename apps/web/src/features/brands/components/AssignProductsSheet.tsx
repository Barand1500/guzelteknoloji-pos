import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SearchField } from '../../../components/ui/SearchField';
import { Sheet } from '../../../components/ui/Sheet';
import { brandService } from '../services/brand.service';
import type { Brand, ProductRef } from '../types';

interface AssignProductsSheetProps {
  brand: Brand;
  /** Marka kimliği → ad (ürünün şu anki markasını göstermek için). */
  brandNames: Record<string, string>;
  onAssign: (productIds: string[]) => Promise<void>;
  onClose: () => void;
}

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * "Ürünlere Tanımla": markayı birçok ürüne tek seferde atar. Ad, stok kodu veya barkodla ara,
 * ürünleri seç, altta "Ata". Başka markadaki ürünler de seçilebilir (marka değişir; kartta gösterilir).
 */
export function AssignProductsSheet({
  brand,
  brandNames,
  onAssign,
  onClose,
}: AssignProductsSheetProps) {
  const [products, setProducts] = useState<ProductRef[] | null>(null);
  const [query, setQuery] = useState('');
  const [onlyUnbranded, setOnlyUnbranded] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void brandService.listProducts().then((list) => active && setProducts(list));
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return (products ?? []).filter((p) => {
      if (onlyUnbranded && p.brandId !== null) return false;
      if (!q) return true;
      return [p.name, p.code, p.barcode].some((field) => fold(field).includes(q));
    });
  }, [products, query, onlyUnbranded]);

  // Zaten bu markada olanlar seçilemez; "tümünü seç" yalnızca seçilebilirleri kapsar.
  const selectable = visible.filter((p) => p.brandId !== brand.id);
  const allPicked = selectable.length > 0 && selectable.every((p) => picked.has(p.id));

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setPicked((current) => {
      const next = new Set(current);
      for (const p of selectable) {
        if (allPicked) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });

  const submit = async () => {
    setSaving(true);
    await onAssign([...picked]);
    setSaving(false);
  };

  return (
    <Sheet open onClose={onClose} title={`${brand.name} · Ürünlere Tanımla`} size="lg">
      <div className="flex flex-col gap-4">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Ürün ara"
          placeholder="Ad, stok kodu veya barkod"
        />

        <div role="radiogroup" aria-label="Ürün filtresi" className="flex flex-wrap gap-2">
          {[
            { value: false, label: 'Tümü' },
            { value: true, label: 'Markasız Ürünler' },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              role="radio"
              aria-checked={onlyUnbranded === f.value}
              onClick={() => setOnlyUnbranded(f.value)}
              className={[
                'min-h-10 rounded-full border px-4 text-sm font-bold transition-colors',
                onlyUnbranded === f.value
                  ? 'border-brand-600 bg-brand-700 text-white'
                  : 'border-field-border text-ink-muted',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {products === null ? (
          <div className="h-40 animate-pulse rounded-3xl bg-surface-muted" aria-busy="true" />
        ) : (
          <>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-ink-muted">
                {products.length} üründen {visible.length} sonuç
              </span>
              {selectable.length > 0 ? (
                <button type="button" onClick={toggleAll} className="min-h-10 text-brand-ink">
                  {allPicked ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                </button>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <p className="rounded-3xl bg-surface-muted px-4 py-8 text-center text-ink-muted">
                Eşleşen ürün yok.
              </p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Ürünler">
                {visible.map((p) => {
                  const already = p.brandId === brand.id;
                  const checked = already || picked.has(p.id);
                  const current = p.brandId && !already ? brandNames[p.brandId] : null;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        disabled={already}
                        onClick={() => toggle(p.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                          checked
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-line bg-surface hover:border-brand-500/60',
                          already ? 'opacity-60' : '',
                        ].join(' ')}
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            'flex size-6 shrink-0 items-center justify-center rounded-lg border-2',
                            checked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-field-border',
                          ].join(' ')}
                        >
                          {checked ? <Check className="size-4" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="block truncate text-sm text-ink-muted">
                            {p.code} · {p.barcode}
                          </span>
                        </span>
                        {already ? (
                          <span className="shrink-0 text-xs font-bold text-ink-muted">
                            Bu markada
                          </span>
                        ) : current ? (
                          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-muted">
                            {current}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <div className="sticky -bottom-6 -mx-6 -mb-6 flex items-center gap-3 border-t border-line bg-surface-raised px-6 pt-3 pb-6">
          <p className="min-w-0 flex-1 text-sm font-bold" aria-live="polite">
            {picked.size === 0 ? 'Ürün seçilmedi' : `${picked.size} ürün seçili`}
          </p>
          <Button
            fullWidth={false}
            flow={false}
            disabled={picked.size === 0}
            loading={saving}
            loadingLabel="Atanıyor…"
            onClick={() => void submit()}
            className="min-w-32"
          >
            Ata
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
