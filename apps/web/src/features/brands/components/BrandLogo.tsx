import type { Brand } from '../types';

/** Logosu olmayan markalar için sıcak tonlarda, ada göre seçilen rozetler (renkler temadan). */
const TONES = [
  'bg-brand-50 text-brand-ink',
  'bg-surface-muted text-ink',
  'bg-accent-soft text-brand-ink',
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters =
    words.length > 1 ? words.slice(0, 2).map((w) => w[0] ?? '') : [...name].slice(0, 2);
  return letters.join('').toLocaleUpperCase('tr');
}

function toneFor(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return TONES[sum % TONES.length] ?? TONES[0]!;
}

const SIZES = {
  md: 'h-11 w-16 rounded-xl text-sm',
  lg: 'h-14 w-24 rounded-2xl text-base',
};

/**
 * Marka logosu. Logo yüklenmişse görüntülenir; yoksa ad baş harfleriyle bir rozet çizilir.
 * Logo zemini her zaman açık renklidir (siyah logolar koyu temada da okunsun diye).
 */
export function BrandLogo({
  brand,
  size = 'md',
}: {
  brand: Pick<Brand, 'name' | 'logoUrl'>;
  size?: keyof typeof SIZES;
}) {
  if (brand.logoUrl) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center bg-white p-1.5 ring-1 ring-line ${SIZES[size]}`}
      >
        <img src={brand.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-extrabold tracking-wide ${toneFor(brand.name)} ${SIZES[size]}`}
    >
      {initials(brand.name)}
    </span>
  );
}
