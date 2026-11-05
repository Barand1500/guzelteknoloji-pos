import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/** Telefonda satırı bu kadar ms basılı tutunca sürükleme başlar. */
const LONG_PRESS_MS = 350;
/** Basılı tutarken parmak bu kadar oynarsa bu bir kaydırma/çekmedir; sürükleme başlamaz. */
const CANCEL_DISTANCE = 8;
/** Fareyle tutamaktan sürüklerken başlama eşiği. */
const MOUSE_DRAG_DISTANCE = 3;
/** Sayfanın kenarına yaklaşınca otomatik kaydırma. */
const EDGE = 90;
const SCROLL_SPEED = 14;
const SETTLE_MS = 170;

export interface SortableRowContext {
  index: number;
  dragging: boolean;
  /** Masaüstündeki sürükleme tutamağı (⠿) için özellikler; telefonda satırı basılı tutmak yeterlidir. */
  handleProps: {
    'data-drag-handle': true;
    'data-handle-id': string;
    'aria-label': string;
    onKeyDown: (event: ReactKeyboardEvent) => void;
  };
}

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  /** Ekran okuyucu için satırın adı (ör. marka adı). */
  getLabel: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, context: SortableRowContext) => ReactNode;
  /** Liste adı (ekran okuyucu). */
  label: string;
  /** true ise sürükleme kapalıdır (ör. arama yaparken). */
  disabled?: boolean;
  /** Sürükleme başlayınca çağrılır (ör. açık kaydırma satırlarını kapatmak için). */
  onDragStart?: () => void;
  className?: string;
}

interface DragState {
  /** Sürükleme başındaki satır ölçüleri (görünümde diğer satırların kayması için). */
  m: Measure;
  id: string;
  index: number;
  over: number;
  offset: number;
  dropping: boolean;
}

interface Measure {
  tops: number[];
  heights: number[];
  gap: number;
  startY: number;
  startScroll: number;
}

const move = <T,>(list: T[], from: number, to: number): T[] => {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

/**
 * Sürükle-bırak ile sıralanan liste.
 * - Telefon/tablet (dokunmatik): satırı basılı tut → satır havaya kalkar, parmakla sürükle, bırak.
 *   Basılı tutarken parmak oynarsa sürükleme başlamaz (normal kaydırma ve yana kaydırma çalışır).
 * - Masaüstü (fare): satırdaki ⠿ tutamağından tut ve sürükle.
 * - Klavye: tutamağa odaklan, ↑ ↓ ile yukarı/aşağı taşı (sonuç ekran okuyucuya duyurulur).
 * Diğer satırlar kayarak yer açar; sayfa kenarına yaklaşınca liste kendiliğinden kayar.
 */
export function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  renderItem,
  label,
  disabled = false,
  onDragStart,
  className = '',
}: SortableListProps<T>) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const nodes = useRef(new Map<string, HTMLLIElement>());
  const measure = useRef<Measure | null>(null);
  // En güncel değerler (olay dinleyicileri eski kapanışı görmesin diye).
  const latest = useRef({ items, getId, onReorder, onDragStart, disabled });
  // Klavyeyle taşınan satırın kimliği: odak, taşıdıktan sonra aynı tutamağa dönsün.
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);

  useEffect(() => {
    latest.current = { items, getId, onReorder, onDragStart, disabled };
  });

  // Klavyeyle taşıyınca odak aynı satırın tutamağında kalsın.
  useEffect(() => {
    if (!focusTarget) return;
    document
      .querySelector<HTMLElement>(`[data-handle-id="${CSS.escape(focusTarget.id)}"]`)
      ?.focus();
  }, [focusTarget]);

  const handleKeyDown = (event: ReactKeyboardEvent, id: string, index: number, name: string) => {
    if (disabled) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const to = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= items.length) return;
    setFocusTarget({ id });
    onReorder(move(items, index, to));
    setAnnouncement(`${name}, ${to + 1}. sıraya taşındı`);
  };

  // ---- Sürükleme -----------------------------------------------------------------------
  const startSession = (event: ReactPointerEvent<HTMLLIElement>, id: string, index: number) => {
    if (latest.current.disabled || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const onHandle = Boolean(target.closest('[data-drag-handle]'));
    const mouse = event.pointerType === 'mouse';
    if (mouse && !onHandle) return; // fare: yalnızca tutamaktan
    if (
      !onHandle &&
      target.closest('button, a, input, textarea, select, [role="switch"], [data-no-drag]')
    ) {
      return; // düğmelere/anahtara basmak sürükleme başlatmaz
    }

    const origin = { x: event.clientX, y: event.clientY };
    let lastY = event.clientY;
    let active = false;
    let over = index;
    let raf = 0;
    let timer = 0;
    const previousSelect = document.body.style.userSelect;

    const preventTouchScroll = (e: TouchEvent) => {
      if (active && e.cancelable) e.preventDefault();
    };

    const compute = () => {
      const m = measure.current;
      if (!m) return;
      const offset = lastY - m.startY + (window.scrollY - m.startScroll);
      const center = (m.tops[index] ?? 0) + (m.heights[index] ?? 0) / 2 + offset;
      let best = 0;
      let bestDistance = Infinity;
      m.tops.forEach((top, i) => {
        const distance = Math.abs(top + (m.heights[i] ?? 0) / 2 - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      over = best;
      setDrag((d) => (d ? { ...d, offset, over: best } : d));
    };

    const tick = () => {
      if (!active) return;
      if (lastY < EDGE) window.scrollBy(0, -SCROLL_SPEED);
      else if (lastY > window.innerHeight - EDGE) window.scrollBy(0, SCROLL_SPEED);
      else {
        raf = requestAnimationFrame(tick);
        return;
      }
      compute();
      raf = requestAnimationFrame(tick);
    };

    const begin = () => {
      const { items: list, getId: idOf } = latest.current;
      const els = list.map((it) => nodes.current.get(idOf(it)));
      if (els.some((el) => !el)) return;
      const rects = els.map((el) => (el as HTMLLIElement).getBoundingClientRect());
      const meas: Measure = {
        tops: rects.map((r) => r.top + window.scrollY),
        heights: rects.map((r) => r.height),
        gap: rects[1] && rects[0] ? rects[1].top - rects[0].bottom : 8,
        startY: lastY,
        startScroll: window.scrollY,
      };
      measure.current = meas;
      active = true;
      document.body.style.userSelect = 'none';
      document.addEventListener('touchmove', preventTouchScroll, { passive: false });
      navigator.vibrate?.(12);
      latest.current.onDragStart?.();
      setDrag({ m: meas, id, index, over: index, offset: 0, dropping: false });
      raf = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      active = false;
      document.body.style.userSelect = previousSelect;
      document.removeEventListener('touchmove', preventTouchScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    function onMove(e: PointerEvent) {
      if (e.pointerId !== event.pointerId) return;
      lastY = e.clientY;
      if (!active) {
        const distance = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
        if (mouse) {
          if (distance > MOUSE_DRAG_DISTANCE) begin();
        } else if (distance > CANCEL_DISTANCE) {
          cleanup(); // normal kaydırma/yana çekme
        }
        return;
      }
      compute();
    }

    function onUp(e: PointerEvent) {
      if (e.pointerId !== event.pointerId) return;
      if (!active) {
        cleanup();
        return;
      }
      const m = measure.current;
      const finalOver = over;
      active = false;
      cancelAnimationFrame(raf);
      // Bırakılan yere yumuşakça otur, sonra sırayı kaydet.
      if (m) {
        const from = index;
        const finalOffset =
          finalOver > from
            ? (m.tops[finalOver] ?? 0) +
              (m.heights[finalOver] ?? 0) -
              (m.heights[from] ?? 0) -
              (m.tops[from] ?? 0)
            : (m.tops[finalOver] ?? 0) - (m.tops[from] ?? 0);
        setDrag((d) => (d ? { ...d, offset: finalOffset, over: finalOver, dropping: true } : d));
      }
      window.setTimeout(() => {
        cleanup();
        setDrag(null);
        if (finalOver !== index) {
          const name = getLabel(latest.current.items[index] as T);
          latest.current.onReorder(move(latest.current.items, index, finalOver));
          setAnnouncement(`${name}, ${finalOver + 1}. sıraya taşındı`);
        }
      }, SETTLE_MS);
    }

    function onCancel(e: PointerEvent) {
      if (e.pointerId !== event.pointerId) return;
      cleanup();
      setDrag(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    if (!mouse) timer = window.setTimeout(begin, LONG_PRESS_MS);
  };

  // ---- Görünüm ---------------------------------------------------------------------------
  const shiftFor = (index: number): number => {
    if (!drag) return 0;
    const m = drag.m;
    const dragged = (m.heights[drag.index] ?? 0) + m.gap;
    if (drag.index < drag.over && index > drag.index && index <= drag.over) return -dragged;
    if (drag.index > drag.over && index >= drag.over && index < drag.index) return dragged;
    return 0;
  };

  return (
    <>
      <ul aria-label={label} className={`flex flex-col gap-2.5 ${className}`}>
        {items.map((item, index) => {
          const id = getId(item);
          const name = getLabel(item);
          const dragging = drag?.id === id;
          const style: CSSProperties = {
            touchAction: 'pan-y',
            WebkitTouchCallout: 'none',
            transform: dragging
              ? `translateY(${drag.offset}px) scale(1.03) rotate(-0.6deg)`
              : drag
                ? `translateY(${shiftFor(index)}px)`
                : undefined,
            transition: dragging
              ? drag.dropping
                ? `transform ${SETTLE_MS}ms ease-out`
                : 'none'
              : drag
                ? 'transform 180ms ease'
                : undefined,
            zIndex: dragging ? 30 : undefined,
            position: 'relative',
          };
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) nodes.current.set(id, el);
                else nodes.current.delete(id);
              }}
              data-sortable-id={id}
              style={style}
              className={dragging ? 'rounded-3xl shadow-card' : ''}
              onPointerDown={(e) => startSession(e, id, index)}
              // Uzun basışta tarayıcının bağlam menüsü çıkmasın.
              onContextMenu={(e) => {
                if (drag || !disabled) e.preventDefault();
              }}
            >
              {renderItem(item, {
                index,
                dragging,
                handleProps: {
                  'data-drag-handle': true,
                  'data-handle-id': id,
                  'aria-label': `${name} sırasını değiştir. Yukarı veya aşağı ok tuşlarını kullanın.`,
                  onKeyDown: (e) => handleKeyDown(e, id, index, name),
                },
              })}
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
