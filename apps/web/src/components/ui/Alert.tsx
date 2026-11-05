import { AlertCircle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface AlertProps {
  tone?: 'error' | 'info';
  children: ReactNode;
  id?: string;
}

/** Hatalar role="alert" ile hemen, bilgiler role="status" ile nazikçe duyurulur. */
export function Alert({ tone = 'error', children, id }: AlertProps) {
  const isError = tone === 'error';
  const Icon = isError ? AlertCircle : Info;
  return (
    <div
      id={id}
      role={isError ? 'alert' : 'status'}
      className={[
        'animate-fade-in flex items-start gap-3 rounded-control border px-4 py-3 text-sm leading-relaxed',
        isError
          ? 'border-danger/25 bg-danger-soft text-danger'
          : 'border-brand-100 bg-brand-50 text-ink',
      ].join(' ')}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
