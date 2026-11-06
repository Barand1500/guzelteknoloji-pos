import { Check } from 'lucide-react';

interface WizardStepsProps {
  steps: readonly string[];
  /** Şu anki adım (1'den başlar). */
  current: number;
}

/** Sihirbaz adım göstergesi (Excel ile yükleme ve Toplu Görsel ortak kullanır). */
export function WizardSteps({ steps, current }: WizardStepsProps) {
  return (
    <ol aria-label="Adımlar" className="flex items-center gap-2 text-sm font-bold">
      {steps.map((name, i) => {
        const n = i + 1;
        const done = current > n;
        return (
          <li
            key={name}
            aria-current={current === n ? 'step' : undefined}
            className="flex flex-1 items-center gap-2"
          >
            <span
              className={[
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs',
                current === n
                  ? 'bg-brand-600 text-white'
                  : done
                    ? 'bg-success-soft text-success'
                    : 'bg-surface-muted text-ink-muted',
              ].join(' ')}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : n}
            </span>
            <span className={current === n ? 'text-ink' : 'text-ink-muted'}>{name}</span>
            {i < steps.length - 1 ? <span className="h-0.5 flex-1 bg-line" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
