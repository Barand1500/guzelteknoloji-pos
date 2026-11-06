import { useEffect, useState } from 'react';
import { greetingFor } from './greeting-text';

/** Saate göre selamlama metni; saat başı değişir (sekme açıkken de güncellenir). */
function useGreeting(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return greetingFor(now.getHours());
}

interface GreetingProps {
  /** Selamlanan kişinin adı; yoksa yalnızca selamlama yazılır. */
  name: string | null;
  className?: string;
}

/** "Günaydın Baran": selamlama sönük, ad vurgulu. Uzun adlar kesilir. */
export function Greeting({ name, className = '' }: GreetingProps) {
  const hello = useGreeting();
  return (
    <p className={`min-w-0 truncate font-semibold text-ink-muted ${className}`}>
      {hello}
      {name ? (
        <>
          {' '}
          <span className="text-ink">{name}</span>
        </>
      ) : null}
    </p>
  );
}
