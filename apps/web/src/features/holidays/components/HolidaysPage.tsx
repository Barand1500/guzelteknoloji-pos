import { CalendarPlus, ChevronLeft, ChevronRight, Link2, Trash2, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction, usePublishSaveAction } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useHolidays } from '../hooks/useHolidays';
import {
  MONTHS,
  MONTHS_SHORT,
  addDays,
  bridgeFor,
  diffDays,
  formatDay,
  formatRange,
  groupBlocks,
  todayIso,
  type Block,
} from '../types';
import { AddHolidaySheet } from './AddHolidaySheet';
import { HolidayCalendar } from './HolidayCalendar';

function countdown(b: Block, today: string): { text: string; tone: 'past' | 'now' | 'soon' | 'later' } {
  if (b.end < today) return { text: 'Geçti', tone: 'past' };
  if (b.start <= today) return { text: 'Şimdi', tone: 'now' };
  const d = diffDays(today, b.start);
  return { text: d === 1 ? 'Yarın' : `${d} gün sonra`, tone: d <= 14 ? 'soon' : 'later' };
}
const TONE = {
  past: 'bg-surface-muted text-ink-muted',
  now: 'bg-success-soft text-success',
  soon: 'bg-accent-soft text-brand-800',
  later: 'bg-brand-50 text-brand-ink',
} as const;

/**
 * Resmi Tatil Günleri: ay takvimi + yıl listesi. Resmî tatiller ücretsiz bir genel API'den kendiliğinden gelir
 * (dinî bayramlar dahil); art arda günler takvimde tek şerit olarak bağlanır. Takvimde boş bir güne basınca (ikinci
 * güne basınca aralık olur) ad yazılıp eklenir; alttaki "+" ise pencerede başlangıç-bitiş seçtirir. Köprü günü
 * önerileri tek dokunuşla özel tatil olur.
 */
export function HolidaysPage() {
  const now = new Date();
  const today = todayIso();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const data = useHolidays(year);
  const [sel, setSel] = useState<{ start: string; end: string } | null>(null);
  const [active, setActive] = useState<Block | null>(null);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [sheet, setSheet] = useState(false);
  const [deleting, setDeleting] = useState<Block | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const blocks = useMemo(
    () =>
      groupBlocks(
        data.official,
        data.custom.filter((c) => c.start <= `${year}-12-31` && c.end >= `${year}-01-01`),
      ),
    [data.official, data.custom, year],
  );
  const taken = useMemo(() => {
    const s = new Set<string>();
    for (const b of blocks) for (let i = 0; i < b.days; i++) s.add(addDays(b.start, i));
    return s;
  }, [blocks]);
  const nextBlock = blocks.find((b) => b.end >= today) ?? null;
  const officialDays = blocks.filter((b) => b.source === 'official').reduce((n, b) => n + b.days, 0);

  const goMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const jump = (day: string) => {
    setYear(Number(day.slice(0, 4)));
    setMonth(Number(day.slice(5, 7)) - 1);
  };

  const pickDay = (day: string, block: Block | null) => {
    setProblem(null);
    if (block) {
      setActive(block);
      setEditName(block.name);
      setSel(null);
      return;
    }
    setActive(null);
    if (!sel || sel.start !== sel.end) setSel({ start: day, end: day });
    else if (day < sel.start) setSel({ start: day, end: day });
    else if (day === sel.start) setSel(null);
    else setSel({ start: sel.start, end: day });
  };
  const clear = () => {
    setSel(null);
    setActive(null);
    setName('');
  };

  const canAdd = sel !== null && name.trim() !== '';
  const canRename = active?.source === 'custom' && editName.trim() !== '' && editName.trim() !== active.name;
  const saveCurrent = async () => {
    if (saving) return;
    setSaving(true);
    setProblem(null);
    try {
      if (canAdd && sel) {
        await data.create({ name: name.trim(), start: sel.start, end: sel.end });
        clear();
      } else if (canRename && active?.id) {
        await data.update(active.id, { name: editName.trim(), start: active.start, end: active.end });
        setActive({ ...active, name: editName.trim() });
      }
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };
  usePublishSaveAction(canAdd || canRename ? { onSave: () => void saveCurrent(), saving } : null);
  usePublishAddAction('Tatil Ekle', () => setSheet(true));

  if (data.error && data.loading === false && data.official.length === 0 && !data.sample)
    return <Alert tone="error">{data.error}</Alert>;
  if (data.loading) return <div className="h-96 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  const monthCounts = MONTHS.map((_, m) => blocks.filter((b) => Number(b.start.slice(5, 7)) - 1 === m).length);
  const bridge = active ? bridgeFor(active, taken) : null;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {data.sample && !data.offline ? <SampleNote /> : null}
      {data.offline ? (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-accent-soft px-3 py-1.5 text-sm font-bold text-brand-800">
          <WifiOff className="size-4" aria-hidden="true" />
          Resmî tatil servisine ulaşılamadı; {year === 2026 ? 'yedek liste gösteriliyor' : 'bu yıl için veri yok'}.
        </p>
      ) : null}
      {problem ? <Alert tone="error">{problem}</Alert> : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Takvim */}
        <section aria-label="Takvim" className="rounded-[2rem] border border-line bg-surface-raised p-4 shadow-soft sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Önceki ay"
              onClick={() => goMonth(-1)}
              className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-extrabold tracking-tight">
                {MONTHS[month]} {year}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setYear(now.getFullYear());
                  setMonth(now.getMonth());
                }}
                className="text-xs font-bold text-brand-ink underline"
              >
                Bugüne git
              </button>
            </div>
            <button
              type="button"
              aria-label="Sonraki ay"
              onClick={() => goMonth(1)}
              className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Yılın 12 ayı: o aydaki tatil sayısı nokta olarak görünür */}
          <div role="group" aria-label="Aylar" className="mt-3 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
            {MONTHS_SHORT.map((m, i) => (
              <button
                key={m}
                ref={(el) => {
                  if (i === month) el?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
                }}
                type="button"
                aria-pressed={i === month}
                aria-label={`${MONTHS[i]}${monthCounts[i] ? `, ${monthCounts[i]} tatil` : ''}`}
                onClick={() => setMonth(i)}
                className={`flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-xs font-bold transition-colors ${i === month ? 'bg-brand-700 text-white' : 'text-ink-muted hover:bg-surface-muted'}`}
              >
                {m}
                <span className="mt-0.5 flex h-1.5 gap-0.5" aria-hidden="true">
                  {Array.from({ length: Math.min(monthCounts[i]!, 4) }, (_, k) => (
                    <span key={k} className={`size-1.5 rounded-full ${i === month ? 'bg-white/80' : 'bg-brand-500'}`} />
                  ))}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <HolidayCalendar
              year={year}
              month={month}
              blocks={blocks}
              sel={sel}
              activeKey={active?.key ?? null}
              today={today}
              onPickDay={pickDay}
            />
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-brand-100/70" /> Resmî
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-accent-soft" /> Özel
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-brand-700" /> Seçili
            </span>
          </p>

          {/* Seçili gün(ler): ekleme paneli */}
          {sel ? (
            <div className="mt-4 animate-rise-in rounded-2xl border border-brand-500/30 bg-brand-50/60 p-3">
              <p className="font-extrabold">
                {formatRange(sel.start, sel.end)}
                {sel.start !== sel.end ? (
                  <span className="font-semibold text-ink-muted"> · {diffDays(sel.start, sel.end) + 1} gün</span>
                ) : null}
              </p>
              <p className="text-xs text-ink-muted">
                {sel.start === sel.end ? 'Aralık için ikinci bir güne basın.' : 'Başka bir güne basarak aralığı değiştirin.'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    label="Tatilin adı"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canAdd) void saveCurrent();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={clear}
                  className="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold text-ink-muted hover:bg-surface-muted"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : null}

          {/* Seçilen tatil: ayrıntı */}
          {active ? (
            <div className="mt-4 animate-rise-in rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{active.name}</p>
                  <p className="text-sm text-ink-muted">
                    {formatRange(active.start, active.end)} · {active.days} gün
                    {active.tentative ? ' · tahmini tarih' : ''}
                  </p>
                  <p className="mt-1 text-xs font-bold text-ink-muted">
                    {active.source === 'official' ? 'Resmî tatil · otomatik güncellenir' : 'Özel tatil'}
                  </p>
                </div>
                {active.source === 'custom' ? (
                  <button
                    type="button"
                    aria-label={`${active.name} sil`}
                    onClick={() => setDeleting(active)}
                    className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {active.source === 'custom' ? (
                <div className="mt-2">
                  <TextField
                    label="Tatilin adı"
                    value={editName}
                    maxLength={80}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
              ) : null}
              {bridge ? (
                <button
                  type="button"
                  onClick={() =>
                    void data
                      .create({ name: 'Köprü günü', start: bridge.day, end: bridge.day })
                      .catch((e: unknown) => setProblem(dataError(e)))
                  }
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-bold text-brand-800 hover:opacity-90"
                >
                  <Link2 className="size-4" aria-hidden="true" />
                  {formatDay(bridge.day)}’i de tatil yap → {bridge.total} gün üst üste
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Yıl listesi */}
        <section aria-label="Yıl tatilleri" className="flex min-w-0 flex-col gap-3">
          <div className="rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-surface-raised to-surface-raised p-4 shadow-soft">
            {nextBlock ? (
              <>
                <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Sıradaki tatil</p>
                <p className="mt-0.5 text-xl font-extrabold">{nextBlock.name}</p>
                <p className="text-sm text-ink-muted">
                  {formatRange(nextBlock.start, nextBlock.end)} · {countdown(nextBlock, today).text}
                </p>
              </>
            ) : (
              <p className="font-bold">{year} için kalan tatil yok.</p>
            )}
            <p className="mt-2 text-sm text-ink-muted">
              {year}: <b className="text-ink">{officialDays}</b> resmî tatil günü · <b className="text-ink">{blocks.length}</b> tatil
            </p>
          </div>

          <ul aria-label="Tatil listesi" className="flex flex-col gap-2">
            {blocks.map((b, i) => {
              const c = countdown(b, today);
              return (
                <li key={b.key} style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }} className="animate-rise-in">
                  <button
                    type="button"
                    aria-label={`${b.name}, ${formatRange(b.start, b.end)}`}
                    onClick={() => {
                      jump(b.start);
                      setActive(b);
                      setEditName(b.name);
                      setSel(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-surface-raised p-3 text-left transition-colors hover:border-brand-500/50 ${active?.key === b.key ? 'border-brand-600' : 'border-line'} ${c.tone === 'past' ? 'opacity-60' : ''}`}
                  >
                    <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-ink">
                      <span className="text-lg leading-none font-extrabold">{Number(b.start.slice(8))}</span>
                      <span className="text-[0.625rem] font-bold uppercase">{MONTHS_SHORT[Number(b.start.slice(5, 7)) - 1]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">{b.name}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink-muted">
                        <span>{formatRange(b.start, b.end)}</span>
                        {b.days > 1 ? <span className="rounded-full bg-surface-muted px-2 py-0.5">{b.days} gün</span> : null}
                        {b.source === 'custom' ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-brand-800">Özel</span> : null}
                        {b.tentative ? <span className="rounded-full bg-surface-muted px-2 py-0.5">Tahmini</span> : null}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${TONE[c.tone]}`}>{c.text}</span>
                  </button>
                </li>
              );
            })}
            {blocks.length === 0 ? (
              <li className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-10 text-center">
                <CalendarPlus className="size-8 text-brand-600/60" aria-hidden="true" />
                <p className="font-bold">Bu yıl için tatil yok</p>
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      {sheet ? (
        <AddHolidaySheet
          initial={sel}
          onSave={async (d) => {
            await data.create(d);
            setSheet(false);
            clear();
            jump(d.start);
          }}
          onClose={() => setSheet(false)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Özel tatil silinir."
        confirmLabel="Sil"
        onConfirm={() => {
          const d = deleting;
          setDeleting(null);
          if (d?.id) {
            setActive(null);
            void data.remove(d.id).catch((e: unknown) => setProblem(dataError(e)));
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
