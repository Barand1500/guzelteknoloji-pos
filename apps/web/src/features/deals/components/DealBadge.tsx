import type { DealIcon, DealIconKey } from '../types';

/**
 * Rozet şekilleri: renkler içeriktir (rozet ürün resminin üstüne basılacağı için) ve temaya göre
 * değişmez. Yazı, şeklin ortasına sığacak şekilde kendiliğinden küçülür.
 */
const SHAPES: Record<DealIconKey, { fill: string; shape: React.ReactNode }> = {
  yeni: {
    fill: '#3f86c8',
    shape: (
      <polygon points="32,2 38,12 50,8 51,20 62,24 56,34 62,44 51,48 50,60 38,55 32,62 26,55 14,60 13,48 2,44 8,34 2,24 13,20 14,8 26,12" />
    ),
  },
  'cok-satan': { fill: '#f08a14', shape: <circle cx="32" cy="32" r="30" /> },
  indirim: {
    fill: '#e5251d',
    shape: (
      <path d="M6 14a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H38l-6 10-6-10H12a6 6 0 0 1-6-6z" />
    ),
  },
  firsat: { fill: '#1f9d55', shape: <rect x="2" y="12" width="60" height="40" rx="14" /> },
  yildiz: {
    fill: '#c21f2e',
    shape: <path d="M32 2l8 18 20 2-15 13 5 20-18-10-18 10 5-20L4 22l20-2z" />,
  },
};

function fontSize(text: string): number {
  const len = [...text].length;
  if (len <= 1) return 30;
  if (len <= 3) return 18;
  if (len <= 5) return 14;
  return 11;
}

/** Bir fırsatın rozeti: hazır şekil + yazı ya da yüklenen görsel. Boyutu kapsayıcıdan (className) alır. */
export function DealBadge({
  icon,
  text,
  className = 'size-10',
}: {
  icon: DealIcon;
  text: string;
  className?: string;
}) {
  if (icon.type === 'image') {
    return <img src={icon.url} alt="" className={`${className} shrink-0 object-contain`} />;
  }
  const { fill, shape } = SHAPES[icon.key];
  const lines = text.length > 5 && text.includes(' ') ? text.split(' ', 2) : [text];
  const size = fontSize(lines.reduce((a, b) => (a.length >= b.length ? a : b), ''));
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`${className} shrink-0 drop-shadow-sm`}
      role="img"
    >
      <g fill={fill}>{shape}</g>
      <text
        x="32"
        textAnchor="middle"
        fill="#fff"
        fontWeight="900"
        fontSize={size}
        fontFamily="system-ui, sans-serif"
      >
        {lines.map((line, i) => (
          <tspan key={i} x="32" y={32 + size * 0.35 + (i - (lines.length - 1) / 2) * (size + 1)}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
