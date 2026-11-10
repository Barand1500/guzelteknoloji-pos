/** Hazır renk paleti (popüler renkler) ve renk adı önerisi. */
export interface NamedColor {
  name: string;
  hex: string;
}

export const COLOR_PALETTE: readonly NamedColor[] = [
  { name: 'Siyah', hex: '#000000' },
  { name: 'Beyaz', hex: '#ffffff' },
  { name: 'Gri', hex: '#9ca3af' },
  { name: 'Gümüş', hex: '#c0c0c0' },
  { name: 'Kırmızı', hex: '#e5251d' },
  { name: 'Bordo', hex: '#7f1d1d' },
  { name: 'Turuncu', hex: '#f57c00' },
  { name: 'Sarı', hex: '#f9d71c' },
  { name: 'Altın', hex: '#d4af37' },
  { name: 'Yeşil', hex: '#1f9d55' },
  { name: 'Turkuaz', hex: '#14b8a6' },
  { name: 'Mavi', hex: '#3f86c8' },
  { name: 'Lacivert', hex: '#1e2a5a' },
  { name: 'Mor', hex: '#7c3aed' },
  { name: 'Pembe', hex: '#ec4899' },
  { name: 'Kahverengi', hex: '#8a5330' },
  { name: 'Bej', hex: '#dfbfa5' },
];

const fold = (s: string) => s.toLocaleLowerCase('tr').trim();

/** Adı paletteki bir renge denk geliyorsa rengini verir ("kırmızı" → #e5251d). */
export function colorByName(name: string): string | null {
  const key = fold(name);
  return COLOR_PALETTE.find((c) => fold(c.name) === key)?.hex ?? null;
}

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Seçilen renge en yakın paletteki renk adı (otomatik ad önerisi için). */
export function nearestColorName(hex: string): string {
  const [r, g, b] = rgb(hex);
  let best = COLOR_PALETTE[0]!;
  let bestDistance = Infinity;
  for (const c of COLOR_PALETTE) {
    const [r2, g2, b2] = rgb(c.hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  return best.name;
}
