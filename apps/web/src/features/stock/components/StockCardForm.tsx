import { ChevronLeft } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { PRODUCTS_PATH } from '../../../config/navigation';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { useSession } from '../../auth/hooks/session-context';
import { hasDevAccess } from '../../dev-login/devAccess';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { NextProductBar } from '../../products/components/NextProductBar';
import { useStockEditor } from '../hooks/useStockEditor';
import { stockService, stockErrorMessage, type StockService } from '../services/stock.service';
import { demoStockService } from '../services/stock.demo';
import type { StockCardDraft, StockExtraOptions, StockExtras, StockLookups } from '../types';
import { DesktopStockLayout } from './DesktopStockLayout';
import { MobileStockLayout } from './MobileStockLayout';
import { StockSavedScreen } from './StockSavedScreen';
import { VariantEditor } from './VariantEditor';
import type { SideBoxId } from './StockSidePanel';

interface StockCardFormProps {
  /** Verilirse bu kayıtlı kart dolu gelir ve Kaydet onu günceller (düzenleme). */
  cardId?: string;
  /** Verilirse bu kartın kopyası dolu gelir ama YENİ kayıt olarak kaydedilir. */
  copyFromId?: string;
  /** Hangi yan kutu açık gelsin (kayıt sonrası ekrandan bir karta dokunulunca). */
  initialBox?: SideBoxId;
}

/** Ekranın ihtiyaç duyduğu, sunucudan yüklenen her şey. */
interface Loaded {
  lookups: StockLookups;
  /** Düzenleme/kopya için dolu kart; yeni kartta yok. */
  draft?: StockCardDraft;
  extras?: StockExtras;
  /** `null`: kategori/fırsat kutuları sunucuya bağlı değil (kilitli). */
  extraOptions: StockExtraOptions | null;
}

/** Veriyi yükler; hazır olunca düzenleyiciyi gösterir (listeler yüklenmeden hook'lar kurulamaz). */
export function StockCardForm({ cardId, copyFromId, initialBox }: StockCardFormProps = {}) {
  const { session } = useSession();
  const sourceId = cardId ?? copyFromId;
  // Test düğmesi kalır; gerçek kullanıcı asla sahte kayda yönlendirilmez.
  const devUser = session.status === 'anonymous' && hasDevAccess();
  const demo = devUser;
  const service = demo ? demoStockService : stockService;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (session.status === 'loading') return;
    let active = true;
    void Promise.all([
      service.getLookups(),
      sourceId ? service.get(sourceId) : undefined,
      sourceId ? service.getExtras(sourceId) : undefined,
      service.getExtraOptions(),
    ])
      .then(([lookups, card, extras, extraOptions]) => {
        if (!active) return;
        setLoaded({
          lookups,
          extraOptions,
          // Kopya yeni kayıttır: ad ve kod, asıl kartla karışmasın diye ayrıştırılır.
          ...(card
            ? {
                draft: copyFromId
                  ? { ...card, name: `${card.name} (Kopya)`, code: `${card.code}-KOPYA` }
                  : card,
              }
            : {}),
          ...(extras ? { extras } : {}),
        });
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
            setLoaded(null);
            setRetry((n) => n + 1);
          }}
        >
          Tekrar Dene
        </Button>
      </div>
    );

  if (!loaded) {
    return (
      <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-muted" aria-busy="true" />
    );
  }
  return (
    <StockCardEditor
      key={`${demo ? 'demo' : session.user?.id}:${sourceId ?? 'yeni'}`}
      devUser={devUser}
      loaded={loaded}
      service={service}
      demo={demo}
      {...(cardId ? { cardId } : {})}
      {...(initialBox ? { initialBox } : {})}
      mode={cardId ? 'edit' : copyFromId ? 'copy' : 'create'}
    />
  );
}

/**
 * Durum tek yerde (useStockEditor); görünüm ekrana göre seçilir: geniş ekran (≥80rem) tek sayfa +
 * sağda yan kutular, daha dar ekran sekmeli/kaydırmalı düzen. Aynı anda yalnızca biri çizilir.
 */
function StockCardEditor({
  loaded,
  service,
  demo,
  devUser,
  cardId,
  initialBox,
  mode,
}: {
  loaded: Loaded;
  service: StockService;
  demo: boolean;
  /** Test kullanıcısı mı (değilse sahte listeden açılan deneme ürünüdür). */
  devUser: boolean;
  cardId?: string;
  initialBox?: SideBoxId;
  mode: 'create' | 'edit' | 'copy';
}) {
  const [variantState, setVariantState] = useState({
    dirty: false,
    busy: false,
    count: 0,
    quantity: '0',
  });
  const editor = useStockEditor(loaded.lookups, service, {
    ...(loaded.draft ? { initialDraft: loaded.draft } : {}),
    ...(loaded.extras ? { initialExtras: loaded.extras } : {}),
    ...(cardId ? { cardId } : {}),
    extraOptions: loaded.extraOptions,
    stayOnSave: variantState.dirty,
    ...(variantState.count ? { variantStock: variantState.quantity } : {}),
  });
  const wide = useMediaQuery('(min-width: 80rem)');
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);
  const allowLeave = useRef(false);
  const previousVariantCount = useRef(0);
  const syncVariantQuantity = editor.syncVariantQuantity;
  const onVariantStateChange = useCallback(
    (state: typeof variantState) => {
      if (state.count || previousVariantCount.current) syncVariantQuantity(state.quantity);
      previousVariantCount.current = state.count;
      setVariantState(state);
    },
    [syncVariantQuantity],
  );
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editor.saveError)
      errorRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [editor.saveError]);
  useEffect(() => {
    if (!editor.dirty && !variantState.dirty && !variantState.busy && !editor.saving) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (allowLeave.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.getAttribute('href')?.startsWith('#') ||
        anchor.hasAttribute('download') ||
        anchor.target === '_blank' ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = new URL(anchor.href);
      if (!['http:', 'https:'].includes(target.protocol)) return;
      if (
        target.origin === window.location.origin &&
        target.pathname + target.search + target.hash ===
          location.pathname + location.search + location.hash
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (!variantState.busy && !editor.saving) setPendingLeave(target.href);
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [
    editor.dirty,
    editor.saving,
    variantState.dirty,
    variantState.busy,
    location.pathname,
    location.search,
    location.hash,
  ]);

  const savedScreen = editor.saved ? (
    <StockSavedScreen
      mode={mode}
      demo={demo}
      name={editor.draft.name}
      code={editor.draft.code}
      brand={editor.lookups.brands.find((b) => b.value === editor.draft.brand)?.label ?? ''}
      savedId={editor.savedId}
      extras={editor.extras}
      extraOptions={editor.extraOptions}
      onNew={editor.startOver}
      onKeepEditing={editor.keepEditing}
    />
  ) : null;

  return (
    <>
      <ConfirmSheet
        open={pendingLeave !== null}
        title="Kaydedilmemiş Değişiklikler"
        description="Yaptığın değişiklikler henüz kaydedilmedi. Sayfadan ayrılırsan bu değişiklikler kaybolacak."
        confirmLabel="Kaydetmeden Ayrıl"
        cancelLabel="Düzenlemeye Devam Et"
        onClose={() => setPendingLeave(null)}
        onConfirm={() => {
          if (!pendingLeave || editor.saving || variantState.busy) return;
          const target = new URL(pendingLeave);
          setPendingLeave(null);
          if (target.origin === window.location.origin)
            navigate(target.pathname + target.search + target.hash);
          else {
            allowLeave.current = true;
            window.location.assign(target.href);
          }
        }}
      />
      {savedScreen}
      {editor.saved && variantState.dirty && (
        <Alert tone="info">
          Stok kartı kaydedildi. Varyant değişiklikleri henüz kaydedilmedi; düzenlemeye devam ederek
          “Varyantları kaydet” düğmesine basın.
        </Alert>
      )}
      <div
        hidden={editor.saved}
        className={editor.saved ? 'hidden' : 'flex min-w-0 flex-col gap-4 pr-10 sm:pr-12'}
      >
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
            {/* Sağdaki boşluk: sıradaki ürüne geçiş (yalnızca düzenlemede). */}
            {mode === 'edit' && cardId ? (
              <div className="w-full sm:ml-auto sm:w-auto">
                <NextProductBar
                  currentId={cardId}
                  dirty={editor.dirty || variantState.dirty || variantState.busy}
                />
              </div>
            ) : null}
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
        {editor.saveNotice && <Alert tone="info">{editor.saveNotice}</Alert>}
        <fieldset
          disabled={editor.saving || variantState.busy}
          className="m-0 min-w-0 border-0 p-0"
          aria-busy={editor.saving}
        >
          {wide ? (
            <DesktopStockLayout editor={editor} initialBox={initialBox ?? null} />
          ) : (
            <MobileStockLayout editor={editor} initialBox={initialBox ?? null} />
          )}
          {cardId && !demo && loaded.extraOptions?.attributes ? (
            <VariantEditor
              cardId={cardId}
              attributes={loaded.extraOptions.attributes}
              selectedIds={editor.extras.attributeValueIds ?? []}
              disabled={editor.dirty}
              onStateChange={onVariantStateChange}
            />
          ) : null}
        </fieldset>
      </div>
    </>
  );
}
