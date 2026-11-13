import { AlertTriangle, Ban, CheckCheck, ChevronDown, Clock, Repeat2, Users, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useNotifications } from '../hooks/useNotifications';
import {
  STATUS_LABEL,
  formatStamp,
  localStamp,
  type MobileNotification,
  type NotificationStatus,
} from '../types';
import { ComposeSheet, type ComposeInitial } from './ComposeSheet';

type Filter = 'all' | 'sent' | 'scheduled' | 'auto' | 'failed';
const fold = (s: string) => s.toLocaleLowerCase('tr');

const STATUS_STYLE: Record<NotificationStatus, { icon: typeof CheckCheck; tone: string }> = {
  sent: { icon: CheckCheck, tone: 'bg-success-soft text-success' },
  scheduled: { icon: Clock, tone: 'bg-accent-soft text-brand-800' },
  failed: { icon: AlertTriangle, tone: 'bg-danger-soft text-danger' },
  cancelled: { icon: Ban, tone: 'bg-surface-muted text-ink-muted' },
};

/** "Bugün", "Dün" ya da "12 Kasım" başlığı. */
function dayHeading(day: string, today: string): string {
  const diff = Math.round((Date.parse(today) - Date.parse(day)) / 86400000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  if (diff === -1) return 'Yarın';
  return new Date(day + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Mobil Bildirimler. Tablo yerine günlere ayrılmış bir akış: her bildirim telefondaki bildirim gibi bir kart
 * (durum simgesi, başlık, metin, kime gitti). Kart açılınca tam metin, "Tekrar kullan" ve (planlıysa) "İptal et"
 * çıkar. Üstte durum süzgeçleri ve arama; alttaki "+" bildirim yazma penceresini açar (canlı telefon önizlemesiyle).
 */
export function NotificationsPage() {
  const store = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('15');
  const [compose, setCompose] = useState<{ initial: ComposeInitial | null } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction('Bildirim Yaz', () => setCompose({ initial: null }));

  const items = useMemo(() => store.items ?? [], [store.items]);
  const counts = useMemo(
    () => ({
      all: items.length,
      sent: items.filter((n) => n.status === 'sent').length,
      scheduled: items.filter((n) => n.status === 'scheduled').length,
      auto: items.filter((n) => n.auto).length,
      failed: items.filter((n) => n.status === 'failed').length,
    }),
    [items],
  );
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return items
      .filter((n) => (filter === 'auto' ? n.auto : filter === 'all' ? true : n.status === filter))
      .filter((n) => !q || fold(`${n.title} ${n.text}`).includes(q))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [items, filter, query]);

  if (store.error && !store.items) return <Alert tone="error">{store.error}</Alert>;
  if (!store.items) return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  const size = Math.max(1, Number(sizeText) || 15);
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * size, current * size);
  const today = localStamp(new Date()).slice(0, 10);

  // Sayfadaki satırları günlere göre grupla
  const groups: { day: string; rows: MobileNotification[] }[] = [];
  for (const n of rows) {
    const day = n.at.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(n);
    else groups.push({ day, rows: [n] });
  }

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Tümü', count: counts.all },
    { id: 'sent', label: 'Gönderilen', count: counts.sent },
    { id: 'scheduled', label: 'Planlanan', count: counts.scheduled },
    { id: 'auto', label: 'Otomatik', count: counts.auto },
    ...(counts.failed ? [{ id: 'failed' as const, label: 'Hatalı', count: counts.failed }] : []),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      {!store.sample && (
        <Alert tone="info">
          Bildirimler burada kaydedilir ve planlanır. Mobil gönderim servisi henüz bağlı olmadığı
          için cihazlara iletilmez.
        </Alert>
      )}
      {problem ? <Alert tone="error">{problem}</Alert> : null}

      <SearchField
        value={query}
        onChange={(t) => {
          setQuery(t);
          setPage(1);
        }}
        label="Bildirim ara"
        placeholder="Başlık veya metinde ara…"
      />
      <div role="group" aria-label="Durum süzgeci" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {chips.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFilter(c.id);
                setPage(1);
              }}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all ${on ? 'border-brand-600 bg-brand-700 text-white shadow-soft' : 'border-field-border bg-surface text-ink-muted hover:border-brand-500 hover:text-ink'}`}
            >
              {c.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-white/20' : 'bg-surface-muted'}`}>{c.count}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center font-bold">
          Aramaya uyan bildirim yok
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.day} aria-label={dayHeading(g.day, today)} className="flex flex-col gap-2">
              <h2 className="px-1 text-sm font-extrabold tracking-wider text-ink-muted uppercase">{dayHeading(g.day, today)}</h2>
              <ul className="flex flex-col gap-2">
                {g.rows.map((n) => {
                  const st = STATUS_STYLE[n.status];
                  const Icon = st.icon;
                  const on = open === n.id;
                  return (
                    <li key={n.id} className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
                      <button
                        type="button"
                        aria-expanded={on}
                        aria-label={`${n.title}, ${STATUS_LABEL[n.status]}`}
                        onClick={() => setOpen(on ? null : n.id)}
                        className="flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-brand-50/40"
                      >
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${st.tone}`} title={STATUS_LABEL[n.status]}>
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 truncate font-extrabold">{n.title}</span>
                            <span className="shrink-0 text-xs font-bold text-ink-muted tabular-nums">{formatStamp(n.at).time}</span>
                          </span>
                          <span className={`mt-0.5 block text-sm text-ink-muted ${on ? '' : 'line-clamp-2'}`}>{n.text}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                            <span className={`rounded-full px-2 py-0.5 ${st.tone}`}>{STATUS_LABEL[n.status]}</span>
                            {n.auto ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-ink-muted">
                                <Zap className="size-3" aria-hidden="true" />
                                Otomatik
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-ink-muted">
                              <Users className="size-3" aria-hidden="true" />
                              {n.audience === null ? 'Tüm müşteriler' : `${n.audience} müşteri`}
                            </span>
                            {n.status === 'scheduled' ? (
                              <span className="text-brand-800">
                                {formatStamp(n.at).date} {formatStamp(n.at).time}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <ChevronDown className={`mt-2 size-5 shrink-0 text-ink-muted transition-transform duration-300 ${on ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {on ? (
                        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-muted/40 px-3.5 py-2.5">
                          {n.auto ? null : (
                            <button
                              type="button"
                              onClick={() => setCompose({ initial: { title: n.title, text: n.text } })}
                              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-50 px-4 text-sm font-bold text-brand-ink hover:bg-brand-100/60"
                            >
                              <Repeat2 className="size-4" aria-hidden="true" />
                              Tekrar kullan
                            </button>
                          )}
                          {n.status === 'scheduled' ? (
                            <button
                              type="button"
                              onClick={() => void store.cancel(n.id).catch((e: unknown) => setProblem(dataError(e)))}
                              className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-danger hover:bg-danger-soft"
                            >
                              <Ban className="size-4" aria-hidden="true" />
                              Planı iptal et
                            </button>
                          ) : null}
                          {n.auto ? <span className="py-2 text-xs text-ink-muted">Sipariş olaylarında sistem gönderir.</span> : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <PaginationBar
        total={filtered.length}
        from={filtered.length === 0 ? 0 : (current - 1) * size + 1}
        to={Math.min(filtered.length, current * size)}
        page={current}
        pageCount={pageCount}
        onPageChange={setPage}
        sizeText={sizeText}
        onSizeTextChange={(t) => {
          setSizeText(t);
          setPage(1);
        }}
        noun="bildirim"
      />

      {compose ? (
        <ComposeSheet
          key={compose.initial?.title ?? 'yeni'}
          initial={compose.initial}
          onSend={async (d) => {
            await store.send(d);
            setCompose(null);
            setFilter('all');
            setPage(1);
          }}
          onClose={() => setCompose(null)}
        />
      ) : null}
    </div>
  );
}
