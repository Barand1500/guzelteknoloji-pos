import { Check, MoreVertical } from 'lucide-react';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import {
  currencyOf,
  formatMoney,
  grossOf,
  moneyOrDash,
  netOf,
  type PriceColumn,
  type ProductItem,
} from '../types';
import { ProductThumb } from './ProductThumb';
import { StockBadge } from './StockBadge';

interface ProductTableProps {
  products: ProductItem[];
  /** Gösterilecek fiyat sütunları: kullanıcının fiyat listeleri (ve isteğe bağlı Alış), kendi adlarıyla. */
  columns: PriceColumn[];
  selected: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (select: boolean) => void;
  onEdit: (product: ProductItem) => void;
  onMore: (product: ProductItem) => void;
  onStockTracking: (id: string, on: boolean) => void;
  onSales: (id: string, on: boolean) => void;
}

/** Masaüstü tablo görünümü: seçilen fiyat listeleri yan yana, resim üstüne gelince büyük önizleme. */
export function ProductTable({
  products,
  columns,
  selected,
  onToggleSelect,
  onToggleAll,
  onEdit,
  onMore,
  onStockTracking,
  onSales,
}: ProductTableProps) {
  const allOn = products.length > 0 && products.every((p) => selected.has(p.id));
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
            {columns.map((column) => (
              <th key={column.id} className="p-3 text-right">
                {column.name}
              </th>
            ))}
            <th className="p-3">Stok</th>
            <th className="p-3 text-center">Stok Takibi</th>
            <th className="p-3 text-center">Satış</th>
            <th className="w-12 p-3">
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
                  <ProductThumb product={p} hoverPreview />
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
              {columns.map((column) => {
                const net = netOf(p, column.id);
                const currency = currencyOf(p, column.id);
                return (
                  <td key={column.id} className="p-3 text-right font-bold whitespace-nowrap">
                    {moneyOrDash(grossOf(p, column.id), currency)}
                    {net === null ? null : (
                      <span className="block text-xs font-medium text-ink-muted">
                        KDV hariç {formatMoney(net, currency)}
                      </span>
                    )}
                  </td>
                );
              })}
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
                <button
                  type="button"
                  aria-label={`${p.name} işlemleri`}
                  onClick={() => onMore(p)}
                  className="flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <MoreVertical className="size-5" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
