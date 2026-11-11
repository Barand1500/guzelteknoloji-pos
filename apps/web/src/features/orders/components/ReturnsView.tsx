import { Download, ListFilter, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { CountUp } from '../../home/components/parts';
import { useReturns } from '../hooks/useOrders';
import {
  activeReturnFilterCount,
  emptyReturnFilters,
  filterReturns,
  type ReturnFilters,
} from '../return-filter';
import {
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type ReturnRequest,
  type ReturnStatus,
} from '../types';
import { ReturnExportSheet } from './ReturnExportSheet';
import { ReturnFilterSheet } from './ReturnFilterSheet';
import { ReturnTrack } from './ReturnTrack';
import { ReturnPill, SampleNote, formatDateTime } from './parts';

const COLUMNS = ['Müşteri · Sipariş No', 'Tip', 'Ürün', 'Tarih', 'Durum'];

function chipsOf(f: ReturnFilters): { id: string; label: string; clear: Partial<ReturnFilters> }[] {
  const out: { id: string; label: string; clear: Partial<ReturnFilters> }[] = [];
  if (f.kind !== 'all')
    out.push({ id: 'kind', label: RETURN_KIND_LABEL[f.kind], clear: { kind: 'all' } });
  if (f.status !== 'all')
    out.push({ id: 'status', label: RETURN_STATUS_LABEL[f.status], clear: { status: 'all' } });
  if (f.from || f.to)
    out.push({
      id: 'date',
      label: `${f.from || '…'} → ${f.to || '…'}`,
      clear: { from: '', to: '' },
    });
  return out;
}

/**
 * İade/Değişim Talepleri (Gelen Siparişler ile aynı tasarım dili): üç özet kutusu, arama + Süzgeçler
 * (pencere) + Dışa Aktar, açık süzgeç etiketleri, masaüstünde tablo / telefonda kartlar, sayfalama.
 * Satıra basınca talebin yolculuk şeridi (Talep → Onay → Tamamlandı, ret olursa kırmızı) açılır;
 * aynı anda yalnızca biri açıktır. Onayla / Reddet / Tamamlandı düğmeleri şeridin altındadır.
 */
export function ReturnsView() {
  const { returns, loading, error, sample, refresh, setStatus } = useReturns();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [filters, setFilters] = useState<ReturnFilters>(emptyReturnFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const [flowId, setFlowId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const filtered = useMemo(() => filterReturns(returns, filters), [returns, filters]);
  const size = Math.min(100, Math.max(1, Number(sizeText) || 10));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * size, current * size);
  const extra = activeReturnFilterCount(filters);
  const chips = chipsOf(filters);
  const count = (s: ReturnStatus) => filtered.filter((r) => r.status === s).length;

  const toggle = (id: string) => setFlowId((cur) => (cur === id ? null : id));
  const change = async (r: ReturnRequest, next: ReturnStatus) => {
    setBusyId(r.id);
    setProblem(null);
    try {
      await setStatus(r.id, next);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Durum değiştirilemedi.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error ? (
        <Alert tone="error">
          {error}
          <button type="button" className="ml-3 underline" onClick={refresh}>
            Tekrar Dene
          </button>
        </Alert>
      ) : null}
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      {sample ? <SampleNote /> : null}

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Talep', short: 'Talep', value: filtered.length },
          { label: 'Onay Bekleyen', short: 'Bekleyen', value: count('pending') },
          { label: 'Tamamlanan', short: 'Biten', value: count('completed') },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="min-w-0 animate-rise-in rounded-2xl border border-line bg-surface-raised px-3 py-3 shadow-soft sm:rounded-3xl sm:px-5 sm:py-4"
          >
            <dd className="truncate text-base font-extrabold tracking-tight sm:text-2xl">
              <CountUp value={s.value} />
            </dd>
            <dt className="truncate text-xs text-ink-muted sm:text-sm">
              <span className="sm:hidden">{s.short}</span>
              <span className="max-sm:hidden">{s.label}</span>
            </dt>
          </div>
        ))}
      </dl>

      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <SearchField
            value={filters.query}
            onChange={(v) => {
              setFilters((f) => ({ ...f, query: v }));
              setPage(1);
            }}
            label="Talep ara"
            placeholder="Müşteri veya sipariş no ara…"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label={extra > 0 ? `Süzgeçler, ${extra} açık` : 'Süzgeçler'}
          className={[
            'inline-flex h-13 shrink-0 items-center gap-2 rounded-full border px-4 font-bold transition-colors',
            extra > 0
              ? 'border-brand-600 bg-brand-50 text-brand-ink'
              : 'border-field-border bg-surface-raised text-ink-muted hover:border-brand-500',
          ].join(' ')}
        >
          <ListFilter className="size-5" aria-hidden="true" />
          <span className="max-sm:sr-only">Süzgeçler</span>
          {extra > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-xs text-white">
              {extra}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          aria-label="Dışa aktar"
          title="Dışa aktar"
          className="inline-flex size-13 shrink-0 items-center justify-center rounded-full border border-field-border bg-surface-raised text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink"
        >
          <Download className="size-5" aria-hidden="true" />
        </button>
      </div>

      {chips.length > 0 ? (
        <ul aria-label="Açık süzgeçler" className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, ...c.clear }));
                  setPage(1);
                }}
                aria-label={`${c.label} süzgecini kaldır`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-50 pr-2.5 pl-3.5 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-100"
              >
                {c.label}
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...emptyReturnFilters, query: f.query }))}
              className="min-h-9 px-2 text-sm font-semibold text-ink-muted underline"
            >
              Hepsini temizle
            </button>
          </li>
        </ul>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-surface-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
          <p className="text-lg font-bold">Talep bulunamadı</p>
          <p className="text-ink-muted">Bu süzgeçle eşleşen iade ya da değişim talebi yok.</p>
        </div>
      ) : (
        <>
          {wide ? (
            <div className="overflow-x-auto rounded-3xl border border-line bg-surface-raised">
              <table className="w-full min-w-[48rem] border-collapse">
                <thead className="border-b border-line bg-surface-muted/50">
                  <tr>
                    {COLUMNS.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-extrabold tracking-wider whitespace-nowrap text-ink-muted uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => toggle(r.id)}
                        aria-expanded={flowId === r.id}
                        className={[
                          'cursor-pointer transition-colors last:border-0',
                          flowId === r.id
                            ? 'border-b-0 bg-brand-50'
                            : 'border-b border-line hover:bg-brand-50/50',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3">
                          <span className="block max-w-72 truncate font-bold">{r.customer}</span>
                          <span className="text-xs text-ink-muted">
                            #{r.orderNo} · {r.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold">
                            {RETURN_KIND_LABEL[r.kind]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{r.itemCount} ürün</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-muted">
                          {formatDateTime(r.date)}
                        </td>
                        <td className="px-4 py-3">
                          <ReturnPill status={r.status} />
                        </td>
                      </tr>
                      {flowId === r.id ? (
                        <tr className="border-b border-line bg-brand-50 last:border-0">
                          <td colSpan={COLUMNS.length} className="px-4 pt-1 pb-5">
                            <ReturnTrack
                              request={r}
                              busy={busyId === r.id}
                              onStatus={(s) => void change(r, s)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul aria-label="Talepler" className="flex flex-col gap-2.5">
              {shown.map((r, i) => (
                <li
                  key={r.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={[
                    'animate-rise-in overflow-hidden rounded-3xl border transition-colors',
                    flowId === r.id
                      ? 'border-brand-600/60 bg-brand-50'
                      : 'border-line bg-surface-raised',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    aria-expanded={flowId === r.id}
                    aria-label={`${r.customer} talebini aç`}
                    className="flex w-full flex-col gap-2 p-4 text-left active:bg-brand-50/50"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-extrabold">{r.customer}</span>
                        <span className="block text-xs text-ink-muted">
                          #{r.orderNo} · {formatDateTime(r.date)}
                        </span>
                      </span>
                      <ReturnPill status={r.status} />
                    </span>
                    <span className="text-sm text-ink-muted">
                      <b className="text-ink">{RETURN_KIND_LABEL[r.kind]}</b> · {r.itemCount} ürün ·{' '}
                      {r.reason}
                    </span>
                  </button>
                  {flowId === r.id ? (
                    <div className="px-3 pt-1 pb-3">
                      <ReturnTrack
                        request={r}
                        busy={busyId === r.id}
                        onStatus={(s) => void change(r, s)}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <PaginationBar
            total={filtered.length}
            from={(current - 1) * size + 1}
            to={Math.min(filtered.length, current * size)}
            page={current}
            pageCount={pageCount}
            onPageChange={setPage}
            sizeText={sizeText}
            onSizeTextChange={(t) => {
              setSizeText(t);
              setPage(1);
            }}
            noun="talep"
          />
        </>
      )}

      {filterOpen ? (
        <ReturnFilterSheet
          rows={returns}
          value={filters}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
      {exportOpen ? (
        <ReturnExportSheet rows={returns} listed={filtered} onClose={() => setExportOpen(false)} />
      ) : null}
    </div>
  );
}
