import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useStockEditor } from '../hooks/useStockEditor';
import { stockService } from '../services/stock.service';
import type { StockLookups } from '../types';
import { DesktopStockLayout } from './DesktopStockLayout';
import { MobileStockLayout } from './MobileStockLayout';

/** Veriyi yükler; hazır olunca düzenleyiciyi gösterir (listeler yüklenmeden hook'lar kurulamaz). */
export function StockCardForm() {
  const [lookups, setLookups] = useState<StockLookups | null>(null);

  useEffect(() => {
    let active = true;
    void stockService.getLookups().then((data) => active && setLookups(data));
    return () => {
      active = false;
    };
  }, []);

  if (!lookups) {
    return (
      <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-muted" aria-busy="true" />
    );
  }
  return <StockCardEditor lookups={lookups} />;
}

/**
 * Durum tek yerde (useStockEditor); görünüm ekrana göre seçilir: geniş ekran (≥80rem) tek sayfa +
 * sağda özet, daha dar ekran sekmeli/kaydırmalı düzen. Aynı anda yalnızca biri çizilir.
 */
function StockCardEditor({ lookups }: { lookups: StockLookups }) {
  const editor = useStockEditor(lookups);
  const wide = useMediaQuery('(min-width: 80rem)');

  if (editor.saved) {
    return (
      <div className="mx-auto flex max-w-xl animate-pop flex-col items-center gap-4 rounded-[1.75rem] bg-surface-raised px-6 py-16 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
        <p className="text-2xl font-extrabold">Stok kartı kaydedildi!</p>
        <p className="text-ink-muted">{editor.draft.name || editor.draft.code || 'Yeni ürün'}</p>
        <Button fullWidth={false} onClick={editor.startOver} className="mt-2">
          Yeni Stok Kartı
        </Button>
      </div>
    );
  }

  return wide ? <DesktopStockLayout editor={editor} /> : <MobileStockLayout editor={editor} />;
}
