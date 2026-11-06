import type { Category } from '../types';

/** Görseli olmayan kategoriler için sıcak tonlarda, ada göre seçilen rozetler (renkler temadan). */
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

/**
 * Kategori görseli. Boyutu ve köşesi dışarıdan verilir (className). Görsel zemini her zaman açık
 * renklidir (koyu temada da okunsun); görsel yoksa ad baş harfleriyle bir rozet çizilir.
 */
export function CategoryImage({
  category,
  className,
}: {
  category: Pick<Category, 'name' | 'imageUrl'>;
  className: string;
}) {
  if (category.imageUrl) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden bg-white p-1.5 ring-1 ring-line ${className}`}
      >
        <img src={category.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-extrabold tracking-wide ${toneFor(category.name)} ${className}`}
    >
      {initials(category.name)}
    </span>
  );
}
