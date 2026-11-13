import { describe, expect, it, vi } from 'vitest';
import { homeService } from '../features/home/services/home.service';
import { orderService, demoOrderService } from '../features/orders/services/order.service';
import { customerService } from '../features/customers/services/customer.service';
import { campaignService } from '../features/campaigns/services/campaign.service';
import { currencyService } from '../features/currencies/services/currency.service';
import { stockDefService } from '../features/stockdefs/services/stockdef.service';
import { taxService } from '../features/taxes/services/tax.service';
import { shippingService } from '../features/shipping/services/shipping.service';
import { paymentService } from '../features/payments/services/payment.service';
import { notificationService } from '../features/notifications/services/notification.service';
import { holidayService } from '../features/holidays/services/holiday.service';
import { customerSeeds } from '../mocks/customers.mock';

describe('Gerçek oturumda API bağlantı hataları', () => {
  const loaders: [string, () => Promise<unknown>][] = [
    ['ana sayfa', () => homeService.load('month')],
    ['siparişler', () => orderService.list()],
    ['iadeler', () => orderService.listReturns()],
    ['müşteriler', () => customerService.list()],
    ['müşteri seçenekleri', () => customerService.choices()],
    ['müşteri detayı', () => customerService.detail(customerSeeds[0]!)],
    ['kampanyalar', () => campaignService.load('cart')],
    ['kampanya seçenekleri', () => campaignService.choices()],
    ['para birimleri', () => currencyService.list()],
    ['döviz kuru', () => currencyService.preview('USD', 'dovizSatis')],
    ['cari/stok tanımları', () => stockDefService.load()],
    ['vergiler', () => taxService.load()],
    ['kargo', () => shippingService.load()],
    ['ödeme şekilleri', () => paymentService.list()],
    ['bildirimler', () => notificationService.list()],
    ['tatiller', () => holidayService.load(2026)],
  ];

  it.each(loaders)('%s: 404 yanıtını örnek veriyle gizlemez', async (_name, load) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'NOT_FOUND', message: 'API bulunamadı.' },
    }), { status: 404 })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
  });

  it('gerçek boş listeyi korur; demo verisi yalnızca demo servisinden gelir', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
    expect(await orderService.list()).toEqual({ items: [], sample: false });
    expect(await demoOrderService.list()).toMatchObject({ sample: true });
    expect((await demoOrderService.list()).items.length).toBeGreaterThan(0);
  });
});
