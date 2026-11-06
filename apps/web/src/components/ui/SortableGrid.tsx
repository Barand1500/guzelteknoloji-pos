import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/** Dokunmatik: kutucuğu bu kadar ms basılı tutunca sürükleme başlar. */
const LONG_PRESS_MS = 350;
/** Basılı tutarken parmak bu kadar oynarsa bu bir kaydırmadır; sürükleme başlamaz. */
const CANCEL_DISTANCE = 8;
/** Fareyle sürüklemeye başlama eşiği. */
const MOUSE_DRAG_DISTANCE = 5;
const EDGE = 90;
const SCROLL_SPEED = 14;
const SETTLE_MS = 170;

export interface SortableTileContext {
  index: number;
  dragging: boolean;
  /** Sürükleme biter bitmez gelen "tık" olayını yutmak için: true dönerse tıklamayı yok say. */
  wasDragged: () => boolean;
  /** Klavye ile taşıma için kutucuğa verilir (Alt + ok tuşları). */
  keyboardProps: { 'data-tile-id': string; onKeyDown: (event: ReactKeyboardEvent) => void };
}

interface SortableGridProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, context: SortableTileContext) => ReactNode;
  label: string;
  disabled?: boolean;
  onDragStart?: () => void;
  /** Izgara sütunları (Tailwind sınıfı), ör. "grid-cols-2 md:grid-cols-4". */
  className?: string;
}

interface Slot {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DragState {
  slots: Slot[];
  id: string;
  index: number;
  over: number;
  dx: number;
  dy: number;
  dropping: boolean;
}

const move = <T,>(list: T[], from: number, to: number): T[] => {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

/**
 * Sürükle-bırak ile sıralanan kutucuk ızgarası (SortableList'in iki boyutlu karşılığı).
 * - Dokunmatik: kutucuğu basılı tut → havaya kalkar, parmakla sürükle, bırak. Basılı tutarken
 *   parmak oynarsa normal kaydırma çalışır.
 * - Fare: kutucuğu tutup çekmek yeter (kısa tıklama kutucuğu açar).
 * - Klavye: kutucuğa odaklanıp Alt + ← → ↑ ↓ ile taşı (sonuç ekran okuyucuya duyurulur).
 * Diğer kutucuklar kayarak yer açar; sayfa kenarına yaklaşınca sayfa kendiliğinden kayar.
 */
export function SortableGrid<T>({
  items,
  getId,
  getLabel,
  onReorder,
  renderItem,
  label,
  disabled = false,
  onDragStart,
  className = 'grid-cols-2 md:grid-cols-4',
}: SortableGridProps<T>) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  const nodes = useRef(new Map<string, HTMLLIElement>());
  const dragged = useRef(false);
  const latest = useRef({ items, getId, onReorder, onDragStart, disabled });

  useEffect(() => {
    latest.current = { items, getId, onReorder, onDragStart, disabled };
  });

  useEffect(() => {
    if (!focusTarget) return;
    document.querySelector<HTMLElement>(`[data-tile-id="${CSS.escape(focusTarget.id)}"]`)?.focus();
  }, [focusTarget]);

  const handleKeyDown = (event: ReactKeyboardEvent, id: string, index: number, name: string) => {
    if (disabled || !event.altKey) return;
    const step =
      event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? 1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const to = index + step;
    if (to < 0 || to >= items.length) return;
    setFocusTarget({ id });
    onReorder(move(items, index, to));
    setAnnouncement(`${name}, ${to + 1}. sıraya taşındı`);
  };

  const startSession = (event: ReactPointerEvent<HTMLLIElement>, id: string, index: number) => {
    if (latest.current.disabled || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-drag], input, textarea, select, [role="switch"]')) return;
    const mouse = event.pointerType === 'mouse';
    const origin = { x: event.clientX, y: event.clientY, scroll: window.scrollY };
    let last = { x: event.clientX, y: event.clientY };
    let active = false;
    let over = index;
    let slots: Slot[] = [];
    let raf = 0;
    let timer = 0;
    const previousSelect = document.body.style.userSelect;

    const preventTouchScroll = (e: TouchEvent) => {
      if (active && e.cancelable) e.preventDefault();
    };

    const compute = () => {
      const dx = last.x - origin.x;
      const dy = last.y - origin.y + (window.scrollY - origin.scroll);
      const from = slots[index];
      if (!from) return;
      const cx = from.left + from.width / 2 + dx;
      const cy = from.top + from.height / 2 + dy;
      let best = index;
      let bestDistance = Infinity;
      slots.forEach((slot, i) => {
        const distance = Math.hypot(
          slot.left + slot.width / 2 - cx,
          slot.top + slot.height / 2 - cy,
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      over = best;
      setDrag((d) => (d ? { ...d, dx, dy, over: best } : d));
    };

    const tick = () => {
      if (!active) return;
      if (last.y < EDGE) window.scrollBy(0, -SCROLL_SPEED);
      else if (last.y > window.innerHeight - EDGE) window.scrollBy(0, SCROLL_SPEED);
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
      slots = els.map((el) => {
        const r = (el as HTMLLIElement).getBoundingClientRect();
        return { left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height };
      });
      active = true;
      dragged.current = true;
      document.body.style.userSelect = 'none';
      document.addEventListener('touchmove', preventTouchScroll, { passive: false });
      navigator.vibrate?.(12);
      latest.current.onDragStart?.();
      setDrag({ slots, id, index, over: index, dx: 0, dy: 0, dropping: false });
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
      last = { x: e.clientX, y: e.clientY };
      if (!active) {
        const distance = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
        if (mouse) {
          if (distance > MOUSE_DRAG_DISTANCE) begin();
        } else if (distance > CANCEL_DISTANCE) {
          cleanup();
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
      const finalOver = over;
      active = false;
      cancelAnimationFrame(raf);
      const from = slots[index];
      const to = slots[finalOver];
      if (from && to) {
        setDrag((d) =>
          d
            ? {
                ...d,
                dx: to.left - from.left,
                dy: to.top - from.top,
                over: finalOver,
                dropping: true,
              }
            : d,
        );
      }
      // Sürükleme sonrası gelen tıklama kutucuğu açmasın.
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
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

  /** Sürüklenen kutucuk geçerken diğerleri bir önceki/sonraki kutucuğun yerine kayar. */
  const shiftFor = (index: number): { x: number; y: number } => {
    if (!drag) return { x: 0, y: 0 };
    const here = drag.slots[index];
    let target: Slot | undefined;
    if (drag.index < drag.over && index > drag.index && index <= drag.over)
      target = drag.slots[index - 1];
    else if (drag.index > drag.over && index >= drag.over && index < drag.index)
      target = drag.slots[index + 1];
    if (!here || !target) return { x: 0, y: 0 };
    return { x: target.left - here.left, y: target.top - here.top };
  };

  return (
    <>
      <ul aria-label={label} className={`grid gap-3 ${className}`}>
        {items.map((item, index) => {
          const id = getId(item);
          const name = getLabel(item);
          const dragging = drag?.id === id;
          const shift = shiftFor(index);
          const style: CSSProperties = {
            touchAction: 'pan-y',
            WebkitTouchCallout: 'none',
            position: 'relative',
            zIndex: dragging ? 30 : undefined,
            transform: dragging
              ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.05) rotate(-1.5deg)`
              : drag
                ? `translate(${shift.x}px, ${shift.y}px)`
                : undefined,
            transition: dragging
              ? drag.dropping
                ? `transform ${SETTLE_MS}ms ease-out`
                : 'none'
              : drag
                ? 'transform 180ms ease'
                : undefined,
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
              onContextMenu={(e) => {
                if (drag || !disabled) e.preventDefault();
              }}
            >
              {renderItem(item, {
                index,
                dragging,
                wasDragged: () => dragged.current,
                keyboardProps: {
                  'data-tile-id': id,
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
