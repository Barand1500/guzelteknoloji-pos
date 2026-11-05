import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { useSession } from '../../auth/hooks/session-context';
import { hasDevAccess } from '../../dev-login/devAccess';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useStockEditor } from '../hooks/useStockEditor';
import { stockService, stockErrorMessage, type StockService } from '../services/stock.service';
import { demoStockService } from '../services/stock.demo';
import type { StockLookups } from '../types';
import { DesktopStockLayout } from './DesktopStockLayout';
import { MobileStockLayout } from './MobileStockLayout';

/** Veriyi yükler; hazır olunca düzenleyiciyi gösterir (listeler yüklenmeden hook'lar kurulamaz). */
export function StockCardForm() {
  const { session } = useSession();
  // Test düğmesi kalır; gerçek kullanıcı asla sahte kayda yönlendirilmez.
  const demo = session.status === 'anonymous' && hasDevAccess();
  const service = demo ? demoStockService : stockService;
  const [lookups, setLookups] = useState<StockLookups | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (session.status === 'loading') return;
    let active = true;
    void service
      .getLookups()
      .then((data) => active && setLookups(data))
      .catch((error: unknown) => active && setLoadError(stockErrorMessage(error)));
    return () => {
      active = false;
    };
  }, [service, retry, session.status]);

  if (loadError)
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">{loadError}</Alert>
        <Button
          fullWidth={false}
          onClick={() => {
            setLoadError(null);
            setLookups(null);
            setRetry((n) => n + 1);
          }}
        >
          Tekrar Dene
        </Button>
      </div>
    );

  if (!lookups) {
    return (
      <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-muted" aria-busy="true" />
    );
  }
  return (
    <StockCardEditor
      key={demo ? 'demo' : session.user?.id}
      lookups={lookups}
      service={service}
      demo={demo}
    />
  );
}

/**
 * Durum tek yerde (useStockEditor); görünüm ekrana göre seçilir: geniş ekran (≥80rem) tek sayfa +
 * sağda özet, daha dar ekran sekmeli/kaydırmalı düzen. Aynı anda yalnızca biri çizilir.
 */
function StockCardEditor({
  lookups,
  service,
  demo,
}: {
  lookups: StockLookups;
  service: StockService;
  demo: boolean;
}) {
  const editor = useStockEditor(lookups, service);
  const wide = useMediaQuery('(min-width: 80rem)');
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editor.saveError)
      errorRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [editor.saveError]);

  if (editor.saved) {
    return (
      <div className="mx-auto flex max-w-xl animate-pop flex-col items-center gap-4 rounded-[1.75rem] bg-surface-raised px-6 py-16 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
        <p className="text-2xl font-extrabold">
          {demo ? 'Deneme tamamlandı!' : 'Stok kartı kaydedildi!'}
        </p>
        {demo ? (
          <p className="text-sm text-ink-muted">Deneme verisi veritabanına kaydedilmedi.</p>
        ) : null}
        <p className="text-ink-muted">{editor.draft.name || editor.draft.code || 'Yeni ürün'}</p>
        <Button fullWidth={false} onClick={editor.startOver} className="mt-2">
          Yeni Stok Kartı
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {demo ? (
        <p className="text-sm text-ink-muted">
          Test Kullanıcısı · Deneme verileriyle çalışıyorsunuz.
        </p>
      ) : null}
      {editor.saveError ? (
        <div ref={errorRef}>
          <Alert tone="error">{editor.saveError}</Alert>
        </div>
      ) : null}
      <fieldset
        disabled={editor.saving}
        className="m-0 min-w-0 border-0 p-0"
        aria-busy={editor.saving}
      >
        {wide ? <DesktopStockLayout editor={editor} /> : <MobileStockLayout editor={editor} />}
      </fieldset>
    </div>
  );
}
