/** Müşteri listesi ve detay sekmeleri için sunucu tipleri (frontend sözleşmesi). */

export type CustomerKind = 'real' | 'corporate';

export interface CustomerDraft {
  code: string;
  name: string;
  kind: CustomerKind;
  taxId: string;
  phone: string;
  email: string;
  priceList: string;
  customerType: string;
  payments: string[];
  cardDeal: string;
}

export interface CustomerRecord extends CustomerDraft {
  id: number;
  active: boolean;
  userCount: number;
  lastLogin: Date | null;
  debt: number;
  credit: number;
}

export interface CustomerUserRecord {
  id: number;
  name: string;
  email: string;
  active: boolean;
  lastLogin: Date | null;
}

export interface AddressRecord {
  id: number;
  title: string;
  address: string;
  isDefault: boolean;
}

export interface AddressDraft {
  title: string;
  address: string;
  isDefault: boolean;
}

export interface LedgerRecord {
  id: number;
  date: Date;
  ref: string;
  debt: number;
  credit: number;
}

export interface CustomerOrderRecord {
  id: number;
  no: string;
  date: Date;
  total: number;
  paid: boolean;
  status: string;
}

export interface CustomerReturnRecord {
  id: number;
  orderNo: string;
  kind: string;
  items: number;
  date: Date;
  status: string;
}

export interface CustomerDetailRecord {
  users: CustomerUserRecord[];
  addresses: AddressRecord[];
  ledger: LedgerRecord[];
  orders: CustomerOrderRecord[];
  returns: CustomerReturnRecord[];
}
