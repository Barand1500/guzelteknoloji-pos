import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { PRODUCTS_PATH } from '../../../config/navigation';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { useSession } from '../../auth/hooks/session-context';
import { hasDevAccess } from '../../dev-login/devAccess';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useStockEditor } from '../hooks/useStockEditor';
import { stockService, stockErrorMessage, type StockService } from '../services/stock.service';
import { demoStockService } from '../services/stock.demo';
import type { StockCardDraft, StockLookups } from '../types';
import { DesktopStockLayout } from './DesktopStockLayout';
import { MobileStockLayout } from './MobileStockLayout';

interface StockCardFormProps {
  /** Verilirse bu kayıtlı kart dolu gelir ve Kaydet onu günceller (düzenleme). */
  cardId?: string;
  /** Verilirse bu kartın kopyası dolu gelir ama YENİ kayıt olarak kaydedilir. */
  copyFromId?: string;
}

/** Veriyi yükler; hazır olunca düzenleyiciyi gösterir (listeler yüklenmeden hook'lar kurulamaz). */
export function StockCardForm({ cardId, copyFromId }: StockCardFormProps = {}) {
  const { session } = useSession();
  // Test düğmesi kalır; gerçek kullanıcı asla sahte kayda yönlendirilmez.
  const demo = session.status === 'anonymous' && hasDevAccess();
  const service = demo ? demoStockService : stockService;
  const sourceId = cardId ?? copyFromId;
  const [lookups, setLookups] = useState<StockLookups | null>(null);
  const [initial, setInitial] = useState<StockCardDraft | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (session.status === 'loading') return;
    let active = true;
    void Promise.all([service.getLookups(), sourceId ? service.get(sourceId) : undefined])
      .then(([data, card]) => {
        if (!active) return;
        setLookups(data);
        // Kopya yeni kayıttır: ad ve kod, asıl kartla karışmasın diye ayrıştırılır.
        setInitial(
          card && copyFromId
            ? { ...card, name: `${card.name} (Kopya)`, code: `${card.code}-KOPYA` }
            : card,
        );
      })
      .catch((error: unknown) => active && setLoadError(stockErrorMessage(error)));
    return () => {
      active = false;
    };
  }, [service, retry, session.status, sourceId, copyFromId]);

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
      key={`${demo ? 'demo' : session.user?.id}:${sourceId ?? 'yeni'}`}
      lookups={lookups}
      service={service}
      demo={demo}
      {...(initial ? { initialDraft: initial } : {})}
      {...(cardId ? { cardId } : {})}
      mode={cardId ? 'edit' : copyFromId ? 'copy' : 'create'}
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
  initialDraft,
  cardId,
  mode,
}: {
  lookups: StockLookups;
  service: StockService;
  demo: boolean;
  initialDraft?: StockCardDraft;
  cardId?: string;
  mode: 'create' | 'edit' | 'copy';
}) {
  const editor = useStockEditor(lookups, service, {
    ...(initialDraft ? { initialDraft } : {}),
    ...(cardId ? { cardId } : {}),
  });
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
          {demo
            ? 'Deneme tamamlandı!'
            : mode === 'edit'
              ? 'Stok kartı güncellendi!'
              : 'Stok kartı kaydedildi!'}
        </p>
        {demo ? (
          <p className="text-sm text-ink-muted">Deneme verisi veritabanına kaydedilmedi.</p>
        ) : null}
        <p className="text-ink-muted">{editor.draft.name || editor.draft.code || 'Yeni ürün'}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            to={PRODUCTS_PATH}
            className="inline-flex min-h-12 items-center rounded-full border border-field-border px-6 font-semibold transition-colors hover:border-brand-500"
          >
            Ürünlere Dön
          </Link>
          {mode === 'edit' ? null : (
            <Button fullWidth={false} onClick={editor.startOver}>
              Yeni Stok Kartı
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {mode === 'create' ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={PRODUCTS_PATH}
            aria-label="Ürünlere dön"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted transition-colors hover:bg-brand-50 hover:text-brand-ink"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <p className="min-w-0 flex-1 text-sm font-bold text-ink-muted">
            {mode === 'copy' ? 'Kopya · kaydedene kadar yeni ürün oluşmaz' : 'Düzenleniyor'}
            <span className="block truncate text-base text-ink">
              {editor.draft.name || editor.draft.code}
            </span>
          </p>
        </div>
      )}
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
