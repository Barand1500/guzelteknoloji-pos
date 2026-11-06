import { Check, Minus, PackageOpen, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { SearchField } from '../../../components/ui/SearchField';
import { dealService } from '../services/deal.service';
import type { Deal, DealProductRef } from '../types';
import { BrandLogo } from '../../brands/components/BrandLogo';

interface DealProductsPanelProps {
  deal: Deal;
  onAssign: (dealId: string, productIds: string[]) => Promise<void>;
  onUnassign: (dealId: string, productIds: string[]) => Promise<void>;
}

type Tab = 'in' | 'add';
/** Ürün Ekle süzgeci: hiç fırsatı olmayanlar (varsayılan) ya da hepsi. */
type Filter = 'free' | 'all';

const fold = (s: string) => s.toLocaleLowerCase('tr');
const FRESH_MS = 2200;
const UNDO_MS = 6000;

/**
 * Fırsatın ürünleri paneli. İki sekme:
 * - "Bu Fırsatta": ürünler; "Çıkar" tek dokunuş, hemen altında "Geri Al" çıkar (yanlışlık olmasın).
 * - "Ürün Ekle": arama + süzgeç (varsayılan "Fırsatsız"); kartlara dokunarak ÇOKLU seçilir, altta
 *   "N ürün seçili · Ekle" çubuğu belirir. Ekleyince "Bu Fırsatta" sekmesine geçilir ve yeni
 *   eklenenler kısa süre vurgulanır. Değişiklikler anında uygulanır (formdaki Kaydet'ten bağımsız).
 */
export function DealProductsPanel({ deal, onAssign, onUnassign }: DealProductsPanelProps) {
  const [products, setProducts] = useState<DealProductRef[] | null>(null);
  const [tab, setTab] = useState<Tab>('in');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('free');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let active = true;
    void dealService.listProducts().then((list) => active && setProducts(list));
    const pending = timers.current;
    return () => {
      active = false;
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const mine = useMemo(
    () => (products ?? []).filter((p) => p.dealIds.includes(deal.id)),
    [products, deal.id],
  );
  const others = useMemo(
    () => (products ?? []).filter((p) => !p.dealIds.includes(deal.id)),
    [products, deal.id],
  );
  const counts = {
    free: others.filter((p) => p.dealIds.length === 0).length,
    all: others.length,
  };

  const matches = (p: DealProductRef) => {
    const q = fold(query.trim());
    return !q || [p.name, p.code, p.barcode].some((field) => fold(field).includes(q));
  };
  const listIn = mine.filter(matches);
  const candidates = others.filter(
    (p) => (filter === 'all' || p.dealIds.length === 0) && matches(p),
  );
  const allPicked = candidates.length > 0 && candidates.every((p) => picked.has(p.id));

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Anında uygula: ekran hemen güncellenir, kayıt arkadan yapılır.
  const apply = (ids: string[], toDeal: boolean) => {
    setProducts((list) =>
      (list ?? []).map((p) =>
        !ids.includes(p.id)
          ? p
          : {
              ...p,
              dealIds: toDeal
                ? p.dealIds.includes(deal.id)
                  ? p.dealIds
                  : [...p.dealIds, deal.id]
                : p.dealIds.filter((d) => d !== deal.id),
            },
      ),
    );
    void (toDeal ? onAssign(deal.id, ids) : onUnassign(deal.id, ids));
  };

  const togglePick = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setPicked((current) => {
      const next = new Set(current);
      for (const p of candidates) {
        if (allPicked) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });

  const addPicked = () => {
    const ids = [...picked];
    if (ids.length === 0) return;
    apply(ids, true);
    setPicked(new Set());
    setQuery('');
    setUndo(null);
    // Eklenenleri "Bu Fırsatta" sekmesinde kısa süre vurgula
    setFresh(new Set(ids));
    later(() => setFresh(new Set()), FRESH_MS);
    setTab('in');
  };

  const removeOne = (p: DealProductRef) => {
    apply([p.id], false);
    setUndo({ ids: [p.id], label: p.name });
    later(() => setUndo((u) => (u?.ids[0] === p.id ? null : u)), UNDO_MS);
  };

  const undoRemove = () => {
    if (!undo) return;
    apply(undo.ids, true);
    setFresh(new Set(undo.ids));
    later(() => setFresh(new Set()), FRESH_MS);
    setUndo(null);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery('');
    setUndo(null);
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'free', label: `Fırsatsız (${counts.free})` },
    { id: 'all', label: `Tümü (${counts.all})` },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div
        role="tablist"
        aria-label="Ürün işlemleri"
        className="flex rounded-full bg-surface-muted p-1"
      >
        {(
          [
            { id: 'in', label: `Bu Fırsatta (${mine.length})` },
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
            label={tab === 'in' ? 'Fırsattaki ürünlerde ara' : 'Eklenecek ürünü ara'}
            placeholder="Ad, stok kodu veya barkod"
          />

          {tab === 'add' ? (
            <div role="radiogroup" aria-label="Ürün süzgeci" className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={[
                    'min-h-9 rounded-full border px-3.5 text-[0.8125rem] font-bold transition-colors',
                    filter === f.id
                      ? 'border-brand-600 bg-brand-700 text-white'
                      : 'border-field-border text-ink-muted hover:border-brand-500',
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
                text={
                  mine.length === 0 ? 'Bu fırsat henüz hiçbir üründe yok.' : 'Eşleşen ürün yok.'
                }
                action={
                  mine.length === 0 ? (
                    <Button fullWidth={false} flow={false} onClick={() => switchTab('add')}>
                      Ürün Ekle
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Fırsattaki ürünler">
                {listIn.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      product={p}
                      highlight={fresh.has(p.id)}
                      end={
                        <button
                          type="button"
                          onClick={() => removeOne(p)}
                          aria-label={`${p.name} ürününü fırsattan çıkar`}
                          title="Fırsattan çıkar"
                          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <Minus className="size-5" aria-hidden="true" />
                        </button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )
          ) : candidates.length === 0 ? (
            <Empty
              text={
                filter === 'free' && counts.free === 0
                  ? 'Fırsatsız ürün kalmadı.'
                  : 'Eşleşen ürün bulunamadı.'
              }
              action={
                filter === 'free' && counts.all > 0 ? (
                  <Button
                    fullWidth={false}
                    flow={false}
                    variant="outline"
                    onClick={() => setFilter('all')}
                  >
                    Tüm Ürünlere Bak
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{candidates.length} ürün</span>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="min-h-10 font-bold text-brand-ink"
                >
                  {allPicked ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                </button>
              </div>
              <ul className="flex flex-col gap-2" aria-label="Eklenebilecek ürünler">
                {candidates.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <li key={p.id}>
                      <ProductCard
                        product={p}
                        selected={on}
                        note={
                          p.dealIds.length > 0 ? `${p.dealIds.length} fırsatı daha var` : undefined
                        }
                        onSelect={() => togglePick(p.id)}
                        end={
                          <span
                            aria-hidden="true"
                            className={[
                              'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                              on
                                ? 'scale-110 border-brand-600 bg-brand-600 text-white'
                                : 'border-field-border',
                            ].join(' ')}
                          >
                            {on ? <Check className="size-4" /> : null}
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="flex-1" />

          {/* Alt çubuk: seçim varsa "Ekle", yoksa (çıkarma sonrası) "Geri Al" */}
          {tab === 'add' && picked.size > 0 ? (
            <div className="sticky -bottom-6 z-10 -mx-6 -mb-6 flex animate-rise-in items-center gap-3 border-t border-line bg-surface-raised px-6 pt-3 pb-6">
              <p className="min-w-0 flex-1 text-sm font-bold" aria-live="polite">
                {picked.size} ürün seçili
              </p>
              <button
                type="button"
                onClick={() => setPicked(new Set())}
                className="min-h-10 px-2 text-sm font-semibold text-ink-muted"
              >
                Temizle
              </button>
              <Button fullWidth={false} flow={false} onClick={addPicked} className="min-w-28">
                Ekle
              </Button>
            </div>
          ) : null}
          {tab === 'in' && undo ? (
            <div
              role="status"
              className="sticky -bottom-6 z-10 -mx-6 -mb-6 flex animate-rise-in items-center gap-3 bg-ink px-6 pt-3 pb-6 text-surface"
            >
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {undo.label} çıkarıldı
              </p>
              <button
                type="button"
                onClick={undoRemove}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface/15 px-4 text-sm font-bold"
              >
                <Undo2 className="size-4" aria-hidden="true" />
                Geri Al
              </button>
            </div>
          ) : null}
          {tab === 'in' && !undo ? (
            <p className="text-xs text-ink-muted">Ürün değişiklikleri anında kaydedilir.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Ürün kartı: monogram, adı (2 satıra kadar tam görünür), kod · barkod ve (varsa) taşınma notu. */
function ProductCard({
  product,
  end,
  selected,
  highlight = false,
  note,
  onSelect,
}: {
  product: DealProductRef;
  end: ReactNode;
  selected?: boolean;
  highlight?: boolean;
  note?: string | undefined;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <BrandLogo brand={{ name: product.name, logoUrl: null }} size="sq" />
      <span className="min-w-0 flex-1 text-left">
        <span className="line-clamp-2 block text-sm leading-snug font-semibold">
          {product.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-muted">
          {product.code} · {product.barcode}
        </span>
        {note ? (
          <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-bold text-brand-ink">
            {note}
          </span>
        ) : null}
      </span>
    </>
  );
  const frame = [
    'flex w-full items-center gap-3 rounded-2xl border p-2.5 transition-all duration-200',
    selected ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
    highlight ? 'animate-pop ring-2 ring-brand-600' : '',
  ].join(' ');

  return onSelect ? (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${product.name} ürününü seç`}
      onClick={onSelect}
      className={`${frame} hover:border-brand-500/70`}
    >
      {body}
      {end}
    </button>
  ) : (
    <div className={frame}>
      {body}
      {end}
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface-muted px-4 py-8 text-center">
      <PackageOpen className="size-8 text-ink-muted" aria-hidden="true" />
      <p className="text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
