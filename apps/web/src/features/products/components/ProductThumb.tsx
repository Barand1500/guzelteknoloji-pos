import { CatalogImage } from '../../../components/ui/CatalogImage';
import { Package, ZoomIn } from 'lucide-react';
import type { ProductItem } from '../types';

interface ProductThumbProps {
  product: ProductItem;
  /** Boyut: sm = 44px (liste), md = 56px. */
  size?: 'sm' | 'md';
  /** Verilirse küçük bir büyüteç düğmesi çıkar (telefonda resmi büyütmek için). */
  onZoom?: () => void;
  /** Masaüstü: fare üstüne gelince büyük önizleme açılır. */
  hoverPreview?: boolean;
}

/** Ürün resmi küçük kutusu; resim yoksa paket simgesi görünür. */
export function ProductThumb({ product, size = 'sm', onZoom, hoverPreview }: ProductThumbProps) {
  const box = size === 'sm' ? 'size-11' : 'size-14';
  return (
    <span className={`group/thumb relative inline-block shrink-0 ${box}`}>
      <span
        data-image-frame={product.imageUrl ? 'products' : undefined}
        className={`flex size-full items-center justify-center overflow-hidden rounded-2xl bg-surface-muted ${box}`}
      >
        {product.imageUrl ? (
          <CatalogImage
            page="products"
            src={product.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Package className="size-5 text-ink-muted" aria-hidden="true" />
        )}
      </span>
      {onZoom && product.imageUrl ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          aria-label={`${product.name} resmini büyüt`}
          className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-surface shadow-soft"
        >
          <ZoomIn className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {hoverPreview && product.imageUrl ? (
        <span
          data-image-frame="products"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-full z-30 ml-3 hidden size-52 -translate-y-1/2 overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card group-hover/thumb:block"
        >
          <CatalogImage
            page="products"
            src={product.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        </span>
      ) : null}
    </span>
  );
}
