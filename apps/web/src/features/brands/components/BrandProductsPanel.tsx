import { Minus, PackageOpen, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SearchField } from '../../../components/ui/SearchField';
import { brandService } from '../services/brand.service';
import type { Brand, ProductRef } from '../types';

interface BrandProductsPanelProps {
  brand: Brand;
  /** Marka kimliği → ad (ürünün şu anki markasını göstermek için). */
  brandNames: Record<string, string>;
  onAssign: (brandId: string, productIds: string[]) => Promise<void>;
  onUnassign: (brandId: string, productIds: string[]) => Promise<void>;
}

type Tab = 'in' | 'add';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Markanın ürünleri paneli (marka penceresinin yanında açılır): "Bu Markada" sekmesinde ürünleri
 * görür ve tek dokunuşla çıkarırsın; "Ürün Ekle" sekmesinde ürünleri arayıp tek dokunuşla eklersin.
 * Değişiklikler anında uygulanır (marka formundaki Kaydet'ten bağımsızdır).
 */
export function BrandProductsPanel({
  brand,
  brandNames,
  onAssign,
  onUnassign,
}: BrandProductsPanelProps) {
  const [products, setProducts] = useState<ProductRef[] | null>(null);
  const [tab, setTab] = useState<Tab>('in');
  const [query, setQuery] = useState('');
  const [onlyUnbranded, setOnlyUnbranded] = useState(false);

  useEffect(() => {
    let active = true;
    void brandService.listProducts().then((list) => active && setProducts(list));
    return () => {
      active = false;
    };
  }, []);

  const mine = useMemo(
    () => (products ?? []).filter((p) => p.brandId === brand.id),
    [products, brand.id],
  );

  const matches = (p: ProductRef) => {
    const q = fold(query.trim());
    return !q || [p.name, p.code, p.barcode].some((field) => fold(field).includes(q));
  };
  const listIn = mine.filter(matches);
  const listAdd = (products ?? []).filter(
    (p) => p.brandId !== brand.id && (!onlyUnbranded || p.brandId === null) && matches(p),
  );

  // Anında uygula: ekran hemen güncellenir, kayıt arkadan yapılır.
  const change = (ids: string[], toBrand: boolean) => {
    setProducts((list) =>
      (list ?? []).map((p) =>
        ids.includes(p.id) ? { ...p, brandId: toBrand ? brand.id : null } : p,
      ),
    );
    void (toBrand ? onAssign(brand.id, ids) : onUnassign(brand.id, ids));
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Ürün işlemleri"
        className="flex rounded-full bg-surface-muted p-1"
      >
        {(
          [
            { id: 'in', label: `Bu Markada (${mine.length})` },
            { id: 'add', label: 'Ürün Ekle' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={[
              'min-h-10 flex-1 rounded-full px-3 text-sm font-bold whitespace-nowrap transition-all duration-200',
              tab === t.id
                ? 'bg-surface-raised text-brand-ink shadow-soft'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {products === null ? (
        <div className="h-40 animate-pulse rounded-3xl bg-surface-muted" aria-busy="true" />
      ) : (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            label={tab === 'in' ? 'Markadaki ürünlerde ara' : 'Eklenecek ürünü ara'}
            placeholder="Ad, stok kodu veya barkod"
          />

          {tab === 'add' ? (
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
                    'min-h-9 rounded-full border px-3.5 text-sm font-bold transition-colors',
                    onlyUnbranded === f.value
                      ? 'border-brand-600 bg-brand-700 text-white'
                      : 'border-field-border text-ink-muted',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'in' ? (
            listIn.length === 0 ? (
              <Empty
                text={mine.length === 0 ? 'Bu markada henüz ürün yok.' : 'Eşleşen ürün yok.'}
                action={
                  mine.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => switchTab('add')}
                      className="min-h-11 rounded-full bg-brand-700 px-5 text-sm font-bold text-white"
                    >
                      Ürün Ekle
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Markadaki ürünler">
                {listIn.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    action={{
                      icon: <Minus className="size-5" aria-hidden="true" />,
                      label: `${p.name} ürününü markadan çıkar`,
                      tone: 'remove',
                      onClick: () => change([p.id], false),
                    }}
                  />
                ))}
              </ul>
            )
          ) : listAdd.length === 0 ? (
            <Empty text="Eklenecek ürün bulunamadı." />
          ) : (
            <>
              {listAdd.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    change(
                      listAdd.map((p) => p.id),
                      true,
                    )
                  }
                  className="min-h-10 self-start text-sm font-bold text-brand-ink"
                >
                  Görünenlerin Hepsini Ekle ({listAdd.length})
                </button>
              ) : null}
              <ul className="flex flex-col gap-2" aria-label="Eklenebilecek ürünler">
                {listAdd.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    note={p.brandId ? brandNames[p.brandId] : undefined}
                    action={{
                      icon: <Plus className="size-5" aria-hidden="true" />,
                      label: `${p.name} ürününü markaya ekle`,
                      tone: 'add',
                      onClick: () => change([p.id], true),
                    }}
                  />
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-ink-muted">Ürün değişiklikleri anında kaydedilir.</p>
        </>
      )}
    </div>
  );
}

function ProductRow({
  product,
  note,
  action,
}: {
  product: ProductRef;
  note?: string | undefined;
  action: { icon: React.ReactNode; label: string; tone: 'add' | 'remove'; onClick: () => void };
}) {
  return (
    <li className="flex animate-fade-in items-center gap-3 rounded-2xl border border-line bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="truncate text-xs text-ink-muted">
          {product.code} · {product.barcode}
          {note ? ` · Şu an: ${note}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={action.onClick}
        aria-label={action.label}
        title={action.tone === 'add' ? 'Ekle' : 'Çıkar'}
        className={[
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
          action.tone === 'add'
            ? 'bg-brand-50 text-brand-ink hover:bg-brand-100'
            : 'bg-surface-muted text-ink-muted hover:bg-danger-soft hover:text-danger',
        ].join(' ')}
      >
        {action.icon}
      </button>
    </li>
  );
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface-muted px-4 py-8 text-center">
      <PackageOpen className="size-8 text-ink-muted" aria-hidden="true" />
      <p className="text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
