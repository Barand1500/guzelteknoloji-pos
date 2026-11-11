import { ArrowUpRight, CircleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { stockEditPath } from '../../../config/navigation';
import { useDuplicate } from '../duplicate-check';

/**
 * Yazılan kod/barkod başka üründe varsa alanın altında kaydetmeden önce uyarır:
 * "Bu kod kullanılıyor: Ürün adı · Ürüne git". Bağlantı yeni sekmede açılır; formdaki yazdıkların kaybolmaz.
 */
export function DuplicateNote({ kind, value }: { kind: 'code' | 'barcode'; value: string }) {
  const hit = useDuplicate(kind, value);
  if (!hit) return null;
  return (
    <p
      role="status"
      className="mt-2 flex animate-fade-in flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-brand-50 px-3 py-2 text-sm text-ink"
    >
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <CircleAlert className="size-4" aria-hidden="true" />
      </span>
      <span>
        {kind === 'code' ? 'Bu kod kullanılıyor:' : 'Bu barkod kullanılıyor:'}{' '}
        <strong className="font-bold">{hit.name || hit.code}</strong>
      </span>
      <Link
        to={stockEditPath(hit.id)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 font-bold text-brand-ink underline underline-offset-2"
      >
        Ürüne git
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </p>
  );
}
