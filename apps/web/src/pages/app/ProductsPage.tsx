import { ChevronRight, Hammer, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { DEALS_PATH } from '../../config/navigation';

/**
 * Ürünler sayfası (ürün listesi sıradaki adımda tasarlanacak). Şimdilik ürün işleri için
 * kısayollar ("Ürün Araçları") burada durur: Fırsatlar, ileride Toplu Görsel.
 */
export function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="araclar" className="flex flex-col gap-3">
        <h2 id="araclar" className="px-2 text-sm font-bold tracking-wide text-ink-muted uppercase">
          Ürün Araçları
        </h2>
        <Link
          to={DEALS_PATH}
          className="flex min-h-20 items-center gap-4 rounded-3xl border border-line bg-surface-raised p-4 transition-colors hover:border-brand-500/60"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">Fırsatlar</span>
            <span className="block text-sm text-ink-muted">
              Ürünlerin üstünde görünen rozetleri yönet.
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>
      </section>

      <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-12 text-center">
        <Hammer className="size-8 text-brand-ink" aria-hidden="true" />
        <p className="text-lg font-bold">Ürün Listesi</p>
        <p className="text-ink-muted">Bu bölüm sıradaki adımda tasarlanacak.</p>
      </div>
    </div>
  );
}
