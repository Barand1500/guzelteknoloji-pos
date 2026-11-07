import { ArrowRight, Eye } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { stockEditPath } from '../../../config/navigation';
import { useProductService } from '../services/product.service';
import { currencyOf, grossOf, listPricesOf, moneyOrDash, type ProductItem } from '../types';
import { ProductThumb } from './ProductThumb';
import { StockBadge } from './StockBadge';

interface NextProductBarProps {
  /** Şu an düzenlenen ürünün kimliği. */
  currentId: string;
  /** Kaydedilmemiş değişiklik varsa başka ürüne geçmeden önce sorulur. */
  dirty: boolean;
}

/** Önizlemedeki fiyat: ilk fiyat listesinin KDV dahil tutarı (listenin adıyla); fiyat yoksa "—". */
function previewPrice(p: ProductItem): string {
  const first = listPricesOf(p)[0];
  if (!first) return '—';
  return `${first.name} ${moneyOrDash(grossOf(p, first.id), currencyOf(p, first.id))}`;
}

const fold = (s: string) => s.toLocaleLowerCase('tr');
const MAX_OPTIONS = 8;

/**
 * Düzenleme ekranında "Sonraki ürün" çubuğu: altı çizgili tek bir kutu sıradaki ürünün adını
 * gösterir; kutuya tıklayıp yazmaya başlayınca altında ürün listesi açılır, istenen ürün seçilir.
 * Göz simgesinin üstüne gelinince seçili ürünün önizlemesi (resim, ad, kod, fiyat) görünür; ok
 * düğmesi o ürüne geçirir. Kaydedilmemiş değişiklik varsa geçmeden önce sorulur.
 * Ürün listesi henüz sahtedir: düzenlenen ürün listede yoksa (gerçek kart) çubuk görünmez.
 */
export function NextProductBar({ currentId, dirty }: NextProductBarProps) {
  const navigate = useNavigate();
  const service = useProductService();
  const listId = useId();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Liste alınamazsa (ağ hatası) çubuk sessizce gizli kalır; düzenleme ekranı etkilenmez.
    void service
      .list()
      .then((list) => active && setProducts(list))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [service]);

  const index = products.findIndex((p) => p.id === currentId);
  const nextId = index >= 0 ? (products[index + 1]?.id ?? null) : null;
  const targetId = chosenId ?? nextId;
  const target = products.find((p) => p.id === targetId) ?? null;

  const options = useMemo(() => {
    const q = fold(query.trim());
    return products
      .filter((p) => p.id !== currentId)
      .filter(
        (p) =>
          q === '' ||
          fold(p.name).includes(q) ||
          fold(p.code).includes(q) ||
          fold(p.brandName).includes(q),
      )
      .slice(0, MAX_OPTIONS);
  }, [products, query, currentId]);

  if (index < 0) return null;

  const go = (id: string) => {
    if (dirty) setPendingId(id);
    else navigate(stockEditPath(id));
  };
  const pick = (p: ProductItem) => {
    setChosenId(p.id);
    setQuery('');
    setTyping(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setTyping(true);
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = typing ? options[highlight] : undefined;
      if (chosen) pick(chosen);
      else if (targetId) go(targetId);
    } else if (event.key === 'Escape' && typing) {
      event.preventDefault(); // paneli değil yalnızca listeyi kapatır
      setTyping(false);
      setQuery('');
    }
  };

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <label
          htmlFor={`${listId}-input`}
          className="hidden text-xs font-semibold whitespace-nowrap text-ink-muted sm:block"
        >
          Sonraki ürün
        </label>

        <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
          <input
            id={`${listId}-input`}
            role="combobox"
            aria-expanded={typing}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              typing && options[highlight] ? `${listId}-${highlight}` : undefined
            }
            aria-label="Gidilecek ürün"
            autoComplete="off"
            placeholder={target ? undefined : 'Ürün ara…'}
            value={typing ? query : (target?.name ?? '')}
            onFocus={() => {
              setTyping(true);
              setHighlight(0);
            }}
            onBlur={() => {
              // Seçenek tıklaması önce çalışsın diye kapanma bir an geciktirilir.
              window.setTimeout(() => {
                setTyping(false);
                setQuery('');
              }, 120);
            }}
            onChange={(e) => {
              setTyping(true);
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            className="w-full truncate border-0 border-b-2 border-line bg-transparent px-1 py-1.5 text-sm font-semibold text-ink transition-colors outline-none placeholder:font-normal placeholder:text-ink-muted hover:border-brand-500 focus:border-brand-600"
          />
          {typing ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Ürünler"
              className="absolute top-full right-0 left-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface-raised p-1 shadow-card"
            >
              {options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-muted">Eşleşen ürün yok.</li>
              ) : (
                options.map((p, i) => (
                  // Klavyeyle seçim giriş kutusunda yapılır (ok tuşları + Enter); seçenekler odak almaz.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    key={p.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === highlight}
                    // Odak kutudan çıkmadan seçilsin diye fare basışı engellenir.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(p)}
                    onMouseEnter={() => setHighlight(i)}
                    className={[
                      'cursor-pointer rounded-xl px-3 py-2',
                      i === highlight ? 'bg-brand-50' : '',
                    ].join(' ')}
                  >
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{p.code}</span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>

        <span className="group/eye relative">
          <button
            type="button"
            aria-label="Ürün önizlemesi"
            aria-describedby={target ? `${listId}-onizleme` : undefined}
            disabled={!target}
            className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:bg-surface-muted disabled:opacity-40"
          >
            <Eye className="size-5" aria-hidden="true" />
          </button>
          {target ? (
            <span
              id={`${listId}-onizleme`}
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-40 mt-2 hidden w-72 gap-3 rounded-3xl border border-line bg-surface-raised p-3 shadow-card group-focus-within/eye:flex group-hover/eye:flex"
            >
              <ProductThumb product={target} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-ink-muted">{target.brandName}</span>
                <span className="block text-sm leading-snug font-bold">{target.name}</span>
                <span className="mt-0.5 block font-mono text-xs text-ink-muted">{target.code}</span>
                <span className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">{previewPrice(target)}</span>
                  <StockBadge product={target} />
                </span>
              </span>
            </span>
          ) : null}
        </span>

        <button
          type="button"
          onClick={() => targetId && go(targetId)}
          disabled={!targetId}
          aria-label="Sonraki ürüne geç"
          title={targetId ? 'Sonraki ürüne geç' : 'Son ürün'}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition-transform active:scale-95 disabled:opacity-40"
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <ConfirmSheet
        open={pendingId !== null}
        title="Kaydedilmemiş değişiklikler var"
        description="Başka ürüne geçerseniz bu üründeki değişiklikler kaybolur."
        confirmLabel="Yine de Geç"
        onConfirm={() => {
          const id = pendingId;
          setPendingId(null);
          if (id) navigate(stockEditPath(id));
        }}
        onClose={() => setPendingId(null)}
      />
    </>
  );
}
