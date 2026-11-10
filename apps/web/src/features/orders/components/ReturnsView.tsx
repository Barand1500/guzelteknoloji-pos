import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Segmented } from '../../../components/ui/Segmented';
import { useReturns } from '../hooks/useOrders';
import {
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type ReturnKind,
  type ReturnRequest,
  type ReturnStatus,
} from '../types';
import { CountChips, ReturnPill, SampleNote, formatDateTime } from './parts';

const STATUSES: ReturnStatus[] = ['pending', 'approved', 'rejected', 'completed'];
const fold = (s: string) => s.toLocaleLowerCase('tr');

/** Talep satırındaki işlem düğmeleri: beklemede → Onayla / Reddet, onaylı → Tamamlandı. */
function Actions({
  r,
  busy,
  onStatus,
}: {
  r: ReturnRequest;
  busy: boolean;
  onStatus: (s: ReturnStatus) => void;
}) {
  const base =
    'inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-50';
  if (r.status === 'pending')
    return (
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus('approved')}
          aria-label={`${r.customer} talebini onayla`}
          className={`${base} bg-brand-700 text-white hover:bg-brand-800`}
        >
          <Check className="size-4" aria-hidden="true" />
          Onayla
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus('rejected')}
          aria-label={`${r.customer} talebini reddet`}
          className={`${base} bg-danger-soft text-danger hover:bg-danger hover:text-white`}
        >
          <X className="size-4" aria-hidden="true" />
          Reddet
        </button>
      </div>
    );
  if (r.status === 'approved')
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => onStatus('completed')}
        aria-label={`${r.customer} talebini tamamlandı yap`}
        className={`${base} border border-field-border text-ink hover:border-brand-500`}
      >
        <Check className="size-4" aria-hidden="true" />
        Tamamlandı
      </button>
    );
  return null;
}

/**
 * İade/Değişim Talepleri: durum hapları (sayaçlı), tip seçici (Hepsi · İade · Değişim), arama,
 * masaüstünde tablo / telefonda kartlar ve sayfalama. Bekleyen talep tek dokunuşla onaylanır ya da
 * reddedilir, onaylanan talep "Tamamlandı" yapılır.
 */
export function ReturnsView() {
  const { returns, loading, error, sample, refresh, setStatus } = useReturns();
  const [status, setStatusFilter] = useState<ReturnStatus | 'all'>('all');
  const [kind, setKind] = useState<ReturnKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const q = fold(query.trim());
  const base = useMemo(
    () =>
      returns
        .filter((r) => kind === 'all' || r.kind === kind)
        .filter((r) => !q || fold(r.customer).includes(q) || r.orderNo.includes(q))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [returns, kind, q],
  );
  const filtered = base.filter((r) => status === 'all' || r.status === status);

  const size = Math.min(100, Math.max(1, Number(sizeText) || 10));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * size, current * size);

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

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            label="Talep ara"
            placeholder="Müşteri veya sipariş no ara…"
          />
        </div>
        <div className="md:w-72">
          <Segmented
            label="Talep tipi"
            value={kind}
            options={[
              { value: 'all', label: 'Hepsi' },
              { value: 'return', label: 'İade' },
              { value: 'exchange', label: 'Değişim' },
            ]}
            onChange={(v) => {
              setKind(v as ReturnKind | 'all');
              setPage(1);
            }}
          />
        </div>
      </div>

      <CountChips<ReturnStatus | 'all'>
        label="Talep durumu"
        value={status}
        onChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        options={[
          { value: 'all', label: 'Tümü', count: base.length },
          ...STATUSES.map((s) => ({
            value: s,
            label: RETURN_STATUS_LABEL[s],
            count: base.filter((r) => r.status === s).length,
          })),
        ]}
      />

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
          <div className="hidden overflow-x-auto rounded-3xl border border-line bg-surface-raised md:block">
            <table className="w-full min-w-[48rem] border-collapse">
              <thead className="border-b border-line bg-surface-muted/50">
                <tr>
                  {['Müşteri · Sipariş No', 'Tip', 'Ürün', 'Tarih', 'Durum', ''].map((h) => (
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
                  <tr
                    key={r.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-brand-50/50"
                  >
                    <td className="px-4 py-3">
                      <span className="block max-w-60 truncate font-bold">{r.customer}</span>
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
                    <td className="px-4 py-3">
                      <Actions r={r} busy={busyId === r.id} onStatus={(s) => void change(r, s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="Talepler" className="flex flex-col gap-2.5 md:hidden">
            {shown.map((r, i) => (
              <li
                key={r.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="flex animate-rise-in flex-col gap-3 rounded-3xl border border-line bg-surface-raised p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{r.customer}</p>
                    <p className="text-xs text-ink-muted">
                      #{r.orderNo} · {formatDateTime(r.date)}
                    </p>
                  </div>
                  <ReturnPill status={r.status} />
                </div>
                <p className="text-sm text-ink-muted">
                  <b className="text-ink">{RETURN_KIND_LABEL[r.kind]}</b> · {r.itemCount} ürün ·{' '}
                  {r.reason}
                </p>
                <Actions r={r} busy={busyId === r.id} onStatus={(s) => void change(r, s)} />
              </li>
            ))}
          </ul>

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
    </div>
  );
}
