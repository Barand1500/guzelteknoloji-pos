import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { formatDay } from '../types';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const todayIso = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};
const addDays = (isoDay: string, n: number) => {
  const d = new Date(isoDay + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};
const spanDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;

/**
 * Tarih aralığı seçici (tarayıcının tarih kutusu yerine): üstte "Bugünden 30 gün" gibi hazır süreler, altında ay
 * takvimi. İlk gün başlangıç, ikinci gün bitiş olur (ilkten önceye basılırsa başlangıç taşınır); aradaki günler
 * vurgulanır, üstte seçilen aralık ve gün sayısı yazar.
 */
export function RangeCalendar({
  start,
  end,
  onChange,
  error,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  error?: string | undefined;
}) {
  const today = todayIso();
  const seed = new Date((start || today) + 'T00:00:00');
  const [month, setMonth] = useState({ y: seed.getFullYear(), m: seed.getMonth() });

  const go = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (day: string) => {
    if (!start || (start && end)) onChange(day, '');
    else if (day < start) onChange(day, '');
    else onChange(start, day);
  };

  const presets: [string, () => [string, string]][] = [
    ['1 hafta', () => [today, addDays(today, 6)]],
    ['30 gün', () => [today, addDays(today, 29)]],
    ['Bu ay', () => [iso(month.y, month.m, 1), iso(month.y, month.m, new Date(month.y, month.m + 1, 0).getDate())]],
    ['Yıl sonuna kadar', () => [today, iso(new Date().getFullYear(), 11, 31)]],
  ];

  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(month.y, month.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + total) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= total ? iso(month.y, month.m, d) : null;
  });

  const summary =
    start && end
      ? `${formatDay(start)} → ${formatDay(end)} · ${spanDays(start, end)} gün`
      : start
        ? `${formatDay(start)} → bitiş gününü seçin`
        : 'Başlangıç ve bitiş günlerini seçin';

  return (
    <div
      role="group"
      aria-label="Tarih aralığı"
      className={`flex flex-col gap-3 rounded-2xl border bg-surface p-3 ${error ? 'border-danger' : 'border-field-border'}`}
    >
      <p aria-live="polite" className="text-center text-sm font-extrabold">
        {summary}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {presets.map(([label, make]) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              const [s, e] = make();
              onChange(s, e);
              setMonth({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
            }}
            className="min-h-8 rounded-full border border-field-border px-3 text-xs font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Önceki ay"
          onClick={() => go(-1)}
          className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <span className="font-extrabold">
          {MONTHS[month.m]} {month.y}
        </span>
        <button
          type="button"
          aria-label="Sonraki ay"
          onClick={() => go(1)}
          className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK.map((w) => (
          <span key={w} className="text-xs font-bold text-ink-muted">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const isStart = day === start;
          const isEnd = day === end;
          const inside = start && end && day > start && day < end;
          return (
            <button
              key={day}
              type="button"
              aria-label={formatDay(day)}
              aria-pressed={isStart || isEnd}
              onClick={() => pick(day)}
              className={[
                'mx-auto flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                isStart || isEnd
                  ? 'bg-brand-700 text-white'
                  : inside
                    ? 'bg-brand-50 text-brand-ink'
                    : 'hover:bg-surface-muted',
                day === today && !(isStart || isEnd) ? 'ring-1 ring-brand-600' : '',
              ].join(' ')}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
