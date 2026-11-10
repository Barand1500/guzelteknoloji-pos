import { Search, Settings, X } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { SECTIONS, type Section, type SectionPage } from '../../config/sections';
import { Tile } from './MenuTile';

/** Bölümün rengi: simge zemini (iki temada da okunur). */
const blob = (hue: number) =>
  `linear-gradient(135deg, hsl(${hue} 78% 58%), hsl(${(hue + 28) % 360} 74% 48%))`;

interface PhoneMenuProps {
  current: Section;
  /** Önizlenen (seçili) bölümün kimliği. */
  preview: string;
  onPreview: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  close: () => void;
  pagesOf: (s: Section) => SectionPage[];
  results: { section: Section; page: SectionPage }[];
}

/** Yaydaki bölümler (Ayarlar çark düğmesiyle açıldığı için yayda yok). */
const FAN = SECTIONS.filter((s) => s.id !== 'ayarlar');

/**
 * Telefonda Başlat Menüsü: ALTTAN açılan bir sayfa. Bölümler, başparmağın rahat ulaştığı yerde, alt
 * ortadaki bir "kadran"ın (yarım daire) etrafına dizilir; kadranın ortası seçili bölümün simgesidir.
 * Yaya dokunarak ya da parmağı yay boyunca KAYDIRARAK bölüm seçilir (her geçişte hafif titreşim);
 * seçilince üstteki alanda o bölümün sayfaları kutular olarak değişir. Başlık çubuğundan aşağı
 * çekince sayfa kapanır. Arama ve Ayarlar (çark) üstte durur.
 */
export function PhoneMenu({
  current,
  preview,
  onPreview,
  query,
  onQuery,
  close,
  pagesOf,
  results,
}: PhoneMenuProps) {
  const shown = SECTIONS.find((s) => s.id === preview) ?? current;
  const searching = query.trim() !== '';
  const Icon = shown.icon;

  // Yay, açılışta kadranın ortasından çıkıp yerine açılır.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  // Başlıktan aşağı çekerek kapatma.
  const [drag, setDrag] = useState<number | null>(null);
  const startY = useRef(0);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    startY.current = e.clientY;
    setDrag(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    setDrag(Math.max(0, e.clientY - startY.current));
  };
  const onUp = () => {
    if (drag !== null && drag > 90) close();
    setDrag(null);
  };

  // Yay boyunca kaydırarak seçim.
  const hub = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(-1);
  const pick = (id: string) => {
    onPreview(id);
    navigator.vibrate?.(8);
  };
  const onFanMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !hub.current) return;
    const box = hub.current.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    if (e.clientY > cy + 12) return; // kadranın altındaki alan seçim yapmaz
    const angle = Math.min(Math.PI, Math.max(0, Math.atan2(cy - e.clientY, e.clientX - cx)));
    const index = Math.round(((Math.PI - angle) / Math.PI) * (FAN.length - 1));
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      pick(FAN[index]!.id);
    }
  };

  const pages = searching ? null : pagesOf(shown);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Ana menü" aria-modal="true">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/45"
        onClick={close}
        aria-hidden="true"
      />
      <div
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: drag === null ? 'transform 220ms ease-out' : 'none',
        }}
        className="absolute inset-x-0 bottom-0 flex h-[min(42rem,90dvh)] animate-sheet-in flex-col overflow-hidden rounded-t-[2rem] border border-b-0 border-line bg-surface-raised shadow-card"
      >
        {/* Üst renk şeridi: seçili bölümün tonu */}
        <span
          aria-hidden="true"
          style={{ background: blob(shown.hue) }}
          className="absolute inset-x-0 top-0 h-1 transition-[background] duration-500"
        />

        {/* Tutamak + başlık (aşağı çekilebilir) */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="touch-none px-5 pt-3"
        >
          <span
            aria-hidden="true"
            className="mx-auto block h-1.5 w-11 rounded-full bg-line-strong/40"
          />
          <div className="flex items-center gap-2.5 pt-3">
            <h2 className="flex-1 text-xl font-extrabold tracking-tight">Başlat Menüsü</h2>
            <button
              type="button"
              onClick={() => {
                onQuery('');
                pick('ayarlar');
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Ayarlar"
              aria-pressed={!searching && shown.id === 'ayarlar'}
              className={[
                'inline-flex size-11 items-center justify-center rounded-xl border transition-colors',
                !searching && shown.id === 'ayarlar'
                  ? 'border-brand-600 bg-brand-50 text-brand-ink'
                  : 'border-line text-ink-muted',
              ].join(' ')}
            >
              <Settings className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={close}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Menüyü kapat"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-line text-ink-muted"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Arama */}
        <div className="px-5 pt-3 pb-3">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 transition-colors focus-within:border-brand-600">
            <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              aria-label="Menüde ara"
              placeholder="Sayfa veya bölüm ara…"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted"
            />
          </label>
        </div>

        {/* Sayfalar */}
        <div
          role="tabpanel"
          aria-label={searching ? 'Arama sonuçları' : shown.label}
          className="min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-4"
        >
          {searching ? (
            results.length === 0 ? (
              <p className="py-8 text-center text-ink-muted">
                “{query.trim()}” ile eşleşen sayfa yok.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-2.5">
                {results.map(({ page, section }, i) => (
                  <Tile
                    key={`${section.id}-${page.id}`}
                    page={page}
                    siblings={section.pages}
                    soon={section.soon}
                    index={i}
                    onGo={close}
                    compact
                  />
                ))}
              </ul>
            )
          ) : (
            <>
              <p className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-wider text-ink-muted uppercase">
                {shown.label}
                <span className="rounded-full bg-surface-muted px-2 py-0.5">{pages!.length}</span>
                <span className="font-semibold tracking-normal normal-case">· {shown.tagline}</span>
              </p>
              <ul key={shown.id} className="grid grid-cols-3 gap-2.5">
                {pages!.map((page, i) => (
                  <Tile
                    key={page.id}
                    page={page}
                    siblings={shown.pages}
                    soon={shown.soon}
                    index={i}
                    onGo={close}
                    compact
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Kadran: başparmak yayı */}
        <div
          role="tablist"
          aria-label="Bölümler"
          onPointerMove={onFanMove}
          onPointerUp={() => (lastIndex.current = -1)}
          style={{ '--r': 'min(36vw, 7.5rem)' } as CSSProperties}
          className="relative h-[calc(var(--r)+6.5rem)] shrink-0 touch-none overflow-hidden border-t border-line bg-gradient-to-b from-surface to-surface-muted"
        >
          {FAN.map((s, i) => {
            const theta = Math.PI - (i * Math.PI) / (FAN.length - 1);
            const SIcon = s.icon;
            const on = !searching && shown.id === s.id;
            const gone = !ready;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={s.label}
                title={s.label}
                onClick={() => {
                  onQuery('');
                  pick(s.id);
                }}
                style={{
                  left: gone ? '50%' : `calc(50% + var(--r) * ${Math.cos(theta).toFixed(4)})`,
                  bottom: gone
                    ? '3.4rem'
                    : `calc(3.4rem + var(--r) * ${Math.sin(theta).toFixed(4)})`,
                  transform: `translate(-50%, 50%) scale(${gone ? 0.3 : on ? 1.2 : 1})`,
                  transitionDelay: gone ? '0ms' : `${i * 35}ms`,
                  background: on ? blob(s.hue) : undefined,
                  opacity: gone ? 0 : 1,
                }}
                className={[
                  'absolute flex size-12 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]',
                  on
                    ? 'text-white shadow-card ring-4 ring-surface-raised'
                    : 'bg-surface-raised text-ink shadow-soft ring-1 ring-line',
                ].join(' ')}
              >
                <SIcon className="size-5" aria-hidden="true" />
              </button>
            );
          })}

          {/* Kadranın ortası: seçili bölüm */}
          <div
            ref={hub}
            aria-hidden="true"
            style={{ background: blob(shown.hue) }}
            className="absolute bottom-[1.5rem] left-1/2 flex size-[3.8rem] -translate-x-1/2 items-center justify-center rounded-full text-white shadow-card ring-4 ring-surface-raised transition-[background] duration-500"
          >
            <Icon key={shown.id} className="size-7 animate-pop" />
          </div>
          <p
            aria-live="polite"
            className="absolute inset-x-0 bottom-1.5 truncate text-center text-xs font-extrabold tracking-wide text-ink-muted"
          >
            {shown.label}
          </p>
        </div>
      </div>
    </div>
  );
}
