import { CatalogImage } from '../../../components/ui/CatalogImage';
interface HoverZoomImageProps {
  src: string;
  alt: string;
  /** Küçük resmin sınıfları (boyut, kenarlık vb.). */
  className: string;
}

/** Küçük resim; üzerine gelince büyük hali yanında belirir (ürün listesindeki gibi). Dokunmatikte etkisizdir. */
export function HoverZoomImage({ src, alt, className }: HoverZoomImageProps) {
  return (
    <span className="group/zoom relative inline-block shrink-0">
      <CatalogImage page="products" src={src} alt={alt} className={className} draggable={false} />
      <span
        aria-hidden="true"
        data-zoom-card=""
        className="pointer-events-none absolute top-1/2 left-full z-30 ml-3 hidden size-52 -translate-y-1/2 overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card group-hover/zoom:block"
      >
        <CatalogImage
          page="products"
          src={src}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      </span>
    </span>
  );
}
