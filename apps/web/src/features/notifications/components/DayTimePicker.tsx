import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const pad = (n: number) => String(n).padStart(2, '0');
const dayIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00'];

/**
 * Gün + saat seçici (tarayıcı kutusu yerine): ay takvimi (geçmiş günler kapalı) ve altında saat: hazır saatler ile
 * ± 15 dakikalık ayarlayıcı. Değer YYYY-MM-DDTHH:mm.
 */
export function DayTimePicker({
  value,
  today,
  onChange,
}: {
  value: string;
  /** YYYY-MM-DD: bundan önceki günler seçilemez. */
  today: string;
  onChange: (next: string) => void;
}) {
  const [day = today, time = '09:00'] = value.split('T');
  const seed = new Date(day + 'T00:00:00');
  const [view, setView] = useState({ y: seed.getFullYear(), m: seed.getMonth() });
  const go = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const total = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + total) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= total ? dayIso(view.y, view.m, d) : null;
  });

  const [h = 9, mm = 0] = time.split(':').map(Number);
  const setTime = (hh: number, min: number) => {
    const t = ((hh * 60 + min + 1440) % 1440);
    onChange(`${day}T${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  };

  return (
    <div role="group" aria-label="Gün ve saat" className="flex flex-col gap-3 rounded-2xl border border-field-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Önceki ay" onClick={() => go(-1)} className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <span className="font-extrabold">
          {MONTHS[view.m]} {view.y}
        </span>
        <button type="button" aria-label="Sonraki ay" onClick={() => go(1)} className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted">
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK.map((w) => (
          <span key={w} className="text-xs font-bold text-ink-muted">
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              disabled={d < today}
              aria-label={d}
              aria-pressed={d === day}
              onClick={() => onChange(`${d}T${time}`)}
              className={`mx-auto flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors disabled:text-ink-muted/40 ${d === day ? 'bg-brand-700 text-white' : 'enabled:hover:bg-surface-muted'} ${d === today && d !== day ? 'ring-1 ring-brand-600' : ''}`}
            >
              {Number(d.slice(8))}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-3">
        <button type="button" aria-label="15 dakika geri" onClick={() => setTime(h, mm - 15)} className="flex size-9 items-center justify-center rounded-full border border-field-border text-ink-muted hover:border-brand-500">
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span aria-live="polite" className="w-20 text-center text-2xl font-extrabold tabular-nums">
          {time}
        </span>
        <button type="button" aria-label="15 dakika ileri" onClick={() => setTime(h, mm + 15)} className="flex size-9 items-center justify-center rounded-full border border-field-border text-ink-muted hover:border-brand-500">
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <div className="flex basis-full flex-wrap justify-center gap-1.5">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === time}
              onClick={() => onChange(`${day}T${t}`)}
              className={`min-h-8 rounded-full border px-3 text-xs font-bold transition-colors ${t === time ? 'border-brand-600 bg-brand-700 text-white' : 'border-field-border text-ink-muted hover:border-brand-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
