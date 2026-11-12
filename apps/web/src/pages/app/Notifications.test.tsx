import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatStamp, isPast, localStamp, quickSlots } from '../../features/notifications/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/bildirimler/mobil');
  await screen.findByRole('group', { name: 'Durum süzgeci' });
  return user;
}
const dock = () => screen.getByRole('navigation', { name: 'Ana gezinme' });

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Mobil Bildirimler', () => {
  it('akış günlere ayrılır; süzgeç ve arama çalışır; kart açılınca eylemler çıkar', async () => {
    const user = await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const filters = screen.getByRole('group', { name: 'Durum süzgeci' });
    expect(within(filters).getByRole('button', { name: /Planlanan/ })).toHaveTextContent('2');
    await user.click(within(filters).getByRole('button', { name: /Planlanan/ }));
    const card = await screen.findByRole('button', { name: /Yılsonu kampanyası başladı, Planlandı/ });
    await user.click(card);
    expect(screen.getByRole('button', { name: 'Tekrar kullan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planı iptal et' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Planı iptal et' }));
    await waitFor(() => expect(within(filters).getByRole('button', { name: /Planlanan/ })).toHaveTextContent('1'));
    await user.click(within(filters).getByRole('button', { name: /Otomatik/ }));
    await user.type(screen.getByRole('searchbox', { name: 'Bildirim ara' }), 'teslim');
    await waitFor(() => expect(screen.queryByText(/iptal edilmiştir/)).not.toBeInTheDocument());
  });

  it('bildirim yazılır: önizleme canlı değişir, hemen gönderilir ve listenin başına gelir', async () => {
    const user = await open();
    await user.click(within(dock()).getByRole('button', { name: 'Bildirim Yaz' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bildirim Yaz' });
    await user.type(within(dialog).getByLabelText('Başlık'), 'Hafta sonu fırsatı');
    await user.type(within(dialog).getByLabelText('Metin (isteğe bağlı)'), 'Tüm ürünlerde indirim var.');
    const preview = within(dialog).getByRole('figure', { name: 'Bildirim önizlemesi' });
    expect(within(preview).getByText('Hafta sonu fırsatı')).toBeInTheDocument();
    expect(within(preview).getByText(/Tüm müşteriler/)).toBeInTheDocument();
    expect(within(preview).getByText(/1 dakika içinde/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Gönder' }));
    expect(await screen.findByRole('button', { name: /Hafta sonu fırsatı, Gönderildi/ })).toBeInTheDocument();
  });

  it('planlama: hazır zaman seçilince düğme Planla olur ve bildirim Planlandı görünür; başlıksız gönderilmez', async () => {
    const user = await open();
    await user.click(within(dock()).getByRole('button', { name: 'Bildirim Yaz' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bildirim Yaz' });
    await user.click(within(dialog).getByRole('button', { name: 'Gönder' }));
    expect(within(dialog).getByRole('button', { name: /Başlık gerekli/ })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Başlık'), 'Yarın duyuru');
    await user.click(within(dialog).getByRole('radio', { name: 'Yarın 09:00' }));
    await user.click(within(dialog).getByRole('button', { name: 'Planla' }));
    expect(await screen.findByRole('button', { name: /Yarın duyuru, Planlandı/ })).toBeInTheDocument();
  });

  it('yardımcılar: zaman biçimleri ve hazır zamanlar', () => {
    const now = new Date(2026, 10, 12, 10, 30);
    expect(localStamp(now)).toBe('2026-11-12T10:30');
    expect(formatStamp('2026-06-16T12:19')).toEqual({ date: '16.06.2026', time: '12:19' });
    expect(isPast('2026-11-12T10:00', now)).toBe(true);
    const slots = quickSlots(now);
    expect(slots.map((s) => s.label)).toEqual(['Bugün 18:00', 'Yarın 09:00', 'Cumartesi 10:00']);
    expect(slots[2]!.at).toBe('2026-11-14T10:00');
    expect(quickSlots(new Date(2026, 10, 12, 18, 0)).map((s) => s.label)).not.toContain('Bugün 18:00');
  });
});
