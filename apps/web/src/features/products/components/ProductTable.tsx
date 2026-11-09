import { Check, ChevronDown, Copy, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import {
  COST_VIEW,
  currencyOf,
  formatMoney,
  grossOf,
  moneyOrDash,
  netOf,
  vatOf,
  type PriceColumn,
  type ProductItem,
} from '../types';
import { ProductThumb } from './ProductThumb';
import { StockBadge } from './StockBadge';

interface ProductTableProps {
  products: ProductItem[];
  /** Başlıktan seçilebilen fiyat görünümleri: kullanıcının fiyat listeleri ve Alış (kendi adlarıyla). */
  priceOptions: PriceColumn[];
  /** Tabloda şu an gösterilen fiyat görünümü (varsayılan: ilk liste). */
  priceView: string;
  onPriceView: (id: string) => void;
  selected: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (select: boolean) => void;
  onEdit: (product: ProductItem) => void;
  onCopy: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
  /** Resme çift tıklama: görselleri değiştir / daha fazla yükle penceresi. */
  onEditImages: (product: ProductItem) => void;
  onStockTracking: (id: string, on: boolean) => void;
  onSales: (id: string, on: boolean) => void;
}

/**
 * Masaüstü tablo görünümü. Tabloda TEK fiyat sütunu vardır (varsayılan ilk liste, ör. FİYAT); çok
 * sayıda fiyat listesi olsa da tablo kalabalıklaşmaz:
 * - sütun başlığındaki küçük seçiciyle sütunda hangi listenin (ya da Alış'ın) görüneceği değişir;
 * - bir fiyatın ÜZERİNE GELİNCE (ya da klavyeyle odaklanınca) o ürünün tüm fiyat listeleri bir
 *   küçük kartta açılır.
 * İşlemler (Düzenle, Kopya Oluştur, Sil) doğrudan simgelerdir; resme çift tıklayınca görseller açılır.
 */
export function ProductTable({
  products,
  priceOptions,
  priceView,
  onPriceView,
  selected,
  onToggleSelect,
  onToggleAll,
  onEdit,
  onCopy,
  onDelete,
  onEditImages,
  onStockTracking,
  onSales,
}: ProductTableProps) {
  const allOn = products.length > 0 && products.every((p) => selected.has(p.id));
  const iconButton =
    'inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-ink focus-visible:bg-brand-50';
  return (
    <div className="rounded-3xl border border-line bg-surface-raised">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-ink-muted uppercase">
            <th className="w-12 p-3">
              <Box
                checked={allOn}
                label="Bu sayfadaki tüm ürünleri seç"
                onChange={() => onToggleAll(!allOn)}
              />
            </th>
            <th className="p-3">Ürün</th>
            <th className="p-3">Kod · Tip</th>
            <th className="p-3 text-right">
              <PriceHeader options={priceOptions} value={priceView} onChange={onPriceView} />
            </th>
            <th className="p-3">Stok</th>
            <th className="p-3 text-center">Stok Takibi</th>
            <th className="p-3 text-center">Satış</th>
            <th className="p-3">
              <span className="sr-only">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.id}
              data-product-id={p.id}
              onDoubleClick={() => onEdit(p)}
              className={[
                'border-t border-line transition-colors hover:bg-brand-50/60',
                selected.has(p.id) ? 'bg-brand-50' : '',
              ].join(' ')}
            >
              <td className="p-3">
                <Box
                  checked={selected.has(p.id)}
                  label={`${p.name} seç`}
                  onChange={() => onToggleSelect(p.id)}
                />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-3">
                  {/* Resme çift tıklama: satırın düzenleme açan çift tıklaması çalışmaz. */}
                  <span
                    role="presentation"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onEditImages(p);
                    }}
                    title="Görselleri değiştirmek için çift tıklayın"
                  >
                    <ProductThumb product={p} hoverPreview />
                  </span>
                  <div className="min-w-0">
                    {p.brandName ? (
                      <p className="text-xs font-bold text-ink-muted">{p.brandName}</p>
                    ) : null}
                    <p className="line-clamp-2 font-semibold">{p.name}</p>
                    {(p.variantCount ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="text-xs font-semibold text-brand-ink"
                      >
                        {p.variantCount} varyant · Düzenle
                      </button>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-3">
                {p.code}
                <span className="block text-xs text-brand-ink">{p.stockType}</span>
              </td>
              <td className="p-3 text-right">
                <PriceCell product={p} view={priceView} options={priceOptions} />
              </td>
              <td className="p-3">
                <StockBadge product={p} />
              </td>
              <td className="p-3 text-center">
                <ToggleSwitch
                  label={`${p.name} stok takibi`}
                  checked={p.stockTracking}
                  onChange={(on) => onStockTracking(p.id, on)}
                />
              </td>
              <td className="p-3 text-center">
                <ToggleSwitch
                  label={`${p.name} satışta`}
                  checked={p.salesOpen}
                  onChange={(on) => onSales(p.id, on)}
                />
              </td>
              <td className="p-3">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    aria-label={`${p.name} ürününü düzenle`}
                    title="Düzenle"
                    className={iconButton}
                  >
                    <Pencil className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopy(p)}
                    aria-label={`${p.name} ürününün kopyasını oluştur`}
                    title="Kopya Oluştur"
                    className={iconButton}
                  >
                    <Copy className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    aria-label={`${p.name} ürününü sil`}
                    title="Sil"
                    className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft"
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Fiyat sütununun başlığı: tıklayınca hangi listenin gösterileceği seçilir. */
function PriceHeader({
  options,
  value,
  onChange,
}: {
  options: PriceColumn[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  // Tek seçenek varsa seçici gerekmez.
  if (options.length <= 1) return <span>{current?.name ?? 'Fiyat'}</span>;
  return (
    <div ref={root} className="relative inline-block normal-case">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Tabloda gösterilecek fiyat"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold tracking-wide text-brand-ink uppercase transition-colors hover:bg-brand-100"
      >
        {current?.name ?? 'Fiyat'}
        <ChevronDown
          className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Fiyat listeleri"
          className="absolute top-full right-0 z-30 mt-2 max-h-72 min-w-44 animate-fade-in overflow-y-auto rounded-2xl border border-line bg-surface-raised p-1.5 text-left shadow-card"
        >
          {options.map((o) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              tabIndex={0}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(o.id);
                  setOpen(false);
                }
              }}
              className={[
                'flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold',
                o.id === value ? 'bg-brand-50 text-brand-ink' : 'text-ink hover:bg-surface-muted',
              ].join(' ')}
            >
              <span className="flex-1">{o.name}</span>
              {o.id === value ? <Check className="size-4" aria-hidden="true" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Tablodaki fiyat hücresi: seçili listenin KDV Dahil fiyatı + KDV Hariç tutarı. Üzerine gelince
 * (ya da odaklanınca) ürünün TÜM fiyat listeleri küçük bir kartta görünür.
 */
function PriceCell({
  product,
  view,
  options,
}: {
  product: ProductItem;
  view: string;
  options: PriceColumn[];
}) {
  const net = netOf(product, view);
  const currency = currencyOf(product, view);
  // Kart yalnızca üzerine gelince ya da odaklanınca çizilir (satır başına fazladan öğe yok).
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative inline-block text-right"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${product.name} fiyatları`}
        className="cursor-default rounded-xl px-2 py-1 text-right font-bold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
      >
        {moneyOrDash(grossOf(product, view), currency)}
        {net === null ? null : (
          <span className="block text-xs font-medium text-ink-muted">
            KDV Hariç {formatMoney(net, currency)}
          </span>
        )}
      </button>
      {open && options.length > 1 ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-full right-0 z-30 mt-1 w-64 animate-fade-in rounded-2xl border border-line bg-surface-raised p-3 text-left shadow-card"
        >
          <p className="mb-2 text-xs font-bold tracking-wide text-ink-muted uppercase">
            Tüm Fiyatlar · KDV %{vatOf(product, view)}
          </p>
          <dl className="flex flex-col gap-1.5">
            {options.map((o) => {
              const n = netOf(product, o.id);
              const c = currencyOf(product, o.id);
              return (
                <div
                  key={o.id}
                  className={[
                    'flex items-baseline justify-between gap-3 rounded-lg px-2 py-1',
                    o.id === view ? 'bg-brand-50' : '',
                  ].join(' ')}
                >
                  <dt className="text-xs font-bold text-ink-muted">{o.name}</dt>
                  <dd className="text-right text-sm font-bold">
                    {moneyOrDash(grossOf(product, o.id), c)}
                    {n === null ? null : (
                      <span className="block text-[0.6875rem] font-medium text-ink-muted">
                        KDV Hariç {formatMoney(n, c)}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
            {/* Alış'ın altında: ürünün satış fiyatı (ilk liste). */}
            {options.some((o) => o.id === COST_VIEW) && options[0] ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-line px-2 pt-2">
                <dt className="text-xs font-bold text-ink-muted">Satış</dt>
                <dd className="text-right text-sm font-bold">
                  {moneyOrDash(grossOf(product, options[0].id), currencyOf(product, options[0].id))}
                  {netOf(product, options[0].id) === null ? null : (
                    <span className="block text-[0.6875rem] font-medium text-ink-muted">
                      KDV Hariç{' '}
                      {formatMoney(
                        netOf(product, options[0].id)!,
                        currencyOf(product, options[0].id),
                      )}
                    </span>
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function Box({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="flex size-9 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className={[
          'flex size-5 items-center justify-center rounded-md border-2 transition-colors',
          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-field-border',
        ].join(' ')}
      >
        {checked ? <Check className="size-3.5" /> : null}
      </span>
    </button>
  );
}
