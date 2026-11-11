import { balanceOf, KIND_LABEL, type Customer, type CustomerKind } from './types';

export interface CustomerFilters {
  kind: CustomerKind | 'all';
  /** Giriş durumu: en az bir kullanıcısı girişe açık mı. */
  status: 'all' | 'active' | 'passive';
  /** Hesap durumu: bize borçlu / alacaklı. */
  balance: 'all' | 'debtor' | 'creditor';
  priceList: string | 'all';
  query: string;
}

export const emptyCustomerFilters: CustomerFilters = {
  kind: 'all',
  status: 'all',
  balance: 'all',
  priceList: 'all',
  query: '',
};

export type CustomerSortKey = 'name' | 'balance' | 'lastLogin';
export interface CustomerSort {
  key: CustomerSortKey;
  dir: 'asc' | 'desc';
}

const fold = (s: string) => s.toLocaleLowerCase('tr');

export function activeCustomerFilterCount(f: CustomerFilters): number {
  return [f.kind !== 'all', f.status !== 'all', f.balance !== 'all', f.priceList !== 'all'].filter(
    Boolean,
  ).length;
}

export function filterCustomers(rows: Customer[], f: CustomerFilters): Customer[] {
  const q = fold(f.query.trim());
  return rows.filter((c) => {
    if (f.kind !== 'all' && c.kind !== f.kind) return false;
    if (f.status === 'active' && !c.active) return false;
    if (f.status === 'passive' && c.active) return false;
    if (f.balance === 'debtor' && balanceOf(c) <= 0) return false;
    if (f.balance === 'creditor' && balanceOf(c) >= 0) return false;
    if (f.priceList !== 'all' && c.priceList !== f.priceList) return false;
    if (q) {
      const hay = [c.name, c.code, c.email, c.phone, c.taxId].map(fold).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortCustomers(rows: Customer[], sort: CustomerSort): Customer[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.key === 'name') return a.name.localeCompare(b.name, 'tr') * dir;
    if (sort.key === 'balance') return (balanceOf(a) - balanceOf(b)) * dir;
    return (a.lastLogin ?? '').localeCompare(b.lastLogin ?? '') * dir;
  });
}

/** Excel'in açabildiği CSV (noktalı virgül ayraç, BOM'lu). */
export function customersToCsv(rows: Customer[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = [
    'Müşteri Kodu',
    'Ad Soyad / Ünvan',
    'Tip',
    'Telefon',
    'E-posta',
    'Fiyat Listesi',
    'Bakiye',
    'Giriş',
  ];
  const body = rows.map((c) =>
    [
      c.code,
      c.name,
      KIND_LABEL[c.kind],
      c.phone,
      c.email,
      c.priceList,
      balanceOf(c).toFixed(2).replace('.', ','),
      c.active ? 'Aktif' : 'Pasif',
    ]
      .map(esc)
      .join(';'),
  );
  return '﻿' + [head.map(esc).join(';'), ...body].join('\r\n');
}

/** Ad baş harfleri (rozet için). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toLocaleUpperCase('tr');
}
