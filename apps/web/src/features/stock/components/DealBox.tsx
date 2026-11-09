import { Tag } from 'lucide-react';
import { Link } from 'react-router';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { DEALS_PATH } from '../../../config/navigation';
import { DealBadge } from '../../deals/components/DealBadge';
import type { Deal } from '../../deals/types';

interface DealBoxProps {
  deals: Deal[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

/**
 * Fırsat Yönetimi kutusunun içeriği: aktif fırsatlar rozetleriyle listelenir, her biri tek
 * dokunuşla açılıp kapanır. Rozetin ürün resmindeki yeri ve boyutu burada değil, Fırsatlar
 * ekranında ayarlanır (sade kalsın diye). Seçili ama sonradan pasifleşen fırsat yine görünür.
 */
export function DealBox({ deals, selectedIds, onToggle }: DealBoxProps) {
  const shown = deals.filter((d) => d.active || selectedIds.includes(d.id));

  if (shown.length === 0) {
    return (
      <p className="px-1 text-sm text-ink-muted">
        Henüz fırsat yok.{' '}
        <Link to={DEALS_PATH} className="font-semibold text-brand-ink underline">
          Fırsatlar ekranından
        </Link>{' '}
        ekleyebilirsin.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Fırsatlar" className="flex flex-col gap-1.5">
        {shown.map((deal) => (
          <li
            key={deal.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-2.5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
              {deal.iconUrl ? (
                <DealBadge url={deal.iconUrl} className="size-7" />
              ) : (
                <Tag className="size-4 text-ink-muted" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {deal.name}
              {deal.active ? null : (
                <span className="ml-1.5 text-xs font-medium text-ink-muted">(pasif)</span>
              )}
            </span>
            <ToggleSwitch
              label={`${deal.name} fırsatı`}
              checked={selectedIds.includes(deal.id)}
              onChange={() => onToggle(deal.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
