import { useEffect, useRef } from 'react';

const SPACING = 22;
const BASE_RADIUS = 1.2;
const INFLUENCE_RADIUS = 120;

/**
 * Etkileşimli nokta deseni: noktalar durağandır; fare (veya parmak) üzerinden geçerken
 * yakındaki noktalar büyür, amber rengine döner ve imleçten hafifçe uzaklaşır.
 * Hareket yalnızca imleç etkisindeyken çizilir (boşta CPU harcamaz).
 * `prefers-reduced-motion` açıksa desen tamamen durağan kalır.
 * Üst öğe (header) üzerindeki pointer olaylarını dinler; canvas kendisi tıklamayı engellemez.
 */
export function DotGrid({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    // jsdom (test ortamı) canvas desteklemez; orada sessizce atlanır.
    if (!canvas || !host || navigator.userAgent.includes('jsdom')) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let width = 0;
    let height = 0;
    let frame = 0;
    const pointer = { x: -9999, y: -9999, strength: 0, target: 0 };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let y = SPACING / 2; y < height; y += SPACING) {
        // Aşağı doğru hafifçe sönen taban opaklık: deseni yumuşak bitirir.
        const baseAlpha = 0.2 * (1 - 0.7 * (y / height));
        for (let x = SPACING / 2; x < width; x += SPACING) {
          let px = x;
          let py = y;
          let radius = BASE_RADIUS;
          let color = `rgba(255,255,255,${baseAlpha})`;

          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (pointer.strength > 0.01 && dist < INFLUENCE_RADIUS) {
            const k = (1 - dist / INFLUENCE_RADIUS) ** 2 * pointer.strength;
            const push = k * 7;
            px += (dx / (dist || 1)) * push;
            py += (dy / (dist || 1)) * push;
            radius = BASE_RADIUS + k * 2.4;
            color = `rgba(255,${Math.round(255 - 75 * k)},${Math.round(255 - 178 * k)},${Math.min(0.95, baseAlpha + k * 0.8)})`;
          }
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = () => {
      pointer.strength += (pointer.target - pointer.strength) * 0.15;
      draw();
      if (Math.abs(pointer.target - pointer.strength) > 0.01 || pointer.target > 0) {
        frame = requestAnimationFrame(tick);
      } else {
        pointer.strength = 0;
        frame = 0;
        draw();
      }
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.target = 1;
      start();
    };
    const onLeave = () => {
      pointer.target = 0;
      start();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    if (!reduceMotion) {
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
    }

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 size-full ${className}`}
    />
  );
}
