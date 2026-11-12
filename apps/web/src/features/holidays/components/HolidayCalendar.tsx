import { useMemo } from 'react';
import { iso, type Block } from '../types';

const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/**
 * Ay takvimi. Art arda tatil günleri tek bir şerit olarak birbirine BAĞLI çizilir (Kurban Bayramı 4 günlük bir
 * hap gibi görünür, satır başında/sonunda kesilip yeni satırda devam eder). Resmî tatiller turuncu, özel tatiller
 * sarımsı, seçilen aralık koyu renklidir. Hafta sonları kırmızımsı, bugün halkalıdır.
 */
export function HolidayCalendar({
  year,
  month,
  blocks,
  sel,
  activeKey,
  today,
  onPickDay,
}: {
  year: number;
  month: number;
  blocks: Block[];
  /** Eklemek için seçilen aralık. */
  sel: { start: string; end: string } | null;
  activeKey: string | null;
  today: string;
  onPickDay: (day: string, block: Block | null) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Block>();
    for (const b of blocks) {
      let d = new Date(b.start + 'T00:00:00');
      for (let i = 0; i < b.days; i++) {
        map.set(iso(d.getFullYear(), d.getMonth(), d.getDate()), b);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
    }
    return map;
  }, [blocks]);

  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + total) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= total ? iso(year, month, d) : null;
  });

  return (
    <div role="grid" aria-label="Tatil takvimi" className="grid grid-cols-7 gap-y-1.5">
      {WEEK.map((w, i) => (
        <span key={w} className={`pb-1 text-center text-xs font-bold ${i > 4 ? 'text-danger/70' : 'text-ink-muted'}`}>
          {w}
        </span>
      ))}
      {cells.map((day, i) => {
        if (!day) return <span key={i} />;
        const col = i % 7;
        const block = byDay.get(day) ?? null;
        const inSel = sel && day >= sel.start && day <= sel.end;
        const range = inSel ? sel : block;
        const first = range ? day === range.start || col === 0 : false;
        const last = range ? day === range.end || col === 6 : false;
        const active = block && block.key === activeKey;
        const label = block ? `${Number(day.slice(8))} ${block.name}` : String(Number(day.slice(8)));
        return (
          <button
            key={day}
            type="button"
            aria-label={block ? `${day}: ${block.name}` : day}
            title={block?.name}
            aria-pressed={Boolean(inSel || active)}
            onClick={() => onPickDay(day, block)}
            className="group relative flex h-11 items-center justify-center outline-none"
          >
            {range ? (
              <span
                aria-hidden="true"
                className={[
                  'absolute inset-y-0.5 inset-x-0 transition-colors',
                  first ? 'rounded-l-full' : '',
                  last ? 'rounded-r-full' : '',
                  inSel
                    ? 'bg-brand-700'
                    : active
                      ? 'bg-brand-600/30'
                      : block?.source === 'custom'
                        ? 'bg-accent-soft'
                        : 'bg-brand-100/70',
                ].join(' ')}
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0.5 rounded-full transition-colors group-hover:bg-surface-muted group-focus-visible:ring-2 group-focus-visible:ring-brand-600"
              />
            )}
            <span
              data-label={label}
              className={[
                'relative text-sm font-bold',
                inSel ? 'text-white' : block ? 'text-brand-ink' : col > 4 ? 'text-danger/70' : '',
                day === today && !inSel ? 'underline decoration-2 underline-offset-4' : '',
              ].join(' ')}
            >
              {Number(day.slice(8))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
