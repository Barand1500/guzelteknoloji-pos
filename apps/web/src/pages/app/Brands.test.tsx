import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brandService } from '../../features/brands/services/brand.service';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const names = () =>
  within(screen.getByRole('list', { name: 'Markalar' }))
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-sortable-id'));

async function openBrands() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/markalar');
  await screen.findByRole('list', { name: 'Markalar' });
  return user;
}

beforeEach(() => brandService.reset());
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Markalar ekranı (masaüstü)', () => {
  it('markaları sırayla ve ürün sayılarıyla listeler', async () => {
    await openBrands();
    expect(names().slice(0, 3)).toEqual(['alatel', 'anypay', 'asys']);
    const row = screen.getByRole('switch', { name: 'ASYS aktif' }).closest('li')!;
    expect(within(row).getByText('2 ürün')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'BMX aktif' })).not.toBeChecked();
  });

  it('arama listeyi süzer ve sıralamayı kapatır', async () => {
    const user = await openBrands();
    await user.type(screen.getByRole('searchbox', { name: 'Marka ara' }), 'asy');
    expect(names()).toEqual(['asys']);
    expect(screen.getByText('Arama sırasında sıralama kapalıdır.')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Marka ara' }));
    await user.type(screen.getByRole('searchbox', { name: 'Marka ara' }), 'yokboyle');
    expect(screen.getByText('Eşleşen marka yok')).toBeInTheDocument();
  });

  it('anahtar markayı aktif/pasif yapar', async () => {
    const user = await openBrands();
    const sw = screen.getByRole('switch', { name: 'ALATEL aktif' });
    expect(sw).toBeChecked();
    await user.click(sw);
    expect(screen.getByRole('switch', { name: 'ALATEL aktif' })).not.toBeChecked();
  });

  it('klavyeyle (tutamak + ok tuşları) sıra değişir ve duyurulur', async () => {
    const user = await openBrands();
    const handle = screen.getByRole('button', { name: /^ALATEL sırasını değiştir/ });
    handle.focus();
    await user.keyboard('{ArrowDown}');
    expect(names().slice(0, 3)).toEqual(['anypay', 'alatel', 'asys']);
    expect(screen.getByText('ALATEL, 2. sıraya taşındı')).toBeInTheDocument();
    // Odak aynı tutamakta kalır; tekrar basınca devam eder.
    await user.keyboard('{ArrowDown}');
    expect(names().slice(0, 3)).toEqual(['anypay', 'asys', 'alatel']);
  });

  it('yeni marka eklenir: ad gerekli, kaydedince listenin sonunda görünür', async () => {
    const user = await openBrands();
    await user.click(screen.getAllByRole('button', { name: 'Marka Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Marka Ekle' });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByRole('button', { name: 'Marka adı gerekli.' })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Marka Adı'), 'Yeni Marka');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Yeni Marka eklendi.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Yeni Marka aktif' })).toBeInTheDocument();
    expect(names().at(-1)).toMatch(/^yeni-/);
  });

  it('marka düzenlenir', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('button', { name: 'ANYPAY markasını düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Markayı Düzenle' });
    const input = within(dialog).getByLabelText('Marka Adı');
    expect(input).toHaveValue('ANYPAY');
    await user.clear(input);
    await user.type(input, 'ANYPAY TR');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('ANYPAY TR güncellendi.')).toBeInTheDocument();
  });

  it('ürünü olan marka silinirken kaç üründe kullanıldığı söylenir ve onay istenir', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('button', { name: 'FLEXYPOS markasını sil' }));
    const dialog = await screen.findByRole('dialog', { name: 'FLEXYPOS Silinsin Mi?' });
    expect(within(dialog).getByText(/6 üründe kullanılıyor/)).toBeInTheDocument();
    // Vazgeç silmez
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    expect(screen.getByRole('switch', { name: 'FLEXYPOS aktif' })).toBeInTheDocument();
    // Onaylayınca silinir
    await user.click(screen.getByRole('button', { name: 'FLEXYPOS markasını sil' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sil' }),
    );
    expect(await screen.findByText('FLEXYPOS silindi.')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'FLEXYPOS aktif' })).not.toBeInTheDocument();
  });

  it('Ürünlere Tanımla: ara, seç, ata; marka ürün sayısı güncellenir', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('button', { name: 'ANYPAY markasını ürünlere tanımla' }));
    const dialog = await screen.findByRole('dialog', { name: 'ANYPAY · Ürünlere Tanımla' });
    await within(dialog).findByRole('list', { name: 'Ürünler' });
    await user.type(within(dialog).getByRole('searchbox', { name: 'Ürün ara' }), 'standart');
    const items = within(dialog).getAllByRole('checkbox');
    expect(items).toHaveLength(1);
    expect(within(dialog).getByRole('button', { name: 'Ata' })).toBeDisabled();
    await user.click(items[0]!);
    expect(within(dialog).getByText('1 ürün seçili')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ata' }));
    expect(await screen.findByText('1 ürün ANYPAY markasına atandı.')).toBeInTheDocument();
    const row = screen.getByRole('switch', { name: 'ANYPAY aktif' }).closest('li')!;
    expect(within(row).getByText('1 ürün')).toBeInTheDocument();
  });

  it('pasif yapılan marka stok kartındaki marka listesinde görünmez', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('switch', { name: 'ALATEL aktif' }));
    await user.click(screen.getByRole('link', { name: 'Yeni Stok Kartı' }));
    await user.click(await screen.findByRole('combobox', { name: 'Marka' }));
    expect(screen.getByRole('option', { name: 'ANYPAY' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'ALATEL' })).not.toBeInTheDocument();
  });
});

describe('Markalar ekranı (telefon)', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));
  });

  it('satırlar kaydırma işlemleriyle gelir; satıra dokununca düzenleme paneli açılır', async () => {
    const user = await openBrands();
    // Telefonda tutamak yoktur; işlemler satırın arkasındadır.
    expect(screen.queryByRole('button', { name: /sırasını değiştir/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Tanımla').length).toBeGreaterThan(0);
    expect(screen.getByText(/Basılı tutup sürükleyerek sırala/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ALATEL markasını düzenle' }));
    expect(await screen.findByRole('dialog', { name: 'Markayı Düzenle' })).toBeInTheDocument();
  });

  it('yüzen + düğmesi marka ekleme panelini açar ve Esc ile kapanır', async () => {
    const user = await openBrands();
    await user.click(screen.getAllByRole('button', { name: 'Marka Ekle' })[0]!);
    expect(await screen.findByRole('dialog', { name: 'Marka Ekle' })).toBeInTheDocument();
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
