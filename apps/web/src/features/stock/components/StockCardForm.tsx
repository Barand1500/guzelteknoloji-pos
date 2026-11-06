import { ChevronLeft } from 'lucide-react';
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
import { StockSavedScreen } from './StockSavedScreen';

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
  const sourceId = cardId ?? copyFromId;
  // Ürün listesi henüz sunucuya bağlı değil (sahte liste): onun "p1" gibi metin kimlikli ürünleri
  // sunucuda yoktur. Bunlar deneme servisiyle açılır; gerçek kartların kimliği sayıdır.
  // Liste gerçek API'ye bağlanınca bu satır kalkar.
  const mockSource = sourceId !== undefined && !/^[0-9]+$/.test(sourceId);
  const devUser = session.status === 'anonymous' && hasDevAccess();
  const demo = devUser || mockSource;
  const service = demo ? demoStockService : stockService;
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
      devUser={devUser}
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
  devUser,
  initialDraft,
  cardId,
  mode,
}: {
  lookups: StockLookups;
  service: StockService;
  demo: boolean;
  /** Test kullanıcısı mı (değilse sahte listeden açılan deneme ürünüdür). */
  devUser: boolean;
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
      <StockSavedScreen
        mode={mode}
        demo={demo}
        name={editor.draft.name}
        code={editor.draft.code}
        brand={editor.lookups.brands.find((b) => b.value === editor.draft.brand)?.label ?? ''}
        savedId={editor.savedId}
        onNew={editor.startOver}
        onKeepEditing={editor.keepEditing}
      />
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
          {devUser ? 'Test Kullanıcısı · ' : 'Deneme ürünü · '}Deneme verileriyle çalışıyorsunuz;
          değişiklikler veritabanına kaydedilmez.
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
