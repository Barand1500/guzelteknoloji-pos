import { Check } from 'lucide-react';

interface StepperProps {
  steps: readonly string[];
  current: number;
}

/**
 * Adım göstergesi. Telefonda yalnızca aktif adımın adı görünür (yer kazanmak için),
 * geniş ekranda tüm adımlar yazılıdır. Tamamlanan adım tik alır.
 */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-2" aria-label="Adımlar">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={['flex items-center gap-2', active ? 'min-w-0 flex-1' : ''].join(' ')}
          >
            <span
              className={[
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300',
                done || active ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted',
              ].join(' ')}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={[
                'truncate text-sm font-semibold',
                active ? 'text-ink' : 'hidden text-ink-muted md:inline',
              ].join(' ')}
            >
              {label}
            </span>
            {index < steps.length - 1 && !active ? (
              <span aria-hidden="true" className="hidden h-px w-6 bg-line md:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
