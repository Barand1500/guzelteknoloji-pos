import {
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type ReturnKind,
  type ReturnRequest,
  type ReturnStatus,
} from './types';

export interface ReturnFilters {
  kind: ReturnKind | 'all';
  status: ReturnStatus | 'all';
  /** yyyy-mm-dd (boş = sınırsız) */
  from: string;
  to: string;
  query: string;
}

export const emptyReturnFilters: ReturnFilters = {
  kind: 'all',
  status: 'all',
  from: '',
  to: '',
  query: '',
};

const fold = (s: string) => s.toLocaleLowerCase('tr');

/** Aramanın dışında açık olan süzgeç sayısı ("Süzgeçler (2)" rozeti). */
export function activeReturnFilterCount(f: ReturnFilters): number {
  return [f.kind !== 'all', f.status !== 'all', f.from, f.to].filter(Boolean).length;
}

export function filterReturns(rows: ReturnRequest[], f: ReturnFilters): ReturnRequest[] {
  const q = fold(f.query.trim());
  return rows
    .filter((r) => {
      if (f.kind !== 'all' && r.kind !== f.kind) return false;
      if (f.status !== 'all' && r.status !== f.status) return false;
      const day = r.date.slice(0, 10);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (q && !fold(r.customer).includes(q) && !r.orderNo.includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Excel'in açabildiği CSV (noktalı virgül ayraç, BOM'lu). */
export function returnsToCsv(rows: ReturnRequest[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['Müşteri', 'Sipariş No', 'Tip', 'Ürün', 'Tarih', 'Durum', 'Neden'];
  const body = rows.map((r) =>
    [
      r.customer,
      r.orderNo,
      RETURN_KIND_LABEL[r.kind],
      r.itemCount,
      r.date.slice(0, 16).replace('T', ' '),
      RETURN_STATUS_LABEL[r.status],
      r.reason,
    ]
      .map(esc)
      .join(';'),
  );
  return '﻿' + [head.map(esc).join(';'), ...body].join('\r\n');
}
