import { Plus } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface UnitPagerProps {
  /** Her birim için bir kart (sırayla). */
  slides: ReactNode[];
  /** Şu an seçili birimin sırası (sekmeler arasında korunur). */
  active: number;
  onActiveChange: (index: number) => void;
  /** Sondaki "Birim Ekle" kartına dokunulunca çağrılır. */
  onAdd: () => void;
  label: string;
}

/**
 * Birimleri yana kaydırılan kartlar olarak gösterir (parmakla kaydır, yerine otursun).
 * En sonda "Birim Ekle" kartı vardır; altta nokta göstergesi. Seçili birim sekmeler arasında korunur.
 */
export function UnitPager({ slides, active, onActiveChange, onAdd, label }: UnitPagerProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const count = slides.length;
  // Kaydırma sırasında en yakın kart (son kart = "Birim Ekle").
  const [current, setCurrent] = useState(active);

  /** i. kartı ortalayan kaydırma konumu. */
  const targetLeft = useCallback((i: number) => {
    const el = scroller.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (!el || !kid) return 0;
    return kid.offsetLeft - (el.clientWidth - kid.offsetWidth) / 2;
  }, []);

  const nearest = useCallback(() => {
    const el = scroller.current;
    if (!el) return 0;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const distance = Math.abs(targetLeft(i) - el.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }, [targetLeft]);

  const scrollToIndex = useCallback(
    (i: number, smooth = true) => {
      scroller.current?.scrollTo?.({ left: targetLeft(i), behavior: smooth ? 'smooth' : 'auto' });
    },
    [targetLeft],
  );

  // Açılışta seçili birime git (anında).
  useLayoutEffect(() => {
    scrollToIndex(Math.min(active, count - 1), false);
    // yalnızca ilk yerleşimde
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dışarıdan seçili birim değişirse (yeni birim eklendi vb.) oraya kaydır.
  useEffect(() => {
    if (active < count && nearest() !== active) scrollToIndex(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, count]);

  const onScroll = () => {
    const i = nearest();
    setCurrent(i);
    if (i < count && i !== active) onActiveChange(i);
  };

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        role="group"
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-[88%] max-w-xl shrink-0 snap-center">
            {slide}
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex w-[60%] max-w-xs shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong/60 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-50"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-50">
            <Plus className="size-6" aria-hidden="true" />
          </span>
          Birim Ekle
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5" aria-hidden="false">
        {Array.from({ length: count + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-label={i < count ? `${i + 1}. birime git` : 'Birim ekleme kartına git'}
            onClick={() => scrollToIndex(i)}
            className={[
              'h-2 rounded-full transition-all duration-300',
              i === current ? 'w-6 bg-brand-600' : 'w-2 bg-line-strong/40',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
