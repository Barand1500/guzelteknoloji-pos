import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router';
import { APP_BASE } from '../../config/navigation';

/** Geri bağlantısı da normal bağlantılarla aynı kaydedilmemiş değişiklik korumasından geçer. */
export function PageBack() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const link = useRef<HTMLAnchorElement>(null);
  const current = { key: location.key, path: location.pathname + location.search + location.hash };
  const [visits, setVisits] = useState([current]);
  let history = visits;
  if (visits.at(-1)?.key !== location.key) {
    const position = visits.findIndex((visit) => visit.key === location.key);
    history =
      position >= 0
        ? visits.slice(0, position + 1)
        : navigationType === 'REPLACE'
          ? [...visits.slice(0, -1), current]
          : [...visits, current];
    setVisits(history);
  }
  const previous = history.at(-2);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Backspace' ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const element = event.target instanceof Element ? event.target : document.activeElement;
      if (
        element?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        ) ||
        document.querySelector('[role="dialog"], [role="alertdialog"]')
      )
        return;
      event.preventDefault();
      link.current?.click();
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, []);
  return (
    <Link
      ref={link}
      to={previous?.path ?? `${APP_BASE}/urunler`}
      aria-label="Önceki Sayfaya Dön"
      title="Geri (Backspace)"
      className="mb-3 -ml-2 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
      onClick={(event) => {
        if (
          !previous ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        navigate(-1);
      }}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Geri
    </Link>
  );
}
