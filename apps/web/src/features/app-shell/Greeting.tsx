import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { greetingFor, greetingPeriod } from './greeting-text';

const ICONS = { sabah: Sunrise, gunduz: Sun, aksam: Sunset, gece: Moon } as const;

/** Saate göre selamlama metni ve gün dilimi; saat başı değişir (sekme açıkken de güncellenir). */
function useGreeting(): { text: string; period: keyof typeof ICONS } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return { text: greetingFor(now.getHours()), period: greetingPeriod(now.getHours()) };
}

interface GreetingProps {
  /** Selamlanan kişinin adı; yoksa yalnızca selamlama yazılır. */
  name: string | null;
  className?: string;
}

/**
 * "Günaydın, Baran" + günün saatine uygun küçük simge (gün doğumu / güneş / gün batımı / ay):
 * selamlama sönük, ad vurgulu. Uzun adlar kesilir. Simge süs olduğu için ekran okuyucudan gizlidir.
 */
export function Greeting({ name, className = '' }: GreetingProps) {
  const { text, period } = useGreeting();
  const Icon = ICONS[period];
  return (
    <p className={`flex min-w-0 items-center gap-1.5 font-semibold text-ink-muted ${className}`}>
      <Icon className="size-[1.2em] shrink-0 text-accent-ink" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {name ? (
          <>
            {text}, <span className="text-ink">{name}</span>
          </>
        ) : (
          text
        )}
      </span>
    </p>
  );
}
