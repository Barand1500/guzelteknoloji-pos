import { ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';

/** Form bu süre içinde yüklenmezse kullanıcıya yeni sekmede açma seçeneği vurgulanır. */
const SLOW_LOAD_MS = 15_000;

/**
 * Gömülü form, gönderim sonrası üst pencereye `postMessage` ile haber verirse başarı animasyonu
 * gösterilir. Mesaj YALNIZCA form origin'inden ve bu iframe'den geliyorsa dikkate alınır; şekil
 * olarak "submitted | success | sent | completed" (düz metin ya da {type|event|status|action}) beklenir.
 * Form mesaj göndermiyorsa bu kısım sessizce devre dışıdır; form kendi başarı ekranını gösterir.
 */
const SUCCESS_PATTERN = /^(form[:_.-]?)?(submitted|submit[:_.-]?success|success|sent|completed?)$/i;

function isSubmitSuccess(data: unknown): boolean {
  if (typeof data === 'string') return SUCCESS_PATTERN.test(data.trim().slice(0, 64));
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    return [record.type, record.event, record.status, record.action].some(
      (value) => typeof value === 'string' && SUCCESS_PATTERN.test(value.trim().slice(0, 64)),
    );
  }
  return false;
}

interface SupportFormProps {
  url: string;
  origin: string;
}

export function SupportForm({ url, origin }: SupportFormProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [sent, setSent] = useState(false);
  // Yeni talep için iframe'i sıfırdan yüklemek (formu temizlemek) üzere anahtar.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(id);
  }, [attempt]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (isSubmitSuccess(event.data)) setSent(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin]);

  const newRequest = () => {
    setSent(false);
    setLoaded(false);
    setSlow(false);
    setAttempt((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[min(68dvh,40rem)] min-h-[22rem] overflow-hidden rounded-2xl bg-surface-muted ring-1 ring-line">
        {!loaded ? <FormSkeleton /> : null}

        <iframe
          key={attempt}
          ref={iframeRef}
          src={url}
          title="Destek Talebi"
          referrerPolicy="strict-origin-when-cross-origin"
          // Form çalışsın diye gerekli izinler; üst sayfaya yönlendirme/yetki verilmez.
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
          onLoad={() => setLoaded(true)}
          className={[
            'absolute inset-0 size-full border-0 bg-white transition-[opacity,transform] duration-500 ease-out',
            loaded && !sent ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ].join(' ')}
        />

        {sent ? <SuccessPanel onNewRequest={newRequest} /> : null}
      </div>

      {slow && !loaded ? (
        <Alert tone="info">
          Form beklenenden uzun sürede yükleniyor. Aşağıdaki bağlantıyla yeni sekmede açabilirsiniz.
        </Alert>
      ) : null}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 text-sm font-semibold text-brand-700 underline-offset-4 hover:bg-brand-50 hover:underline"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
        Formu Yeni Sekmede Aç
        <span className="sr-only">(yeni sekmede açılır)</span>
      </a>
    </div>
  );
}

/** Form yüklenirken form şeklinde nabız atan iskelet. */
function FormSkeleton() {
  return (
    <div
      role="status"
      className="absolute inset-0 flex animate-pulse flex-col gap-4 bg-white p-5 md:p-7"
    >
      <span className="sr-only">Form yükleniyor…</span>
      <div className="h-6 w-2/5 rounded-lg bg-line" aria-hidden="true" />
      <div className="h-4 w-4/5 rounded-lg bg-surface-muted" aria-hidden="true" />
      <div className="mt-2 h-12 w-full rounded-xl bg-surface-muted" aria-hidden="true" />
      <div className="h-12 w-full rounded-xl bg-surface-muted" aria-hidden="true" />
      <div className="h-12 w-full rounded-xl bg-surface-muted" aria-hidden="true" />
      <div className="h-28 w-full rounded-xl bg-surface-muted" aria-hidden="true" />
      <div className="mt-auto h-12 w-1/2 rounded-xl bg-brand-100" aria-hidden="true" />
    </div>
  );
}

function SuccessPanel({ onNewRequest }: { onNewRequest: () => void }) {
  return (
    <div
      role="status"
      className="animate-fade-in absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center"
    >
      <svg viewBox="0 0 64 64" className="animate-pop size-24" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#fff3e6" stroke="#ffb44d" strokeWidth="2" />
        <path
          d="M19 33l9 9 17-19"
          fill="none"
          stroke="#c2410c"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-draw"
        />
      </svg>
      <div>
        <p className="text-xl font-extrabold tracking-tight text-ink">Talebiniz alındı!</p>
        <p className="mt-1.5 text-base text-ink-muted">
          En kısa sürede size dönüş yapacağız. Teşekkür ederiz.
        </p>
      </div>
      <Button variant="outline" fullWidth={false} onClick={onNewRequest} className="px-8">
        Yeni Talep Oluştur
      </Button>
    </div>
  );
}
