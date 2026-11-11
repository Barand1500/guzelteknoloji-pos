import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { useImageAppearance } from '../../features/workspace/workspace-context';
import { withoutWhiteBackground } from '../../lib/image-background';

export function CatalogImage({
  page,
  src,
  alt = '',
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { page: string; src: string }) {
  const enabled = useImageAppearance(page);
  const [processed, setProcessed] = useState<{ original: string; image: string } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void withoutWhiteBackground(src).then((image) => {
      if (active) setProcessed({ original: src, image });
    });
    return () => {
      active = false;
    };
  }, [enabled, src]);
  return (
    <img
      data-image-frame={page}
      {...props}
      alt={alt}
      src={enabled && processed?.original === src ? processed.image : src}
      // Ürün görsellerinde saydam kalan alan sayfa metnini göstermesin: kutunun arkası düz yüzey olur.
      style={
        page === 'products'
          ? { backgroundColor: 'var(--color-surface-muted)', ...props.style }
          : props.style
      }
    />
  );
}
