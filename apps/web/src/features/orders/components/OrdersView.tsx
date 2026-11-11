import { Download, Eye, ListFilter, Route, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { CountUp, formatMoney, formatMoneyShort } from '../../home/components/parts';
import { useOrders } from '../hooks/useOrders';
import {
  activeFilterCount,
  emptyOrderFilters,
  filterOrders,
  sortOrders,
  type OrderFilters,
  type OrderSort,
  type OrderSortKey,
} from '../order-filter';
import { SOURCE_LABEL, type OrderStatus } from '../types';
import { OrderExportSheet } from './OrderExportSheet';
import { OrderFilterSheet } from './OrderFilterSheet';
import { OrderTrack } from './OrderTrack';
import { OrderSheet } from './OrderSheet';
import { SampleNote, SortTh, StatusPill, formatDateTime } from './parts';

const COLUMNS: { key: OrderSortKey; label: string; align?: string }[] = [
  { key: 'no', label: 'Sipariş No' },
  { key: 'date', label: 'Tarih' },
  { key: 'customer', label: 'Müşteri' },
  { key: 'total', label: 'Tutar', align: 'text-right' },
  { key: 'totalWithVat', label: 'KDV Dahil', align: 'text-right' },
  { key: 'status', label: 'Durum' },
];

/** Açık süzgeçlerin kaldırılabilir küçük etiketleri. */
function chipsOf(f: OrderFilters): { id: string; label: string; clear: Partial<OrderFilters> }[] {
  const out: { id: string; label: string; clear: Partial<OrderFilters> }[] = [];
  if (f.source !== 'all')
    out.push({ id: 'source', label: SOURCE_LABEL[f.source], clear: { source: 'all' } });
  if (f.paid !== 'all')
    out.push({
      id: 'paid',
      label: f.paid === 'paid' ? 'Ödendi' : 'Ödenmedi',
      clear: { paid: 'all' },
    });
  if (f.from || f.to)
    out.push({
      id: 'date',
      label: `${f.from || '…'} → ${f.to || '…'}`,
      clear: { from: '', to: '' },
    });
  if (f.min || f.max)
    out.push({
      id: 'amount',
      label: `${f.min || '0'} – ${f.max || '∞'} ₺`,
      clear: { min: '', max: '' },
    });
  return out;
}

/**
 * Gelen Siparişler: üstte üç özet kutusu, arama + Süzgeçler (pencere) + Dışa Aktar (sihirbaz), açık
 * süzgeç etiketleri, masaüstünde sıralanabilir tablo / telefonda kartlar, sayfalama ve en altta tüm
 * Her satırın altında siparişin yolculuk şeridi (Bekliyor → Hazırlanıyor → Kargoda → Teslim) açıktır;
 * arama çubuğunun yanındaki rota düğmesi bunu hep-açık / yalnızca-tıklananlar arasında değiştirir.
 * Çift tıklayınca (ya da göz simgesiyle) ayrıntı penceresi açılır.
 */
export function OrdersView() {
  const { orders, loading, error, sample, refresh, setStatus } = useOrders();
  // Tablo ve kartlar aynı anda çizilmez (görseller iki kez yüklenmesin).
  const wide = useMediaQuery('(min-width: 64rem)');
  const [filters, setFilters] = useState<OrderFilters>(emptyOrderFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [sort, setSort] = useState<OrderSort>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const [openId, setOpenId] = useState<string | null>(null);
  // Sipariş akışları: açıkken HER satırın altında görünür; kapalıyken yalnızca tıklanan satırlarda.
  const [flowAll, setFlowAll] = useState(true);
  const [flowIds, setFlowIds] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const filtered = useMemo(
    () => sortOrders(filterOrders(orders, filters), sort),
    [orders, filters, sort],
  );

  const size = Math.min(100, Math.max(1, Number(sizeText) || 10));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * size, current * size);
  const from = filtered.length === 0 ? 0 : (current - 1) * size + 1;
  const to = Math.min(filtered.length, current * size);

  const sumTotal = filtered.reduce((n, o) => n + o.totalWithVat, 0);
  const sumUnpaid = filtered
    .filter((o) => !o.paid && o.status !== 'cancelled')
    .reduce((n, o) => n + o.totalWithVat, 0);
  const extra = activeFilterCount(filters);
  const chips = chipsOf(filters);
  const open = orders.find((o) => o.id === openId) ?? null;
  const flowOpen = (id: string) => flowAll || flowIds.has(id);
  const toggle = (id: string) => {
    if (flowAll) return; // hepsi açıkken satır tıklaması bir şey değiştirmez
    setFlowIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortBy = (key: OrderSortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const changeStatus = async (id: string, status: OrderStatus) => {
    setBusy(true);
    setProblem(null);
    try {
      await setStatus(id, status);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Durum değiştirilemedi.');
    } finally {
      setBusy(false);
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
          { label: 'Sipariş', short: 'Sipariş', node: <CountUp value={filtered.length} /> },
          {
            label: 'Toplam Tutar (KDV dahil)',
            short: 'Toplam',
            node: <CountUp value={sumTotal} format={formatMoneyShort} />,
          },
          {
            label: 'Ödeme Bekleyen',
            short: 'Bekleyen',
            node: <CountUp value={sumUnpaid} format={formatMoneyShort} />,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="min-w-0 animate-rise-in rounded-2xl border border-line bg-surface-raised px-3 py-3 shadow-soft sm:rounded-3xl sm:px-5 sm:py-4"
          >
            <dd className="truncate text-base font-extrabold tracking-tight sm:text-2xl">
              {s.node}
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
            label="Sipariş ara"
            placeholder="Sipariş no veya müşteri ara…"
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
        <button
          type="button"
          onClick={() => setFlowAll((v) => !v)}
          aria-pressed={flowAll}
          aria-label="Sipariş akışlarını göster"
          title={flowAll ? 'Akışlar hep açık (kapatmak için bas)' : 'Akışları hep göster'}
          className={[
            'inline-flex size-13 shrink-0 items-center justify-center rounded-full border transition-all duration-300',
            flowAll
              ? 'border-brand-600 bg-brand-700 text-white shadow-soft'
              : 'border-field-border bg-surface-raised text-ink-muted hover:border-brand-500 hover:text-brand-ink',
          ].join(' ')}
        >
          <Route className="size-5" aria-hidden="true" />
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
              onClick={() => setFilters((f) => ({ ...emptyOrderFilters, query: f.query }))}
              className="min-h-9 px-2 text-sm font-semibold text-ink-muted underline"
            >
              Hepsini temizle
            </button>
          </li>
        </ul>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-surface-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
          <p className="text-lg font-bold">Eşleşen sipariş yok</p>
          <p className="text-ink-muted">Arama ya da süzgeçleri değiştirmeyi deneyin.</p>
        </div>
      ) : (
        <>
          {/* Masaüstü: tablo */}
          {wide ? (
            <div className="overflow-x-auto rounded-3xl border border-line bg-surface-raised">
              <table className="w-full min-w-[56rem] border-collapse">
                <thead className="border-b border-line bg-surface-muted/50">
                  <tr>
                    {COLUMNS.map((c) => (
                      <SortTh
                        key={c.key}
                        label={c.label}
                        active={sort.key === c.key}
                        dir={sort.dir}
                        onSort={() => sortBy(c.key)}
                        className={c.align}
                      />
                    ))}
                    <th className="w-12 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((o) => (
                    <Fragment key={o.id}>
                      <tr
                        onClick={() => toggle(o.id)}
                        onDoubleClick={() => setOpenId(o.id)}
                        aria-expanded={flowOpen(o.id)}
                        className={[
                          'cursor-pointer border-b border-line transition-colors last:border-0',
                          flowOpen(o.id) ? 'bg-brand-50/70' : 'hover:bg-brand-50/50',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3 font-bold">#{o.no}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-muted">
                          {formatDateTime(o.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="block max-w-56 truncate font-semibold">
                            {o.customer}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {SOURCE_LABEL[o.source]} · {o.paid ? 'Ödendi' : 'Ödeme bekleniyor'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{formatMoney(o.total)}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatMoney(o.totalWithVat)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={o.status} />
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(o.id);
                            }}
                            aria-label={`${o.no} numaralı siparişi görüntüle`}
                            title="Görüntüle"
                            className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-ink"
                          >
                            <Eye className="size-5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                      {flowOpen(o.id) ? (
                        <tr className="border-b border-line bg-brand-50 last:border-0">
                          <td colSpan={COLUMNS.length + 1} className="px-4 pt-1 pb-5">
                            <OrderTrack
                              order={o}
                              busy={busy}
                              onStatus={(st) => void changeStatus(o.id, st)}
                              onDetails={() => setOpenId(o.id)}
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
            <ul aria-label="Siparişler" className="flex flex-col gap-2.5">
              {shown.map((o, i) => (
                <li
                  key={o.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={[
                    'animate-rise-in overflow-hidden rounded-3xl border bg-surface-raised transition-colors',
                    flowOpen(o.id) ? 'border-brand-600/60' : 'border-line',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    aria-expanded={flowOpen(o.id)}
                    aria-label={`${o.no} numaralı siparişi aç`}
                    className="flex w-full flex-col gap-2.5 p-4 text-left active:bg-brand-50/50"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-extrabold">#{o.no}</span>
                      <StatusPill status={o.status} />
                    </span>
                    <span className="flex items-end justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{o.customer}</span>
                        <span className="block text-xs text-ink-muted">
                          {formatDateTime(o.date)} · {SOURCE_LABEL[o.source]}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-extrabold">{formatMoney(o.totalWithVat)}</span>
                        <span
                          className={`text-xs font-bold ${o.paid ? 'text-success' : 'text-brand-800'}`}
                        >
                          {o.paid ? 'Ödendi' : 'Ödeme bekleniyor'}
                        </span>
                      </span>
                    </span>
                  </button>
                  {flowOpen(o.id) ? (
                    <div className="border-t border-brand-600/25 bg-brand-50/70 px-3 pt-4 pb-3">
                      <OrderTrack
                        order={o}
                        busy={busy}
                        onStatus={(st) => void changeStatus(o.id, st)}
                        onDetails={() => setOpenId(o.id)}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <PaginationBar
            total={filtered.length}
            from={from}
            to={to}
            page={current}
            pageCount={pageCount}
            onPageChange={setPage}
            sizeText={sizeText}
            onSizeTextChange={(t) => {
              setSizeText(t);
              setPage(1);
            }}
            noun="sipariş"
          />
        </>
      )}

      {filterOpen ? (
        <OrderFilterSheet
          orders={orders}
          value={filters}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
      {exportOpen ? (
        <OrderExportSheet orders={orders} listed={filtered} onClose={() => setExportOpen(false)} />
      ) : null}
      {open ? (
        <OrderSheet
          key={open.id}
          order={open}
          onStatus={(s) => setStatus(open.id, s)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}
