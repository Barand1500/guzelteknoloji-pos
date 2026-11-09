import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProductService as productService } from '../../features/products/services/product.demo';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const NAME_2 = 'FLEXYPOS FP-505 İ5-15.6" Dokunmatik POS';

async function openEdit(id: string) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(`/uygulama/stok-karti/${id}`);
  await screen.findByLabelText('Ürün Kodu');
  return user;
}

beforeEach(() => productService.reset());
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Düzenlemede sıradaki ürüne geçiş', () => {
  it('altı çizgili kutu sıradaki ürünün adını gösterir; göz simgesi önizleme verir; ok oraya geçirir', async () => {
    const user = await openEdit('p1');
    const box = await screen.findByRole('combobox', { name: 'Gidilecek ürün' });
    expect(box).toHaveValue(NAME_2);

    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent(NAME_2);
    expect(tip).toHaveTextContent('354,00 $'); // Fiyat 1, KDV dahil
    expect(screen.getByRole('button', { name: 'Ürün önizlemesi' })).toHaveAttribute(
      'aria-describedby',
      tip.id,
    );

    await user.click(screen.getByRole('button', { name: 'Sonraki ürüne geç' }));
    expect(await screen.findByLabelText('Ürün Adı')).toHaveValue(NAME_2);
    expect(screen.getByLabelText('Ürün Kodu')).toHaveValue('2');
  });

  it('kutuya yazınca altında liste açılır; istenen ürün seçilip ok ile gidilir', async () => {
    const user = await openEdit('p1');
    const box = await screen.findByRole('combobox', { name: 'Gidilecek ürün' });
    await user.click(box);
    await user.type(box, 'CAS PD');
    const list = await screen.findByRole('listbox', { name: 'Ürünler' });
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(1);
    await user.click(options[0]!);
    expect(box).toHaveValue('CAS PD-II Market Terazisi 30kg');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sonraki ürüne geç' }));
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('CAS-PD-3');
  });

  it('klavyeyle de seçilir: yaz, Enter ile seç, Enter ile git', async () => {
    const user = await openEdit('p1');
    const box = await screen.findByRole('combobox', { name: 'Gidilecek ürün' });
    await user.click(box);
    await user.type(box, 'gen-usb'); // kod ile arama
    await user.keyboard('{Enter}');
    expect(box).toHaveValue('USB Barkod Okuyucu Standart');
    await user.keyboard('{Enter}');
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('GEN-USB-5');
  });

  it('kaydedilmemiş değişiklik varsa geçmeden önce sorar; vazgeçilirse yerinde kalır', async () => {
    const user = await openEdit('p1');
    await user.type(await screen.findByLabelText('Ürün Adı'), ' X');
    await user.click(await screen.findByRole('button', { name: 'Sonraki ürüne geç' }));
    const dialog = await screen.findByRole('dialog', { name: 'Kaydedilmemiş değişiklikler var' });
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Ürün Kodu')).toHaveValue('FLEXYPOS.FP-503');

    await user.click(await screen.findByRole('button', { name: 'Sonraki ürüne geç' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yine de Geç' }),
    );
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('2');
  });

  it('değişiklik yoksa sormadan geçer', async () => {
    const user = await openEdit('p1');
    await user.click(await screen.findByRole('button', { name: 'Sonraki ürüne geç' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('2');
  });

  it('son üründe ok kapalıdır', async () => {
    await openEdit('p16');
    expect(await screen.findByRole('button', { name: 'Sonraki ürüne geç' })).toBeDisabled();
  });

  it('kopya ve yeni kartta çubuk görünmez', async () => {
    await openEdit('p1');
    await screen.findByRole('combobox', { name: 'Gidilecek ürün' });
    cleanup();
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/stok-karti/yeni?kopya=p1');
    await screen.findByLabelText('Ürün Kodu');
    expect(screen.queryByRole('combobox', { name: 'Gidilecek ürün' })).not.toBeInTheDocument();
  });
});

describe('Stok miktarı', () => {
  it('Normal takipte dolu gelir, değiştirilip kaydedilince ürünün adedi güncellenir', async () => {
    const user = await openEdit('p1');
    const qty = await screen.findByLabelText('Stok Miktarı');
    expect(qty).toHaveValue('5');
    await user.clear(qty);
    await user.type(qty, '9');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');
    const saved = (await productService.list()).find((p) => p.id === 'p1');
    expect(saved?.stock).toBe(9);
    expect(saved?.stockTracking).toBe(true);
  });

  it('takip kapalıysa (Sınırsız) alan yoktur; Normal seçilince çıkar', async () => {
    const user = await openEdit('p3');
    await screen.findByLabelText('Ürün Adı');
    expect(screen.queryByLabelText('Stok Miktarı')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Envanter Takibi' }));
    await user.click(screen.getByRole('option', { name: 'Evet' }));
    expect(await screen.findByLabelText('Stok Miktarı')).toHaveValue('');
  });

  it('yeni kartta Stok Miktarı boş başlar ve yalnızca sayı kabul eder', async () => {
    sessionStorage.setItem('gt-dev-access', '1');
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp('/uygulama/stok-karti/yeni');
    const qty = await screen.findByLabelText('Stok Miktarı');
    expect(qty).toHaveValue('');
    await user.type(qty, '1a2,5');
    expect(qty).toHaveValue('12,5');
  });
});
