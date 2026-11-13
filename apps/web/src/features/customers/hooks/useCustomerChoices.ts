import { useCallback } from 'react';
import type { CommerceChoices } from '@gt/shared';
import { useManagedData } from '../../../lib/useManagedData';
import { useCustomerService } from '../services/customer.service';

/** Müşteri alanları mevcut API sözleşmesindeki adları saklar. */
export function useCustomerChoices() {
  const service = useCustomerService();
  const load = useCallback(() => service.choices(), [service]);
  const state = useManagedData<CommerceChoices | null>(load, null);
  return {
    priceLists: state.data?.priceLists.map((item) => item.name) ?? [],
    customerTypes: state.data?.customerTypes.map((item) => item.name) ?? [],
    payments: state.data?.payments.map((item) => item.name) ?? [],
    error: state.error,
  };
}
