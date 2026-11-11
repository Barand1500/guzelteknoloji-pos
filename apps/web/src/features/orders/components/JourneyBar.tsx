import { ArrowRight, Check, ChevronRight, X } from 'lucide-react';

export const IMG = (name: string) => `${import.meta.env.BASE_URL}orders/${name}.webp`;

export interface JourneyStep {
  id: string;
  /** Tam etiket (masaüstü) ve kısa etiket (telefon). */
  label: string;
  short: string;
  hint: string;
  /** public/orders içindeki animasyonlu görselin adı. */
  image: string;
}

/** Şeridin üzerindeki işlem düğmesi (web): "ilerlet" oka, "iptal/ret" şu anki adımın köşesine biner. */
export interface JourneyAction {
  /** Erişilebilir ad (ör. "Sıradaki adım: Hazırlanıyor"). */
  label: string;
  /** Görünen kısa yazı (yalnızca "advance" düğmesinde). */
  text?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface JourneyBarProps {
  ariaLabel: string;
  steps: readonly JourneyStep[];
  /** Tamamlanan adım sayısı (soldan). */
  done: number;
  /** Şu anki adımın sırası; yoksa (iptal/ret) null. */
  current: number | null;
  /** Başarısız sonla biten adım (iptal/ret): o sıradaki adım kırmızı "failure" kartına döner. */
  failedAt?: number;
  failure?: Pick<JourneyStep, 'label' | 'short' | 'hint' | 'image'>;
  /** Şu anki adımdan sonraki bağlantının ortasında duran düğme (sıradaki adıma geç). */
  advance?: JourneyAction;
  /** Şu anki adımın sol üst köşesindeki küçük ✕ (iptal / ret). */
  dismiss?: JourneyAction;
}

/**
 * Yolculuk şeridi (siparişler ve iade/değişim talepleri ortak): yuvarlak "baloncuklar" (içinde
 * animasyonlu görsel) tek çizgili oklarla bağlanır. Geçilenler yeşil çerçeveli ve tikli, şu anki büyük
 * ve halkalı, ona giden bağlantı turuncu; henüz gelmeyenler soluk/gri ve bağlantıları kesik çizgi.
 * Başarısız son (iptal/ret) kırmızı kartla gösterilir. Telefonda kısa etiketler ve küçük baloncuklar.
 */
export function JourneyBar({
  ariaLabel,
  steps,
  done,
  current,
  failedAt,
  failure,
  advance,
  dismiss,
}: JourneyBarProps) {
  return (
    <ol aria-label={ariaLabel} className="flex items-start">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const failed = failedAt === i && failure !== undefined;
        const isDone = i < done && !failed;
        const isCurrent = current === i && !failed;
        const step = failed ? failure : s;
        const lineDone = i + 1 < done;
        const toCurrent = current !== null && i === current - 1;
        const toFailed = failedAt !== undefined && i === failedAt - 1;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-start last:flex-none">
            <div className="flex w-14 shrink-0 flex-col items-center gap-1 sm:w-28">
              <span
                aria-current={isCurrent || failed ? 'step' : undefined}
                className={[
                  'relative flex size-11 items-center justify-center rounded-full ring-2 transition-all duration-500 sm:size-16',
                  failed
                    ? 'scale-110 bg-danger-soft ring-danger ring-offset-2 ring-offset-surface-raised'
                    : isCurrent
                      ? 'scale-110 bg-brand-50 ring-brand-600 ring-offset-2 ring-offset-surface-raised'
                      : isDone
                        ? 'bg-success-soft ring-success/50'
                        : 'bg-surface-muted ring-line',
                ].join(' ')}
              >
                <img
                  src={IMG(step.image)}
                  alt=""
                  loading="lazy"
                  className={[
                    'size-7 object-contain transition-all duration-500 sm:size-11',
                    isCurrent || failed || isDone ? '' : 'opacity-40 grayscale',
                  ].join(' ')}
                />
                {isCurrent && dismiss ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss.onClick();
                    }}
                    disabled={dismiss.disabled}
                    aria-label={dismiss.label}
                    title={dismiss.label}
                    className="absolute -top-1 -left-1 flex size-6 items-center justify-center rounded-full bg-surface-raised text-danger shadow-soft ring-1 ring-danger/40 transition-all hover:scale-110 hover:bg-danger hover:text-white disabled:opacity-50"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
                {isDone || failed ? (
                  <span
                    className={`absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-white ${failed ? 'bg-danger' : 'bg-success'}`}
                  >
                    {failed ? (
                      <X className="size-3" aria-hidden="true" />
                    ) : (
                      <Check className="size-3" aria-hidden="true" />
                    )}
                  </span>
                ) : null}
              </span>
              <span
                className={[
                  'text-center text-[0.6875rem] leading-tight font-extrabold sm:text-sm',
                  isCurrent || failed || isDone ? 'text-ink' : 'text-ink-muted',
                ].join(' ')}
              >
                <span className="sm:hidden" aria-hidden="true">
                  {step.short}
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                  {step.label}
                </span>
                <span className="sr-only">{step.label}</span>
              </span>
              <span className="sr-only">
                {failed || isCurrent ? 'Geçerli adım' : isDone ? 'Tamamlandı' : 'Bekliyor'}
              </span>
              <span className="hidden text-center text-xs text-ink-muted sm:block">
                {step.hint}
              </span>
            </div>

            {/* Bağlantı: tek çizgi + ok ucu. Sabit ve sakin (göz yormaz). */}
            {!isLast ? (
              <span className="relative mt-[1.2rem] flex min-w-4 flex-1 items-center px-1.5 sm:mt-[1.85rem] sm:px-3">
                <span
                  aria-hidden="true"
                  className={[
                    'flex-1 transition-colors duration-500',
                    lineDone
                      ? 'h-0.5 rounded-full bg-success'
                      : toCurrent
                        ? 'h-0.5 rounded-full bg-brand-600'
                        : toFailed
                          ? 'h-0.5 rounded-full bg-danger'
                          : 'border-t-2 border-dashed border-line-strong/35',
                  ].join(' ')}
                />
                <ChevronRight
                  aria-hidden="true"
                  strokeWidth={2.75}
                  className={[
                    '-ml-1.5 size-4 shrink-0 transition-colors duration-500 sm:size-5',
                    lineDone
                      ? 'text-success'
                      : toCurrent
                        ? 'text-brand-600'
                        : toFailed
                          ? 'text-danger'
                          : 'text-line-strong/40',
                  ].join(' ')}
                />
                {advance && current === i ? (
                  <button
                    type="button"
                    onClick={advance.onClick}
                    disabled={advance.disabled}
                    aria-label={advance.label}
                    title={advance.label}
                    className="absolute top-1/2 left-1/2 inline-flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-brand-700 pr-2.5 pl-3.5 text-xs font-extrabold whitespace-nowrap text-white shadow-soft ring-4 ring-brand-50 transition-all hover:scale-105 hover:bg-brand-800 active:scale-95 disabled:opacity-60"
                  >
                    {advance.text ?? 'İlerlet'}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
