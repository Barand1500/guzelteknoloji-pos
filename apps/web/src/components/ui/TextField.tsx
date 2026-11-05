import { CircleAlert } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  error?: string | undefined;
  hint?: string;
  /** Alanın sağına yerleşen etkileşimli öğe (ör. şifre göster düğmesi). */
  trailing?: ReactNode;
}

/**
 * Yüzen etiketli ortak input. Görünüm `styles/index.css` içindeki .field-* sınıflarından gelir.
 * placeholder=" " zorunludur: CSS, `:placeholder-shown` ile alanın dolu olup olmadığını anlar.
 * Etiket DOM'da input'tan SONRA gelir (kardeş seçici için); label/htmlFor ilişkisi korunur.
 *
 * Hata gösterimi: kırmızı çerçeve + sonda ünlem düğmesi. Hatanın nedeni, ünlemin üzerine
 * gelince (masaüstü), odaklanınca (klavye) ya da dokununca (mobil) açılan konuşma kutusunda yazar.
 * Kutu aynı zamanda input'un aria-describedby hedefidir (ekran okuyucu hatayı okur).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, trailing, id, className = '', ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-hata`;
  const hintId = `${inputId}-ipucu`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  // Açıkken dışarı dokunma/tıklama ya da Esc kutuyu kapatır (iOS'ta blur güvenilir değildir).
  useEffect(() => {
    if (!tipOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!tipRef.current?.contains(event.target as Node)) setTipOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTipOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [tipOpen]);

  // Hata kalkınca açık kutu kapanır.
  useEffect(() => {
    if (!error) setTipOpen(false);
  }, [error]);

  // Sağdaki öğelere (ünlem, şifre göster düğmesi) yer açılır.
  const paddingRight = trailing ? (error ? 'pr-24' : 'pr-14') : error ? 'pr-12' : '';
  // Ünlem düğmesi (44px) ve kutudaki ok, ünlemin tam altına hizalanır.
  const iconRight = trailing ? '3.25rem' : '0.25rem';
  const arrowRight = trailing ? '4.2rem' : '1.2rem';

  return (
    <div className="flex flex-col gap-2">
      <div className="field">
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`field-input ${paddingRight} ${className}`}
          {...rest}
        />
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>

        {error ? (
          <div ref={tipRef} className="group">
            <button
              type="button"
              aria-label={error}
              aria-expanded={tipOpen}
              aria-controls={errorId}
              onClick={() => setTipOpen((v) => !v)}
              style={{ right: iconRight }}
              className="absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft"
            >
              <CircleAlert className="size-5" aria-hidden="true" />
            </button>
            <div
              id={errorId}
              role="tooltip"
              className={[
                'absolute top-full right-0 z-20 mt-2.5 w-max max-w-[min(18rem,calc(100vw-3rem))]',
                'rounded-xl bg-danger px-3.5 py-2.5 text-sm leading-snug font-medium text-white shadow-soft',
                'transition-[opacity,transform,visibility] duration-150',
                tipOpen
                  ? 'visible translate-y-0 opacity-100'
                  : 'invisible translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                style={{ right: arrowRight }}
                className="absolute -top-1 size-2.5 rotate-45 rounded-[2px] bg-danger"
              />
              {error}
            </div>
          </div>
        ) : null}

        {trailing ? (
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="px-1 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
