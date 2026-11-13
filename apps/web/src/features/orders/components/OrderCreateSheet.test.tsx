import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderCreateSheet } from './OrderCreateSheet';
import { orderLifecycleService } from '../services/order.service';

describe('Sipariş ağ hatasından kurtarma', () => {
  it('pencere yeniden açıldığında önce eski isteği kontrol eder; oluşan siparişi yeniden oluşturmaz', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    sessionStorage.setItem('gt-order-pending:9', requestId);
    const lookup = vi
      .spyOn(orderLifecycleService, 'lookup')
      .mockResolvedValue({ id: '10', no: 'S1' });
    const create = vi.spyOn(orderLifecycleService, 'create');
    vi.spyOn(orderLifecycleService, 'choices').mockResolvedValue({
      priceLists: [],
      payments: [],
      products: [],
      customers: [],
    });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<OrderCreateSheet scope="9" onSaved={onSaved} onClose={onClose} />);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(lookup).toHaveBeenCalledWith(requestId);
    expect(create).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(sessionStorage.getItem('gt-order-pending:9')).toBeNull();
    vi.restoreAllMocks();
  });
});
