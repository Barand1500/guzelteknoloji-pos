import { ChevronLeft, Hammer } from 'lucide-react';
import { Link } from 'react-router';
import { PRODUCTS_PATH } from '../../config/navigation';

/** Ürün düzenle ekranı sıradaki adımda tasarlanacak; şimdilik yer tutucu. */
export function ProductEditPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to={PRODUCTS_PATH}
        className="inline-flex min-h-10 w-fit items-center gap-1 rounded-full bg-surface-muted px-4 text-sm font-semibold"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Ürünlere dön
      </Link>
      <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-16 text-center">
        <Hammer className="size-8 text-brand-ink" aria-hidden="true" />
        <p className="text-lg font-bold">Ürün Düzenle</p>
        <p className="text-ink-muted">Bu ekran sıradaki adımda tasarlanacak.</p>
      </div>
    </div>
  );
}
