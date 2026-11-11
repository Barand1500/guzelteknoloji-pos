import { Banknote, ChevronRight, ClipboardCheck, ClipboardList, Package, X } from 'lucide-react';
import { RETURN_KIND_LABEL, type ReturnKind, type ReturnStatus } from '../types';

const firstStep = { label: 'Talep Alındı', image: 'bekliyor', icon: ClipboardList };
const approvedStep = { label: 'Onaylandı', image: 'hazirlaniyor', icon: ClipboardCheck };
const rejectedStep = { label: 'Reddedildi', image: 'iptal', icon: X };
const finalSteps = {
  return: { label: 'İade Tamamlandı', image: 'teslim', icon: Banknote },
  exchange: { label: 'Değişim Tamamlandı', image: 'kargoda', icon: Package },
};

export function ReturnTrack({ kind, status }: { kind: ReturnKind; status: ReturnStatus }) {
  const rejected = status === 'rejected';
  const steps = rejected ? [firstStep, rejectedStep] : [firstStep, approvedStep, finalSteps[kind]];
  const active = status === 'pending' ? 0 : status === 'completed' ? 2 : 1;

  return (
    <ol
      aria-label={`${RETURN_KIND_LABEL[kind]} akışı`}
      className="flex w-full max-w-md lg:max-w-none"
    >
      {steps.map(({ label, image, icon: Icon }, index) => {
        const current = index === active;
        const passed = index < active;
        const failed = current && rejected;
        const approaching = index + 1 === active;
        return (
          <li
            key={label}
            aria-current={current ? 'step' : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 text-center"
          >
            <span
              className={`relative grid size-9 place-items-center rounded-full ring-1 sm:size-10 lg:size-11 ${
                failed
                  ? 'bg-danger-soft text-danger ring-danger/50'
                  : current
                    ? 'bg-brand-50 text-brand-ink ring-brand-500'
                    : passed
                      ? 'bg-success-soft text-success ring-success/40'
                      : 'bg-surface-muted text-ink-muted ring-line'
              }`}
            >
              {current ? (
                <img
                  src={`${import.meta.env.BASE_URL}orders/${image}.webp`}
                  alt=""
                  loading="lazy"
                  className="size-6 object-contain motion-reduce:hidden sm:size-7"
                />
              ) : null}
              <Icon
                aria-hidden="true"
                className={`size-4 ${current ? 'hidden motion-reduce:block' : ''}`}
              />
            </span>
            <span
              className={`text-[0.6875rem] leading-tight font-bold lg:text-xs ${current ? 'text-ink' : 'text-ink-muted'}`}
            >
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute top-2.5 left-full flex -translate-x-1/2 items-center sm:top-3 lg:top-[0.875rem] lg:w-[calc(100%-3.75rem)] lg:gap-2 ${
                  approaching
                    ? rejected
                      ? 'text-danger'
                      : 'text-brand-ink'
                    : passed
                      ? 'text-success'
                      : 'text-line-strong'
                }`}
              >
                <span className="hidden flex-1 border-t border-current opacity-30 lg:block" />
                <span className="flex shrink-0">
                  {[0, 1, 2].map((arrow) => (
                    <ChevronRight
                      key={arrow}
                      style={approaching ? { animationDelay: `${arrow * 180}ms` } : undefined}
                      className={`size-3.5 lg:size-4 ${arrow === 2 ? 'hidden lg:block' : ''} ${approaching ? 'motion-safe:animate-pulse' : ''}`}
                    />
                  ))}
                </span>
                <span className="hidden flex-1 border-t border-current opacity-30 lg:block" />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
