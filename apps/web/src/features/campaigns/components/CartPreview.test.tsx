import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CampaignCartQuote } from '@gt/shared';
import { productItemSeeds } from '../../../mocks/product.mock';
import { CartPreview } from './CartPreview';

const services = vi.hoisted(() => ({ quote: vi.fn(), list: vi.fn() }));
vi.mock('../services/campaign.service', () => ({
  useCampaignService: () => ({ quote: services.quote }),
}));
vi.mock('../../products/services/product.service', () => ({
  useProductService: () => ({ list: services.list }),
}));
const result: CampaignCartQuote = {
  currency: 'TRY',
  subtotal: '96.00',
  discount: '9.60',
  shippingFee: '0.00',
  shippingDiscount: '0.00',
  total: '86.40',
  cartRuleId: 'general:1',
  shippingRuleId: null,
  items: [],
};

async function open() {
  services.list.mockResolvedValue([
    { ...productItemSeeds[0]!, id: '1', name: 'Kalem', salesOpen: true, variantCount: 0 },
  ]);
  const user = userEvent.setup();
  render(<CartPreview choices={{ customerTypes: [], priceLists: [{ id: '6', name: 'FİYAT' }] }} />);
  await user.click(screen.getByRole('button', { name: 'Ürün Ekle' }));
  const dialog = await screen.findByRole('dialog', { name: 'Ürün Seç' });
  await user.click(within(dialog).getByRole('button', { name: /Kalem/ }));
  return user;
}

describe('Kayıtlı kurallarla sepet denemesi', () => {
  it('fiyat göndermeden sunucudan hesaplatır ve sonucu gösterir', async () => {
    services.quote.mockResolvedValue(result);
    const user = await open();
    await user.clear(screen.getByLabelText('Kalem miktarı'));
    await user.type(screen.getByLabelText('Kalem miktarı'), '2');
    await user.click(screen.getByRole('button', { name: 'Sepeti Hesapla' }));
    expect(await screen.findByText(/86,40/)).toBeInTheDocument();
    expect(services.quote).toHaveBeenLastCalledWith({
      priceListId: '6',
      customerTypeId: null,
      shippingFee: 0,
      items: [{ productId: '1', quantity: 2 }],
    });
    await user.clear(screen.getByLabelText('Kalem miktarı'));
    expect(screen.queryByText('Ödenecek toplam')).not.toBeInTheDocument();
  });

  it('miktar değiştikten sonra eski isteğin yanıtını güncel sonuç gibi göstermez', async () => {
    let finish!: (value: CampaignCartQuote) => void;
    services.quote.mockImplementationOnce(
      () =>
        new Promise<CampaignCartQuote>((resolve) => {
          finish = resolve;
        }),
    );
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Sepeti Hesapla' }));
    await user.clear(screen.getByLabelText('Kalem miktarı'));
    await user.type(screen.getByLabelText('Kalem miktarı'), '3');
    await act(async () => finish(result));
    expect(screen.queryByText('Ödenecek toplam')).not.toBeInTheDocument();
  });
});
