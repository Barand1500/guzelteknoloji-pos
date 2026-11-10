import { useEffect, useRef, useState } from 'react';
import { HOME_BLOCKS } from './HomeView';

/**
 * Anasayfanın alt çubuğu: sayfa değiştirmez, sayfanın bloklarına (Özet, Gelir, Sipariş, Ödeme, Ürün)
 * yumuşakça kayar. Sayfa kaydırıldıkça o an ekrandaki blok vurgulanır (hangi bölümde olduğunu
 * gösterir). Diğer bölümlerdeki alt çubukla aynı yüzen hap görünümündedir.
 */
export function HomeDock() {
  const [active, setActive] = useState<string>(HOME_BLOCKS[0].id);
  // Bir düğmeye basılınca kayma bitene kadar kaydırma izleyici vurguyu değiştirmesin.
  const lockUntil = useRef(0);

  useEffect(() => {
    const update = () => {
      if (performance.now() < lockUntil.current) return;
      // Ekranın üst üçte birini geçmiş son blok "içinde bulunulan" bloktur.
      const line = window.innerHeight * 0.35;
      let current: string = HOME_BLOCKS[0].id;
      // Sayfanın en altındaysa (son blok kısa olduğu için çizgiye hiç ulaşamayabilir) son blok seçilidir.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && window.scrollY > 0) {
        setActive(HOME_BLOCKS[HOME_BLOCKS.length - 1]!.id);
        return;
      }
      for (const b of HOME_BLOCKS) {
        const el = document.getElementById(b.id);
        if (el && el.getBoundingClientRect().top <= line) current = b.id;
      }
      setActive(current);
    };
    const first = window.requestAnimationFrame(update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(first);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const go = (id: string, at: number) => {
    setActive(id);
    lockUntil.current = at + 900;
    document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Anasayfa bölümleri"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center md:px-3 md:pb-3"
    >
      <div className="pointer-events-auto flex w-full items-center gap-1 rounded-t-[1.75rem] border-t border-line bg-surface-raised/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur-xl md:w-auto md:gap-2 md:rounded-[2rem] md:border md:p-1.5 md:px-3">
        {HOME_BLOCKS.map((b) => {
          const Icon = b.icon;
          const on = active === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => go(b.id, e.timeStamp)}
              aria-current={on ? 'true' : undefined}
              className={[
                'relative flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[0.6875rem] font-semibold transition-all duration-300 md:flex-none md:px-4 md:text-xs',
                on ? 'bg-brand-50 text-brand-ink' : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              <Icon
                className={`size-6 transition-transform duration-300 ${on ? '-translate-y-0.5 scale-110' : ''}`}
                aria-hidden="true"
              />
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
