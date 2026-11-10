import { ArrowRight, Merge, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { PickList } from '../../../components/ui/PickList';
import { Sheet } from '../../../components/ui/Sheet';
import { dataError } from '../../../lib/catalog-data';
import { flattenTree } from '../tree';
import type { Category } from '../types';

interface CategoryMergeSheetProps {
  category: Category;
  categories: Category[];
  /** Kategoriyi hedefin içine birleştirir; hata olursa fırlatır. */
  onMerge: (targetId: string) => Promise<void>;
  onClose: () => void;
}

/**
 * "Birleştir": kategori, seçilen başka bir kategorinin içine tek adımda katılır. Ürünleri ve alt
 * kategorileri hedefe taşınır, kendisi silinir. Üstte ne olacağı görsel olarak (A → B) gösterilir.
 */
export function CategoryMergeSheet({
  category,
  categories,
  onMerge,
  onClose,
}: CategoryMergeSheetProps) {
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      flattenTree(categories)
        .filter(({ category: c }) => c.id !== category.id)
        .map(({ category: c, depth }) => ({ value: c.id, label: c.name, depth })),
    [categories, category.id],
  );
  const target = categories.find((c) => c.id === targetId);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await onMerge(target.id);
    } catch (e) {
      setError(dataError(e));
      setBusy(false);
    }
  };

  const moved = [
    category.productCount > 0 ? `${category.productCount} ürün` : null,
    category.childCount > 0 ? `${category.childCount} alt kategori` : null,
  ].filter(Boolean);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Kategoriyi Birleştir"
      description="Hangi kategorinin içine katılsın?"
    >
      <div className="flex flex-col gap-5">
        {/* Görsel özet: Kaynak → Hedef */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-muted p-4">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-surface-raised px-4 py-2 font-bold shadow-soft">
            <Merge className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="truncate">{category.name}</span>
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
          {moved.length > 0 ? (
            <>
              <b className="text-ink">{moved.join(' ve ')}</b> seçtiğin kategoriye taşınır
            </>
          ) : (
            <>Bu kategoride ürün ya da alt kategori yok</>
          )}
          ; sonra <b className="text-ink">{category.name}</b> silinir.
        </p>

        <PickList
          label="Hedef kategori"
          options={options}
          value={targetId}
          onChange={setTargetId}
        />

        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
          Bu işlem geri alınamaz. Aynı adda alt kategori varsa birleştirme yapılmaz.
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
