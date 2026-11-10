import { Download, Eye, ListFilter, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { CountUp, formatMoney, formatMoneyShort } from '../../home/components/parts';
import { useOrders } from '../hooks/useOrders';
import {
  activeFilterCount,
  emptyOrderFilters,
  filterOrders,
  ordersToCsv,
  sortOrders,
  type OrderFilters,
  type OrderSort,
  type OrderSortKey,
} from '../order-filter';
import {
  SOURCE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  type Order,
  type OrderSource,
  type OrderStatus,
} from '../types';
import { OrderSheet } from './OrderSheet';
import { CountChips, SampleNote, SortTh, StatusPill, formatDateTime } from './parts';

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Tüm kaynaklar' },
  ...(Object.keys(SOURCE_LABEL) as OrderSource[]).map((value) => ({
    value,
    label: SOURCE_LABEL[value],
  })),
];

const COLUMNS: { key: OrderSortKey; label: string; align?: string }[] = [
  { key: 'no', label: 'Sipariş No' },
  { key: 'date', label: 'Tarih' },
  { key: 'customer', label: 'Müşteri' },
  { key: 'total', label: 'Tutar', align: 'text-right' },
  { key: 'totalWithVat', label: 'KDV Dahil', align: 'text-right' },
  { key: 'status', label: 'Durum' },
];

function downloadCsv(orders: Order[]) {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(
    new Blob([ordersToCsv(orders)], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'siparisler.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Gelen Siparişler: üstte üç özet kutusu (sayı, toplam tutar, ödeme bekleyen), arama + filtreler +
 * dışa aktar, durum hapları (sayaçlı), masaüstünde sıralanabilir tablo / telefonda kartlar, altta
 * sayfalama. Bir siparişe basınca ayrıntı penceresi açılır (akış, ürünler, tutarlar, durum değişimi).
 */
export function OrdersView() {
  const { orders, loading, error, sample, refresh, setStatus } = useOrders();
  const [filters, setFilters] = useState<OrderFilters>(emptyOrderFilters);
  const [panel, setPanel] = useState(false);
  const [sort, setSort] = useState<OrderSort>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const [openId, setOpenId] = useState<string | null>(null);

  const set = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const filtered = useMemo(
    () => sortOrders(filterOrders(orders, filters), sort),
    [orders, filters, sort],
  );
  // Durum sayaçları: durum dışındaki süzgeçler uygulanmış haliyle.
  const forCounts = useMemo(() => filterOrders(orders, filters, true), [orders, filters]);
  const countOf = (s: OrderStatus) => forCounts.filter((o) => o.status === s).length;

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
  const open = orders.find((o) => o.id === openId) ?? null;

  const sortBy = (key: OrderSortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const reset = () => {
    setFilters(emptyOrderFilters);
    setPage(1);
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
      {sample ? <SampleNote /> : null}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Sipariş', node: <CountUp value={filtered.length} /> },
          {
            label: 'Toplam Tutar (KDV dahil)',
            node: <CountUp value={sumTotal} format={formatMoneyShort} />,
          },
          {
            label: 'Ödeme Bekleyen',
            node: <CountUp value={sumUnpaid} format={formatMoneyShort} />,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-rise-in rounded-3xl border border-line bg-surface-raised px-5 py-4 shadow-soft"
          >
            <dd className="text-2xl font-extrabold tracking-tight">{s.node}</dd>
            <dt className="text-sm text-ink-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <SearchField
            value={filters.query}
            onChange={(v) => set('query', v)}
            label="Sipariş ara"
            placeholder="Sipariş no veya müşteri ara…"
          />
        </div>
        <button
          type="button"
          onClick={() => setPanel((v) => !v)}
          aria-expanded={panel}
          aria-label="Filtreler"
          className={[
            'relative inline-flex h-13 shrink-0 items-center gap-2 rounded-full border px-4 font-bold transition-colors',
            panel || extra > 0
              ? 'border-brand-600 bg-brand-50 text-brand-ink'
              : 'border-field-border bg-surface-raised text-ink-muted hover:border-brand-500',
          ].join(' ')}
        >
          <ListFilter className="size-5" aria-hidden="true" />
          <span className="max-sm:sr-only">Filtreler</span>
          {extra > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-xs text-white">
              {extra}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          aria-label="Dışa aktar"
          title="Dışa aktar (CSV)"
          className="inline-flex size-13 shrink-0 items-center justify-center rounded-full border border-field-border bg-surface-raised text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink"
        >
          <Download className="size-5" aria-hidden="true" />
        </button>
      </div>

      {panel ? (
        <section
          aria-label="Filtreler"
          className="grid animate-fade-in gap-4 rounded-3xl border border-line bg-surface-raised p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <SelectField
            label="Kaynak"
            options={SOURCE_OPTIONS}
            value={filters.source}
            onChange={(v) => set('source', v as OrderFilters['source'])}
          />
          <div className="sm:col-span-1 lg:col-span-1">
            <Segmented
              label="Ödeme durumu"
              value={filters.paid}
              options={[
                { value: 'all', label: 'Hepsi' },
                { value: 'paid', label: 'Ödendi' },
                { value: 'unpaid', label: 'Ödenmedi' },
              ]}
              onChange={(v) => set('paid', v as OrderFilters['paid'])}
            />
          </div>
          <TextField
            label="Başlangıç tarihi"
            type="date"
            value={filters.from}
            onChange={(e) => set('from', e.target.value)}
          />
          <TextField
            label="Bitiş tarihi"
            type="date"
            value={filters.to}
            onChange={(e) => set('to', e.target.value)}
          />
          <TextField
            label="En düşük tutar (KDV dahil)"
            numeric="decimal"
            value={filters.min}
            onChange={(e) => set('min', e.target.value)}
          />
          <TextField
            label="En yüksek tutar (KDV dahil)"
            numeric="decimal"
            value={filters.max}
            onChange={(e) => set('max', e.target.value)}
          />
          <div className="flex items-center sm:col-span-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-danger-soft px-5 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Sıfırla
            </button>
          </div>
        </section>
      ) : null}

      <CountChips<OrderStatus | 'all'>
        label="Sipariş durumu"
        value={filters.status}
        onChange={(v) => set('status', v)}
        options={[
          { value: 'all', label: 'Tümü', count: forCounts.length },
          ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s], count: countOf(s) })),
        ]}
      />

      {loading ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-surface-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
          <p className="text-lg font-bold">Eşleşen sipariş yok</p>
          <p className="text-ink-muted">Arama ya da filtreleri değiştirmeyi deneyin.</p>
        </div>
      ) : (
        <>
          {/* Masaüstü: tablo */}
          <div className="hidden overflow-x-auto rounded-3xl border border-line bg-surface-raised md:block">
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
                  <tr
                    key={o.id}
                    onDoubleClick={() => setOpenId(o.id)}
                    className="border-b border-line transition-colors last:border-0 hover:bg-brand-50/50"
                  >
                    <td className="px-4 py-3 font-bold">#{o.no}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-muted">
                      {formatDateTime(o.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-56 truncate font-semibold">{o.customer}</span>
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
                        onClick={() => setOpenId(o.id)}
                        aria-label={`${o.no} numaralı siparişi görüntüle`}
                        title="Görüntüle"
                        className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-ink"
                      >
                        <Eye className="size-5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Telefon: kartlar */}
          <ul aria-label="Siparişler" className="flex flex-col gap-2.5 md:hidden">
            {shown.map((o, i) => (
              <li key={o.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise-in">
                <button
                  type="button"
                  onClick={() => setOpenId(o.id)}
                  aria-label={`${o.no} numaralı siparişi aç`}
                  className="flex w-full flex-col gap-2.5 rounded-3xl border border-line bg-surface-raised p-4 text-left transition-colors active:border-brand-500"
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
              </li>
            ))}
          </ul>

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
