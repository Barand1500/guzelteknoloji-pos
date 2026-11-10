import { ArrowRight, Merge, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { PickList } from '../../../components/ui/PickList';
import { Sheet } from '../../../components/ui/Sheet';
import { stockErrorMessage } from '../../stock/services/stock.service';
import { brandKey } from '../brand-name';
import type { Brand } from '../types';

interface BrandMergeSheetProps {
  brand: Brand;
  brands: Brand[];
  onMerge: (targetId: string) => Promise<void>;
  onClose: () => void;
}

/** "Birleştir": marka, seçilen başka bir markanın içine katılır; ürünleri hedefe geçer, kendisi silinir. */
export function BrandMergeSheet({ brand, brands, onMerge, onClose }: BrandMergeSheetProps) {
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adı benzeyenler (Apple / APPLE) listenin başında durur.
  const options = useMemo(() => {
    const key = brandKey(brand.name);
    const others = brands.filter((b) => b.id !== brand.id);
    const similar = others.filter((b) => brandKey(b.name) === key);
    const rest = others.filter((b) => brandKey(b.name) !== key);
    return [...similar, ...rest].map((b) => ({
      value: b.id,
      label: similar.includes(b) ? `${b.name} · benzer ad` : b.name,
    }));
  }, [brands, brand]);
  const target = brands.find((b) => b.id === targetId);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await onMerge(target.id);
    } catch (e) {
      setError(stockErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Markayı Birleştir"
      description="Hangi markanın içine katılsın?"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-muted p-4">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-surface-raised px-4 py-2 font-bold shadow-soft">
            <Merge className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="truncate">{brand.name}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span
            className={[
              'inline-flex min-w-0 items-center rounded-full px-4 py-2 font-bold',
              target
                ? 'bg-brand-50 text-brand-ink'
                : 'border border-dashed border-line-strong/60 text-ink-muted',
            ].join(' ')}
          >
            <span className="truncate">{target ? target.name : 'Hedef seçin'}</span>
          </span>
        </div>

        <p className="text-sm leading-relaxed text-ink-muted">
          {brand.productCount > 0 ? (
            <>
              <b className="text-ink">{brand.productCount} ürün</b> seçtiğin markaya taşınır
            </>
          ) : (
            <>Bu markada ürün yok</>
          )}
          ; sonra <b className="text-ink">{brand.name}</b> silinir.
        </p>

        <PickList label="Hedef marka" options={options} value={targetId} onChange={setTargetId} />

        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
          Bu işlem geri alınamaz.
        </p>

        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Button variant="ghost" flow={false} fullWidth={false} onClick={onClose}>
            Vazgeç
          </Button>
          <div className="flex-1">
            <Button
              flow={false}
              disabled={!target}
              loading={busy}
              loadingLabel="Birleştiriliyor…"
              onClick={() => void submit()}
              leadingIcon={<Merge className="size-5" aria-hidden="true" />}
            >
              Birleştir
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
