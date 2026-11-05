import { brandConfig } from '../../../config/brand.config';

/** Gerçek logo yoksa brand.config'teki monogram ve adla metin tabanlı geçici logo çizer. */
export function BrandMark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { name, monogram, logoSrc } = brandConfig;
  if (logoSrc) return <img src={logoSrc} alt={name} className="h-9 w-auto" />;

  const light = tone === 'light';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={[
          'grid size-9 place-items-center rounded-xl text-sm font-extrabold tracking-tight',
          light ? 'bg-white text-brand-700 shadow-sm' : 'bg-brand-700 text-white',
        ].join(' ')}
      >
        {monogram}
      </span>
      <span
        className={['text-lg font-bold tracking-tight', light ? 'text-white' : 'text-ink'].join(
          ' ',
        )}
      >
        {name}
      </span>
    </span>
  );
}
