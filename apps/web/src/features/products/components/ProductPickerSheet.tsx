import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Sheet } from '../../../components/ui/Sheet';
import type { ProductItem } from '../types';
import { ProductThumb } from './ProductThumb';

interface ProductPickerSheetProps {
  products: ProductItem[];
  /** Pencerenin başlığı altında görünen açıklama (ör. hangi dosya için seçildiği). */
  description?: string;
  onPick: (productId: string) => void;
  onClose: () => void;
}

const PAGE_SIZE = 8;
const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Ürün seçme penceresi: arama kutusu + sayfalı ürün listesi. Açılır kutuya sığmayacak kadar çok
 * ürün olduğunda (Toplu Görsel'de eşleşmeyen dosya için) ürün burada aranıp seçilir. Ad, kod,
 * marka ve barkoda göre aranır; bir ürüne dokununca seçilir ve pencere kapanır.
 */
export function ProductPickerSheet({
  products,
  description,
  onPick,
  onClose,
}: ProductPickerSheetProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (q === '') return products;
    return products.filter(
      (p) =>
        fold(p.name).includes(q) ||
        fold(p.code).includes(q) ||
        fold(p.brandName).includes(q) ||
        (p.barcodes ?? (p.barcode ? [p.barcode] : [])).some((b) => fold(b).includes(q)),
    );
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Ürün Seç"
      {...(description ? { description } : {})}
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Ad, stok kodu, marka veya barkod"
            aria-label="Ürün ara"
            className="h-12 w-full rounded-control border border-field-border bg-surface pr-4 pl-11 text-base text-ink outline-none placeholder:text-ink-muted focus:border-brand-600"
          />
        </div>

        {shown.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-6 text-center text-ink-muted">
            Eşleşen ürün yok.
          </p>
        ) : (
          <ul aria-label="Ürünler" className="flex flex-col gap-2">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-raised p-2.5 text-left transition-colors hover:border-brand-500 hover:bg-brand-50/50"
                >
                  <ProductThumb product={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      {p.code}
                      {p.brandName ? ` · ${p.brandName}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <nav aria-label="Sayfalar" className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current <= 1}
            aria-label="Önceki sayfa"
            className="inline-flex size-11 items-center justify-center rounded-full bg-surface-muted transition-colors enabled:hover:bg-brand-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <p className="text-sm font-semibold text-ink-muted">
            {matches.length} ürün · Sayfa {current}/{pageCount}
          </p>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount}
            aria-label="Sonraki sayfa"
            className="inline-flex size-11 items-center justify-center rounded-full bg-surface-muted transition-colors enabled:hover:bg-brand-50 disabled:opacity-40"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </Sheet>
  );
}
