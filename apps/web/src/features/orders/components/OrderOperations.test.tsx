import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderOperations } from './OrderOperations';
import { orderLifecycleService } from '../services/order.service';
import type { Order } from '../types';
import { NetworkError } from '../../../lib/http';

const order: Order = {
  id: '10',
  no: 'S1',
  date: '2026-11-13',
  source: 'manual',
  customer: 'Ali',
  total: 100,
  totalWithVat: 120,
  paid: false,
  paymentMethod: 'Havale',
  status: 'pending',
  address: 'Adres',
  lines: [],
  managed: true,
};
describe('Sipariş finansal işlem teyidi', () => {
  it('tahsilatı açık teyit ve referans olmadan göndermez; gerçek tutarı gösterir', async () => {
    vi.spyOn(orderLifecycleService, 'detail').mockResolvedValue({
      managed: true,
      paymentKind: 'bank_transfer',
      payments: [],
      returns: [],
    });
    const save = vi.spyOn(orderLifecycleService, 'collect').mockResolvedValue();
    render(<OrderOperations order={order} onRefresh={vi.fn()} />);
    const button = await screen.findByRole('button', { name: 'Tahsilatı Kaydet' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Dekont / işlem referansı'), 'Dekont 123');
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Tahsilatı gerçekte aldım/));
    await userEvent.click(button);
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        '10',
        expect.objectContaining({ confirmed: true, reference: 'Dekont 123' }),
      ),
    );
    vi.restoreAllMocks();
  });
  it('eski sipariş için finansal işlem düğmesi göstermez', async () => {
    vi.spyOn(orderLifecycleService, 'detail').mockResolvedValue({
      managed: false,
      paymentKind: null,
      payments: [],
      returns: [],
    });
    render(<OrderOperations order={{ ...order, managed: false }} onRefresh={vi.fn()} />);
    expect(await screen.findByText(/Eski siparişin ödeme ve stok geçmişi/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tahsilatı Kaydet' })).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
  it('belirsiz ağ hatasında alanları korur ve aynı tahsilat isteğini tekrar gönderir', async () => {
    vi.spyOn(orderLifecycleService, 'detail').mockResolvedValue({
      managed: true,
      paymentKind: 'bank_transfer',
      payments: [],
      returns: [],
    });
    const save = vi
      .spyOn(orderLifecycleService, 'collect')
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue();
    render(<OrderOperations order={order} onRefresh={vi.fn()} />);
    await screen.findByRole('button', { name: 'Tahsilatı Kaydet' });
    await userEvent.type(screen.getByLabelText('Dekont / işlem referansı'), 'Dekont 123');
    await userEvent.click(screen.getByLabelText(/Tahsilatı gerçekte aldım/));
    await userEvent.click(screen.getByRole('button', { name: 'Tahsilatı Kaydet' }));
    await screen.findByText(/Sonuç alınamadı/);
    expect(screen.getByLabelText('Dekont / işlem referansı')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Tahsilatı Kaydet' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1]).toEqual(save.mock.calls[0]);
    expect(save.mock.calls[0]![1].expectedAmount).toBe('120.00');
    vi.restoreAllMocks();
  });
});
