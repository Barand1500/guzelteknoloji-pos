import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';

export function UnsavedChanges({ dirty }: { dirty: boolean }) {
  const [pending, setPending] = useState<string | null>(null);
  const leaving = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      if (!leaving.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const click = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (
        !(a instanceof HTMLAnchorElement) ||
        a.target === '_blank' ||
        a.hasAttribute('download') ||
        a.getAttribute('href')?.startsWith('#')
      )
        return;
      const url = new URL(a.href);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        (url.origin === window.location.origin &&
          url.pathname + url.search + url.hash ===
            location.pathname + location.search + location.hash)
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setPending(url.href);
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, location.pathname, location.search, location.hash]);
  return (
    <ConfirmSheet
      open={!!pending}
      title="Kaydedilmemiş Değişiklikler"
      description="Sayfadan ayrılırsanız kaydetmediğiniz değişiklikler kaybolacak."
      confirmLabel="Kaydetmeden Ayrıl"
      cancelLabel="Düzenlemeye Devam Et"
      onClose={() => setPending(null)}
      onConfirm={() => {
        if (!pending) return;
        const url = new URL(pending);
        setPending(null);
        if (url.origin === window.location.origin) navigate(url.pathname + url.search + url.hash);
        else {
          leaving.current = true;
          window.location.assign(url.href);
        }
      }}
    />
  );
}
