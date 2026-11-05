import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

interface SwipeRowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Satırın arkasında, sola kaydırınca çıkan işlem düğmeleri. */
  actions: ReactNode;
  /** İşlem alanının genişliği (px); düğme sayısı × düğme genişliği. */
  actionsWidth: number;
  children: ReactNode;
  className?: string;
}

const START_DISTANCE = 10;

/**
 * Sola kaydırınca işlemlerin çıktığı satır (dokunmatik cihazlar). Fare ile kullanılmaz
 * (masaüstünde işlemler satırın içinde görünür). Dikey kaydırma sayfanın kendi akışıdır;
 * yatay hareket satırı kaydırır. Açıkken satıra dokunmak satırı kapatır.
 */
export function SwipeRow({
  open,
  onOpenChange,
  actions,
  actionsWidth,
  children,
  className = '',
}: SwipeRowProps) {
  const [dragX, setDragX] = useState<number | null>(null);
  const dragXRef = useRef<number | null>(null);
  const track = useRef<{
    id: number;
    x: number;
    y: number;
    mode: 'idle' | 'swipe' | 'scroll';
  } | null>(null);
  const justSwiped = useRef(false);
  const rest = open ? -actionsWidth : 0;

  const setX = (x: number | null) => {
    dragXRef.current = x;
    setDragX(x);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    track.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: 'idle' };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = track.current;
    if (!t || e.pointerId !== t.id || t.mode === 'scroll') return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (t.mode === 'idle') {
      if (Math.abs(dy) > START_DISTANCE && Math.abs(dy) > Math.abs(dx)) {
        t.mode = 'scroll';
        return;
      }
      if (Math.abs(dx) > START_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
        t.mode = 'swipe';
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } else {
        return;
      }
    }
    setX(Math.min(0, Math.max(-actionsWidth, rest + dx)));
  };

  const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = track.current;
    if (!t || e.pointerId !== t.id) return;
    track.current = null;
    if (t.mode !== 'swipe') return;
    justSwiped.current = true;
    window.setTimeout(() => (justSwiped.current = false), 60);
    const x = dragXRef.current ?? rest;
    setX(null);
    onOpenChange(x < -actionsWidth * 0.4);
  };

  // Kaydırma sonrası oluşan "tıklama" ve açıkken satıra dokunma satırın kendi işini yapmasın.
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (justSwiped.current) {
      e.stopPropagation();
      e.preventDefault();
    } else if (open) {
      e.stopPropagation();
      e.preventDefault();
      onOpenChange(false);
    }
  };

  const x = dragX ?? rest;
  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: actionsWidth }}
        inert={!open}
      >
        {actions}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragX === null ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
