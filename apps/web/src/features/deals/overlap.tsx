import { TriangleAlert } from 'lucide-react';
import { positionLabel, type Deal, type DealProductRef } from './types';

/**
 * Rozet çakışması: aynı üründe, ürün resminde gösterilen iki aktif fırsat aynı konumdaysa rozetler
 * üst üste biner. Verilen ürünler için, `deal` ile çakışan diğer fırsatları ve kaç üründe
 * çakıştığını yazı olarak döndürür.
 */
export function overlapNotes(
  deal: Pick<Deal, 'id' | 'showOnImage' | 'position'>,
  allDeals: Deal[],
  products: DealProductRef[],
  productIds: ReadonlySet<string> | string[],
): string[] {
  if (!deal.showOnImage) return [];
  const wanted = new Set(productIds);
  const rivals = allDeals.filter(
    (d) => d.id !== deal.id && d.active && d.showOnImage && d.position === deal.position,
  );
  const notes: string[] = [];
  for (const rival of rivals) {
    const count = products.filter((p) => wanted.has(p.id) && p.dealIds.includes(rival.id)).length;
    if (count > 0)
      notes.push(
        `${count} üründe “${rival.name}” fırsatı da ${positionLabel(deal.position)} konumunda; rozetler üst üste biner.`,
      );
  }
  return notes;
}

/** Çakışma uyarısı kutusu (ekleme yapılmasını engellemez, yalnızca haber verir). */
export function OverlapNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div
      role="note"
      className="flex flex-col gap-1.5 rounded-2xl bg-brand-50 p-3 text-sm text-brand-ink"
    >
      {notes.map((n) => (
        <p key={n} className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {n}
        </p>
      ))}
    </div>
  );
}
