import { Check, X } from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import { NEXT_STATUS, STATUS_LABEL } from '../types';
import { formatMoney } from '../../home/components/parts';

const STEPS: { status: OrderStatus; caption: string }[] = [
  { status: 'pending', caption: 'Sipariş alındı, koli hazırlanıyor' },
  { status: 'preparing', caption: 'Paketleniyor: koli bantlanıyor' },
  { status: 'shipped', caption: 'Kargo aracına yüklendi, yolda' },
  { status: 'delivered', caption: 'Teslim edildi!' },
];

const CAPTION: Record<OrderStatus, string> = {
  pending: 'Sipariş alındı, koli hazırlanıyor',
  preparing: 'Paketleniyor: koli bantlanıyor',
  shipped: 'Kargo aracına yüklendi, yolda',
  delivered: 'Teslim edildi!',
  cancelled: 'Sipariş iptal edildi, koli çöpe gitti',
};

/** Animasyonların tamamı burada; "hareketi azalt" ayarında hepsi tek karede biter (son hâl görünür). */
const CSS = `
.osc *{transform-box:view-box}
@keyframes osc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes osc-tape-arm{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(-25deg)}}
@keyframes osc-tape{0%{transform:scaleX(0)}70%,100%{transform:scaleX(1)}}
@keyframes osc-hop{0%{transform:translate(0,0)}45%{transform:translate(110px,-80px)}100%{transform:translate(222px,8px)}}
@keyframes osc-spin{to{transform:rotate(360deg)}}
@keyframes osc-road{to{transform:translateX(-64px)}}
@keyframes osc-shake{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes osc-wave{0%,100%{transform:rotate(-100deg)}50%{transform:rotate(-135deg)}}
@keyframes osc-cheer{0%,100%{transform:rotate(-125deg)}50%{transform:rotate(-150deg)}}
@keyframes osc-fall{0%{transform:translateY(-40px) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(200px) rotate(560deg);opacity:0}}
@keyframes osc-toss{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}55%{transform:translate(118px,-64px) rotate(150deg) scale(1)}100%{transform:translate(182px,56px) rotate(300deg) scale(.55);opacity:0}}
@keyframes osc-lid{0%,100%{transform:rotate(0)}30%,70%{transform:rotate(-65deg)}}
@keyframes osc-pop{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes osc-pulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes osc-hand{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}
@keyframes osc-speed{0%{transform:translateX(0);opacity:0}30%{opacity:.8}100%{transform:translateX(-60px);opacity:0}}
@keyframes osc-shrug{0%,100%{transform:rotate(-70deg)}50%{transform:rotate(-95deg)}}
.osc-bob{animation:osc-bob 2.4s ease-in-out infinite}
.osc-a{animation-fill-mode:both}
@media (prefers-reduced-motion:reduce){.osc *{animation-duration:.01ms!important;animation-iteration-count:1!important;animation-delay:0s!important}}
`;

/** "transform-origin" kısayolu (SVG kullanıcı birimi). */
const o = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px` });

/**
 * Sipariş sahnesi (çizim): bir paketçi ve koli. Duruma göre sahne değişir:
 * 1 Bekliyor → açık koli, saat balonu · 2 Hazırlanıyor → koliyi bantlıyor (bant çizilir) ·
 * 3 Kargoda → koli araca atlar, araç sallanır, tekerlekler döner · 4 Teslim → konfeti, havaya kalkan
 * kollar, onay işareti · İptal → koliyi çöp kutusuna fırlatır, kapak açılıp kapanır.
 * `key={status}` ile durum değişince animasyon baştan oynar.
 */
function Scene({ status }: { status: OrderStatus }) {
  const cancelled = status === 'cancelled';
  const shipped = status === 'shipped';
  const delivered = status === 'delivered';
  const pending = status === 'pending';
  const preparing = status === 'preparing';
  const BOX_X = 610;
  const BOX_Y = 98;

  return (
    <svg
      viewBox="0 0 1200 260"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label={CAPTION[status]}
      className="osc block h-56 w-full sm:h-64"
    >
      <style>{CSS}</style>

      {/* Arka plan: raf silüetleri ve zemin (kenarlara taşar) */}
      <g className="fill-line" opacity="0.55">
        {[40, 140, 240, 960, 1060, 1160].map((x, i) => (
          <g key={x}>
            <rect x={x} y={70 + (i % 2) * 14} width="70" height="8" rx="3" />
            <rect x={x + 6} y={40 + (i % 2) * 14} width="26" height="30" rx="4" />
            <rect x={x + 38} y={52 + (i % 2) * 14} width="26" height="18" rx="4" />
            <rect x={x} y={138} width="70" height="8" rx="3" />
            <rect x={x + 10} y={104} width="34" height="34" rx="4" />
          </g>
        ))}
      </g>
      <rect x="0" y="210" width="1200" height="50" className="fill-surface-muted" />
      <rect x="0" y="208" width="1200" height="4" className="fill-line" />

      <g transform="translate(-110 0)">
        {/* Yol çizgileri (kargoda kayar) */}
        {shipped ? (
          <g style={{ animation: 'osc-road 0.7s linear infinite' }}>
            {Array.from({ length: 16 }, (_, i) => (
              <rect
                key={i}
                x={560 + i * 64}
                y="236"
                width="34"
                height="5"
                rx="2.5"
                className="fill-line-strong"
                opacity="0.5"
              />
            ))}
          </g>
        ) : null}

        {/* Masa */}
        <rect
          x="545"
          y="152"
          width="210"
          height="14"
          rx="5"
          className="fill-line-strong"
          opacity="0.55"
        />
        <rect
          x="560"
          y="166"
          width="10"
          height="44"
          rx="3"
          className="fill-line-strong"
          opacity="0.45"
        />
        <rect
          x="730"
          y="166"
          width="10"
          height="44"
          rx="3"
          className="fill-line-strong"
          opacity="0.45"
        />

        {/* Çöp kutusu (iptalde) */}
        {cancelled ? (
          <g>
            <path d="M800 160 h54 l-6 50 h-42 z" className="fill-ink" opacity="0.85" />
            <rect
              x="808"
              y="170"
              width="4"
              height="30"
              rx="2"
              className="fill-surface"
              opacity="0.5"
            />
            <rect
              x="822"
              y="170"
              width="4"
              height="30"
              rx="2"
              className="fill-surface"
              opacity="0.5"
            />
            <rect
              x="836"
              y="170"
              width="4"
              height="30"
              rx="2"
              className="fill-surface"
              opacity="0.5"
            />
            <g
              className="osc-a"
              style={{ ...o(796, 158), animation: 'osc-lid 1.9s ease-in-out 0.2s both' }}
            >
              <rect x="794" y="152" width="66" height="9" rx="4" className="fill-ink" />
            </g>
          </g>
        ) : null}

        {/* Kargo aracı (kargoda) */}
        {shipped ? (
          <g style={{ animation: 'osc-shake 0.5s ease-in-out infinite' }}>
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={956 + i * 14}
                y={150 + i * 16}
                width="34"
                height="4"
                rx="2"
                className="fill-line-strong"
                style={{ animation: `osc-speed 0.9s linear ${i * 0.25}s infinite` }}
              />
            ))}
            <rect x="790" y="116" width="150" height="86" rx="12" className="fill-brand-600" />
            <rect
              x="802"
              y="128"
              width="126"
              height="62"
              rx="8"
              className="fill-brand-800"
              opacity="0.5"
            />
            <path d="M940 140 h26 q12 0 18 12 l10 20 v30 h-54 z" className="fill-brand-700" />
            <path d="M952 148 h14 q6 0 9 7 l5 11 h-28 z" className="fill-brand-50" />
            {[836, 946].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="206" r="17" className="fill-ink" />
                <g style={{ ...o(cx, 206), animation: 'osc-spin 0.6s linear infinite' }}>
                  <circle cx={cx} cy="206" r="8" className="fill-surface-muted" />
                  <rect x={cx - 1.5} y="198" width="3" height="16" className="fill-ink" />
                  <rect x={cx - 8} y="204.5" width="16" height="3" className="fill-ink" />
                </g>
              </g>
            ))}
          </g>
        ) : null}

        {/* Koli */}
        <g
          className="osc-a"
          style={{
            animation: shipped
              ? 'osc-hop 1.1s cubic-bezier(.3,.7,.4,1) both'
              : cancelled
                ? 'osc-toss 1.3s ease-in 0.5s both'
                : undefined,
            ...o(BOX_X + 40, BOX_Y + 27),
          }}
        >
          <rect x={BOX_X} y={BOX_Y} width="80" height="54" rx="3" fill="#d9a566" />
          <rect x={BOX_X} y={BOX_Y + 40} width="80" height="14" rx="3" fill="#c99556" />
          {pending ? (
            <>
              {/* Açık kapaklar */}
              <g style={{ ...o(BOX_X, BOX_Y), transform: 'rotate(-62deg)' }}>
                <rect x={BOX_X} y={BOX_Y - 6} width="40" height="6" rx="2" fill="#e4b574" />
              </g>
              <g style={{ ...o(BOX_X + 80, BOX_Y), transform: 'rotate(62deg)' }}>
                <rect x={BOX_X + 40} y={BOX_Y - 6} width="40" height="6" rx="2" fill="#e4b574" />
              </g>
              <rect
                x={BOX_X + 22}
                y={BOX_Y - 16}
                width="36"
                height="22"
                rx="4"
                className="fill-brand-600"
              />
              <rect
                x={BOX_X + 28}
                y={BOX_Y - 10}
                width="14"
                height="4"
                rx="2"
                className="fill-brand-50"
              />
            </>
          ) : (
            <>
              <rect x={BOX_X - 2} y={BOX_Y - 6} width="84" height="8" rx="2" fill="#e4b574" />
              {/* Koli bandı */}
              <rect
                x={BOX_X + 33}
                y={BOX_Y - 6}
                width="14"
                height="60"
                rx="1"
                fill="#f3d57a"
                className={preparing ? 'osc-a' : undefined}
                style={
                  preparing
                    ? {
                        ...o(BOX_X + 33, BOX_Y),
                        animation: 'osc-tape 1.6s ease-in-out infinite alternate',
                      }
                    : undefined
                }
              />
              <rect
                x={BOX_X + 6}
                y={BOX_Y + 24}
                width="22"
                height="10"
                rx="2"
                fill="#fff"
                opacity="0.85"
              />
            </>
          )}
          {delivered ? (
            <g
              className="osc-a"
              style={{ ...o(BOX_X + 80, BOX_Y), animation: 'osc-pop 0.6s 0.2s both' }}
            >
              <circle cx={BOX_X + 80} cy={BOX_Y} r="17" className="fill-success" />
              <path
                d={`M${BOX_X + 72} ${BOX_Y} l6 6 l11 -12`}
                fill="none"
                stroke="#fff"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : null}
        </g>

        {/* Paketçi */}
        <g
          className={delivered ? undefined : 'osc-bob'}
          style={delivered ? { animation: 'osc-bob 0.7s ease-in-out infinite' } : undefined}
        >
          {/* bacaklar */}
          <rect x="482" y="166" width="16" height="42" rx="6" fill="#2b3340" />
          <rect x="502" y="166" width="16" height="42" rx="6" fill="#2b3340" />
          <rect x="478" y="202" width="24" height="8" rx="4" className="fill-ink" />
          <rect x="500" y="202" width="24" height="8" rx="4" className="fill-ink" />
          {/* arka kol */}
          <g
            style={{
              ...o(484, 122),
              animation: delivered
                ? 'osc-cheer 0.7s ease-in-out infinite'
                : cancelled
                  ? 'osc-shrug 1.2s ease-in-out infinite'
                  : undefined,
              transform: delivered || cancelled ? undefined : 'rotate(92deg)',
            }}
          >
            <rect x="484" y="115" width="60" height="14" rx="7" className="fill-brand-700" />
            <circle cx="544" cy="122" r="8" fill="#f3c9a5" />
          </g>
          {/* gövde */}
          <rect x="470" y="104" width="60" height="70" rx="20" className="fill-brand-600" />
          <rect
            x="482"
            y="140"
            width="36"
            height="24"
            rx="6"
            className="fill-brand-800"
            opacity="0.45"
          />
          {/* baş */}
          <circle cx="500" cy="82" r="24" fill="#f3c9a5" />
          <path d="M476 80 q2 -26 26 -26 q22 0 22 24 q-14 -12 -48 2 z" fill="#3b2a20" />
          <path d="M474 74 h56 q0 -22 -28 -22 q-28 0 -28 22 z" className="fill-brand-800" />
          <rect x="522" y="72" width="16" height="6" rx="3" className="fill-brand-800" />
          <circle cx="510" cy="84" r="2.6" fill="#2b2118" />
          {cancelled ? (
            <path
              d="M498 96 q8 -6 16 0"
              fill="none"
              stroke="#2b2118"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M498 94 q8 8 16 0"
              fill="none"
              stroke="#2b2118"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}
          {/* ön kol (omuz 518,122) */}
          <g
            style={{
              ...o(518, 122),
              animation: preparing
                ? 'osc-tape-arm 0.9s ease-in-out infinite'
                : shipped
                  ? 'osc-wave 0.8s ease-in-out infinite'
                  : delivered
                    ? 'osc-cheer 0.7s ease-in-out infinite'
                    : cancelled
                      ? 'osc-shrug 1.2s ease-in-out infinite'
                      : undefined,
              transform: pending ? 'rotate(14deg)' : undefined,
            }}
          >
            <rect x="518" y="115" width="104" height="14" rx="7" className="fill-brand-600" />
            <circle cx="622" cy="122" r="9" fill="#f3c9a5" />
            {preparing ? (
              <g>
                {/* bant makarası */}
                <circle cx="628" cy="112" r="11" fill="#f3d57a" />
                <circle cx="628" cy="112" r="5" className="fill-surface" />
              </g>
            ) : null}
          </g>
        </g>

        {/* Bekleme balonu (saat) */}
        {pending ? (
          <g style={{ animation: 'osc-pulse 1.6s ease-in-out infinite' }}>
            <circle
              cx="548"
              cy="44"
              r="19"
              className="fill-surface-raised"
              stroke="#c2410c"
              strokeWidth="3"
            />
            <g style={{ ...o(548, 44), animation: 'osc-spin 6s linear infinite' }}>
              <rect x="546.5" y="32" width="3" height="13" rx="1.5" className="fill-ink" />
            </g>
            <g style={{ ...o(548, 44), animation: 'osc-spin 36s linear infinite' }}>
              <rect
                x="546.5"
                y="38"
                width="3"
                height="8"
                rx="1.5"
                className="fill-brand-600"
                transform="rotate(90 548 44)"
              />
            </g>
            <circle cx="526" cy="64" r="4" className="fill-surface-raised" />
            <circle cx="518" cy="74" r="2.5" className="fill-surface-raised" />
          </g>
        ) : null}

        {/* Bantlama kıvılcımları */}
        {preparing
          ? [0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={BOX_X + 20 + i * 24}
                cy="84"
                r="3"
                fill="#f3d57a"
                style={{ animation: `osc-pulse 0.9s ease-in-out ${i * 0.25}s infinite` }}
              />
            ))
          : null}

        {/* İptal işareti */}
        {cancelled ? (
          <g className="osc-a" style={{ ...o(660, 70), animation: 'osc-pop 0.5s 1.4s both' }}>
            <circle cx="660" cy="70" r="20" className="fill-danger" />
            <path
              d="M652 62 l16 16 M668 62 l-16 16"
              stroke="#fff"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </g>
        ) : null}

        {/* Konfeti (teslimde) */}
        {delivered
          ? Array.from({ length: 18 }, (_, i) => {
              const colors = ['#c2410c', '#ffb44d', '#1a7f4b', '#f3d57a', '#b42318'];
              return (
                <rect
                  key={i}
                  x={420 + ((i * 53) % 440)}
                  y="10"
                  width={i % 3 === 0 ? 9 : 6}
                  height={i % 3 === 0 ? 5 : 9}
                  rx="1.5"
                  fill={colors[i % colors.length]}
                  style={{
                    animation: `osc-fall ${2.2 + (i % 4) * 0.35}s linear ${(i % 6) * 0.3}s infinite`,
                  }}
                />
              );
            })
          : null}
      </g>
    </svg>
  );
}

interface OrderSceneProps {
  order: Order | null;
  busy: boolean;
  onStatus: (status: OrderStatus) => void;
}

/**
 * Sayfanın altını baştan sona kaplayan "Sipariş Sahnesi": seçili siparişin durumunu 1-2-3-4
 * adımlarıyla ve bir paketçi animasyonuyla gösterir. Düğmelerle durum ilerletilir ya da sipariş
 * iptal edilir; sahne anında değişir.
 */
export function OrderScene({ order, busy, onStatus }: OrderSceneProps) {
  const status = order?.status ?? 'pending';
  const index = STEPS.findIndex((s) => s.status === status);
  const next = NEXT_STATUS[status];
  const cancelled = status === 'cancelled';

  return (
    <section
      aria-label="Sipariş sahnesi"
      className="-mx-4 flex flex-col overflow-hidden border-y border-line bg-gradient-to-b from-brand-50/70 via-surface to-surface-muted tablet:-mx-8 2xl:-mx-12"
    >
      <div className="flex flex-col gap-3 px-4 pt-4 tablet:px-8 md:flex-row md:items-center md:justify-between 2xl:px-12">
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">
            Sipariş Sahnesi
          </p>
          {order ? (
            <p className="truncate text-lg font-extrabold tracking-tight">
              #{order.no} · {order.customer}
              <span className="ml-2 text-base font-semibold text-ink-muted">
                {formatMoney(order.totalWithVat)}
              </span>
            </p>
          ) : (
            <p className="text-lg font-bold text-ink-muted">Bir sipariş seçin</p>
          )}
        </div>

        {/* 1 · 2 · 3 · 4 adımları */}
        <ol aria-label="Sipariş adımları" className="flex items-center gap-1.5 md:gap-2">
          {STEPS.map((s, i) => {
            const reached = !cancelled && i <= index;
            const current = !cancelled && i === index;
            return (
              <li key={s.status} className="flex items-center gap-1.5 md:gap-2">
                <span
                  aria-current={current ? 'step' : undefined}
                  className={[
                    'flex size-9 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-500',
                    cancelled
                      ? 'bg-surface-muted text-ink-muted'
                      : reached
                        ? 'bg-brand-700 text-white'
                        : 'bg-surface-muted text-ink-muted',
                    current ? 'scale-110 ring-4 ring-brand-600/25' : '',
                  ].join(' ')}
                  title={STATUS_LABEL[s.status]}
                >
                  {!cancelled && i < index ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                  <span className="sr-only">{STATUS_LABEL[s.status]}</span>
                </span>
                {i < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={`h-1 w-5 rounded-full transition-colors duration-500 sm:w-8 ${!cancelled && i < index ? 'bg-brand-700' : 'bg-line'}`}
                  />
                ) : null}
              </li>
            );
          })}
          {cancelled ? (
            <li className="ml-1 flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1.5 text-sm font-bold text-danger">
              <X className="size-4" aria-hidden="true" />
              İptal Edildi
            </li>
          ) : null}
        </ol>
      </div>

      <div key={status + (order?.id ?? '')}>
        <Scene status={status} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-surface-raised/70 px-4 py-3 tablet:px-8 sm:flex-row sm:items-center sm:justify-between 2xl:px-12">
        <p aria-live="polite" className="text-sm font-bold">
          {CAPTION[status]}
        </p>
        {order ? (
          <div className="flex gap-2">
            {next ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onStatus(next)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60 sm:flex-none"
              >
                Sıradaki adım: {STATUS_LABEL[next]}
              </button>
            ) : null}
            {status !== 'cancelled' && status !== 'delivered' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onStatus('cancelled')}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-danger-soft px-5 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-60"
              >
                İptal Et
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
