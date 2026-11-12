import { BellRing } from 'lucide-react';

/** Telefonun kilit ekranındaki bildirim görünümü (yazdıkça canlı değişir). */
export function PhonePreview({ title, text, audience, when }: { title: string; text: string; audience: string; when: string }) {
  return (
    <figure aria-label="Bildirim önizlemesi" className="m-0 flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#1d2630] to-[#0f151c] p-4 shadow-card">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/20" aria-hidden="true" />
        <p className="text-center text-4xl font-extrabold tracking-tight text-white/90 tabular-nums" aria-hidden="true">
          9:41
        </p>
        <div className="mt-4 rounded-2xl bg-white/95 p-3 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5a6673]">
            <span className="flex size-5 items-center justify-center rounded-md bg-brand-700 text-white">
              <BellRing className="size-3" aria-hidden="true" />
            </span>
            GÜZEL TEKNOLOJİ
            <span className="ml-auto font-semibold">şimdi</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug font-extrabold text-[#17212b]">
            {title.trim() || 'Bildirim başlığı'}
          </p>
          <p className="mt-0.5 line-clamp-4 text-sm leading-snug text-[#17212b]/80">
            {text.trim() || 'Metin yazdıkça burada görünür.'}
          </p>
        </div>
      </div>
      <figcaption className="text-center text-sm text-ink-muted">
        <b className="text-ink">{audience}</b> · {when}
      </figcaption>
    </figure>
  );
}
