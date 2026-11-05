import { Hammer } from 'lucide-react';
import { useLocation } from 'react-router';
import { PAGE_TITLES } from '../../config/navigation';

/** Henüz tasarlanmamış sayfalar için geçici yer tutucu (sayfa sayfa ilerleniyor). */
export function ComingSoonPage() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-16 text-center">
      <Hammer className="size-8 text-brand-ink" aria-hidden="true" />
      <p className="text-lg font-bold">{PAGE_TITLES[pathname] ?? 'Sayfa'}</p>
      <p className="text-ink-muted">Bu sayfa sıradaki adımda tasarlanacak.</p>
    </div>
  );
}
