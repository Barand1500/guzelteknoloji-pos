import { Building2, ChevronRight, Download, ListFilter, Mail, Phone, User, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePublishAddAction } from '../../app-shell/save-action';
import { CountUp, formatMoneyShort } from '../../home/components/parts';
import { SampleNote, SortTh, formatDateTime } from '../../orders/components/parts';
import {
  activeCustomerFilterCount,
  emptyCustomerFilters,
  filterCustomers,
  initials,
  sortCustomers,
  type CustomerFilters,
  type CustomerSort,
  type CustomerSortKey,
} from '../customer-filter';
import { KIND_LABEL, balanceOf, type Customer } from '../types';
import { CustomerExportSheet } from './CustomerExportSheet';
import { useCustomerStore } from './CustomerLayout';
import { CustomerFilterSheet } from './CustomerFilterSheet';
import { CustomerFormSheet } from './CustomerFormSheet';

/** Bakiye rozeti: borçlu (kırmızı), alacaklı (yeşil) ya da hesap kapalı. */
export function BalanceChip({ customer }: { customer: Pick<Customer, 'debt' | 'credit'> }) {
  const b = balanceOf(customer);
  if (b === 0) return <span className="text-sm text-ink-muted">Hesap kapalı</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${b > 0 ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}
    >
      {b > 0 ? 'Borçlu' : 'Alacaklı'} {formatMoneyShort(Math.abs(b))}
    </span>
  );
}

/** Ad baş harfli yuvarlak rozet (rengi tipe göre). */
export function Avatar({
  customer,
  size = 'md',
}: {
  customer: Pick<Customer, 'name' | 'kind'>;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        'flex shrink-0 items-center justify-center rounded-full font-extrabold text-white',
        size === 'lg' ? 'size-16 text-xl sm:size-20 sm:text-2xl' : 'size-11 text-sm',
        customer.kind === 'corporate'
          ? 'bg-gradient-to-br from-ink to-ink-muted'
          : 'bg-gradient-to-br from-brand-500 to-brand-800',
      ].join(' ')}
    >
      {initials(customer.name)}
    </span>
  );
}

const COLUMNS: { key: CustomerSortKey | null; label: string }[] = [
  { key: 'name', label: 'Müşteri' },
  { key: null, label: 'İletişim' },
  { key: null, label: 'Tip' },
  { key: null, label: 'Fiyat' },
  { key: 'balance', label: 'Hesap' },
  { key: 'lastLogin', label: 'Son Giriş' },
];

function chipsOf(
  f: CustomerFilters,
): { id: string; label: string; clear: Partial<CustomerFilters> }[] {
  const out: { id: string; label: string; clear: Partial<CustomerFilters> }[] = [];
  if (f.kind !== 'all') out.push({ id: 'kind', label: KIND_LABEL[f.kind], clear: { kind: 'all' } });
  if (f.status !== 'all')
    out.push({
      id: 'status',
      label: f.status === 'active' ? 'Girişe açık' : 'Pasif',
      clear: { status: 'all' },
    });
  if (f.balance !== 'all')
    out.push({
      id: 'balance',
      label: f.balance === 'debtor' ? 'Bize borcu var' : 'Alacağı var',
      clear: { balance: 'all' },
    });
  if (f.priceList !== 'all')
    out.push({ id: 'price', label: f.priceList, clear: { priceList: 'all' } });
  return out;
}

/**
 * Müşteriler: üç özet kutusu (müşteri, girişe açık, toplam alacağımız), arama + Süzgeçler + Dışa
 * Aktar; alt çubuktaki "+" yeni müşteri ekler. Masaüstünde sıralanabilir tablo, tablet/telefonda
 * kartlar. Bir müşteriye basınca müşteri sayfası (sekmeli ayrıntı) açılır.
 */
export function CustomersView() {
  const { customers, loading, error, sample, refresh, save } = useCustomerStore();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 64rem)');
  const [filters, setFilters] = useState<CustomerFilters>(emptyCustomerFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sort, setSort] = useState<CustomerSort>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');

  usePublishAddAction('Müşteri Ekle', () => setFormOpen(true));

  const filtered = useMemo(
    () => sortCustomers(filterCustomers(customers, filters), sort),
    [customers, filters, sort],
  );
  const size = Math.min(100, Math.max(1, Number(sizeText) || 10));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * size, current * size);
  const extra = activeCustomerFilterCount(filters);
  const chips = chipsOf(filters);
  const receivable = filtered.reduce((n, c) => n + Math.max(0, balanceOf(c)), 0);
  const open = (c: Customer) => navigate(`/uygulama/musteriler/${encodeURIComponent(c.id)}`);

  const sortBy = (key: CustomerSortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

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

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Müşteri', short: 'Müşteri', node: <CountUp value={filtered.length} /> },
          {
            label: 'Girişe Açık',
            short: 'Aktif',
            node: <CountUp value={filtered.filter((c) => c.active).length} />,
          },
          {
            label: 'Bize Borçları (alacağımız)',
            short: 'Alacak',
            node: <CountUp value={receivable} format={formatMoneyShort} />,
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
            label="Müşteri ara"
            placeholder="Ad, e-posta, telefon, kod ara…"
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
              onClick={() => setFilters((f) => ({ ...emptyCustomerFilters, query: f.query }))}
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
          <p className="text-lg font-bold">
            {customers.length === 0 ? 'Henüz müşteri yok' : 'Eşleşen müşteri yok'}
          </p>
          <p className="text-ink-muted">
            {customers.length === 0
              ? 'Alttaki + düğmesiyle ilk müşteriyi ekleyin.'
              : 'Arama ya da süzgeçleri değiştirmeyi deneyin.'}
          </p>
        </div>
      ) : (
        <>
          {wide ? (
            <div className="overflow-x-auto rounded-3xl border border-line bg-surface-raised">
              <table className="w-full min-w-[52rem] border-collapse">
                <thead className="border-b border-line bg-surface-muted/50">
                  <tr>
                    {COLUMNS.map((c) =>
                      c.key ? (
                        <SortTh
                          key={c.label}
                          label={c.label}
                          active={sort.key === c.key}
                          dir={sort.dir}
                          onSort={() => sortBy(c.key!)}
                        />
                      ) : (
                        <th
                          key={c.label}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-extrabold tracking-wider whitespace-nowrap text-ink-muted uppercase"
                        >
                          {c.label}
                        </th>
                      ),
                    )}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => open(c)}
                      className="group cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-brand-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <Avatar customer={c} />
                          <span className="min-w-0">
                            <span className="block max-w-72 truncate font-bold">{c.name}</span>
                            <span className="block text-xs text-ink-muted">
                              {c.code ? `Kod ${c.code}` : 'Kod yok'}
                              {c.active ? '' : ' · Pasif'}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="block whitespace-nowrap">{c.phone}</span>
                        <span className="block max-w-56 truncate text-ink-muted">{c.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold">
                          {c.kind === 'corporate' ? (
                            <Building2 className="size-3.5" aria-hidden="true" />
                          ) : (
                            <User className="size-3.5" aria-hidden="true" />
                          )}
                          {KIND_LABEL[c.kind]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-ink">
                          {c.priceList}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <BalanceChip customer={c} />
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-muted">
                        {c.lastLogin ? formatDateTime(c.lastLogin) : '—'}
                      </td>
                      <td className="pr-3">
                        <ChevronRight
                          className="size-5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul aria-label="Müşteriler" className="flex flex-col gap-2.5">
              {shown.map((c, i) => (
                <li
                  key={c.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-rise-in"
                >
                  <button
                    type="button"
                    onClick={() => open(c)}
                    aria-label={`${c.name} müşterisini aç`}
                    className="flex w-full items-center gap-3 rounded-3xl border border-line bg-surface-raised p-3.5 text-left transition-colors active:border-brand-500"
                  >
                    <Avatar customer={c} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-extrabold">{c.name}</span>
                        <BalanceChip customer={c} />
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                        <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                        {c.phone}
                      </span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{c.email}</span>
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
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
            noun="müşteri"
          />
        </>
      )}

      {filterOpen ? (
        <CustomerFilterSheet
          rows={customers}
          value={filters}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
      {exportOpen ? (
        <CustomerExportSheet
          rows={customers}
          listed={filtered}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
      {formOpen ? (
        <CustomerFormSheet
          customer={null}
          onSave={async (draft) => {
            const saved = await save(draft);
            setFormOpen(false);
            open(saved);
          }}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </div>
  );
}
