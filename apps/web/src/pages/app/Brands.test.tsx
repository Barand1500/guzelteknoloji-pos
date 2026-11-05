import { act, screen, waitFor, within } from '@testing-library/react';
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
    // 11. marka olduğu için 2. sayfadadır.
    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(screen.getByRole('switch', { name: 'Yeni Marka aktif' })).toBeInTheDocument();
    expect(names().at(-1)).toMatch(/^yeni-/);
  });

  it('marka düzenlenir', async () => {
    const user = await openBrands();
    await user.dblClick(screen.getByRole('button', { name: 'ANYPAY markasını düzenle' }));
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

  it('düzenleme masaüstünde çift tıklamayla açılır (kalem düğmesi yok); klavyeyle Enter', async () => {
    const user = await openBrands();
    const target = screen.getByRole('button', { name: 'ALATEL markasını düzenle' });
    // Tek tıklama açmaz
    await user.click(target);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Satırda ayrı bir kalem/Düzenle düğmesi yoktur
    expect(screen.getAllByRole('button', { name: 'ALATEL markasını düzenle' })).toHaveLength(1);
    await user.dblClick(target);
    expect(await screen.findByRole('dialog', { name: 'Markayı Düzenle' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Klavye
    screen.getByRole('button', { name: 'ANYPAY markasını düzenle' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Markayı Düzenle' })).toBeInTheDocument();
  });

  it('marka penceresinin yanında Ürünler paneli açılıp kapanır; ürün ekleme ve çıkarma anında olur', async () => {
    const user = await openBrands();
    await user.dblClick(screen.getByRole('button', { name: 'ANYPAY markasını düzenle' }));
    const main = await screen.findByRole('dialog', { name: 'Markayı Düzenle' });
    // Yan panel başta kapalı; düğmede ürün sayısı görünür
    expect(screen.queryByRole('dialog', { name: 'ANYPAY · Ürünler' })).not.toBeInTheDocument();
    const toggle = within(main).getByRole('button', { name: /Ürünler/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('0');

    await user.click(toggle);
    const side = await screen.findByRole('dialog', { name: 'ANYPAY · Ürünler' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await within(side).findByText('Bu markada henüz ürün yok.')).toBeInTheDocument();

    // Ürün ekle
    await user.click(within(side).getByRole('tab', { name: 'Ürün Ekle' }));
    await user.type(
      within(side).getByRole('searchbox', { name: 'Eklenecek ürünü ara' }),
      'standart',
    );
    await user.click(
      within(side).getByRole('button', {
        name: 'USB Barkod Okuyucu Standart ürününü markaya ekle',
      }),
    );
    expect(within(side).getByRole('tab', { name: 'Bu Markada (1)' })).toBeInTheDocument();
    // Marka formundaki sayı, liste yenilenince canlı güncellenir.
    await waitFor(() =>
      expect(within(main).getByRole('button', { name: /Ürünler/ })).toHaveTextContent('1'),
    );

    // Ürünü çıkar
    await user.click(within(side).getByRole('tab', { name: 'Bu Markada (1)' }));
    await user.click(
      within(side).getByRole('button', {
        name: 'USB Barkod Okuyucu Standart ürününü markadan çıkar',
      }),
    );
    expect(within(side).getByText('Bu markada henüz ürün yok.')).toBeInTheDocument();

    // Esc önce yan paneli kapatır, sonra pencereyi
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'ANYPAY · Ürünler' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Markayı Düzenle' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('satırdaki Ürünler düğmesi pencereyi yan paneli açık getirir; eklenen ürün listedeki sayıyı günceller', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('button', { name: 'ANYPAY markasının ürünlerini yönet' }));
    const side = await screen.findByRole('dialog', { name: 'ANYPAY · Ürünler' });
    await user.click(within(side).getByRole('tab', { name: 'Ürün Ekle' }));
    await user.click(await within(side).findByRole('radio', { name: 'Markasız Ürünler' }));
    // Markasız: p6, p7, p15, p16 → hepsini ekle
    await user.click(within(side).getByRole('button', { name: /Görünenlerin Hepsini Ekle \(4\)/ }));
    expect(within(side).getByRole('tab', { name: 'Bu Markada (4)' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    const row = screen.getByRole('switch', { name: 'ANYPAY aktif' }).closest('li')!;
    expect(await within(row).findByText('4 ürün')).toBeInTheDocument();
  });

  it('sayfalama: varsayılan 10, kullanıcı adedi yazar; sayfalar arası geçilir', async () => {
    const user = await openBrands();
    // Varsayılan 10 → 10 marka tek sayfada, sayfa düğmeleri yok
    expect(screen.getByLabelText('Sayfada Kaç Marka')).toHaveValue('10');
    expect(names()).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Sonraki sayfa' })).not.toBeInTheDocument();

    const size = screen.getByLabelText('Sayfada Kaç Marka');
    await user.clear(size);
    await user.type(size, '4');
    expect(names()).toEqual(['alatel', 'anypay', 'asys', 'banknotemaster']);
    expect(screen.getByText('1–4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Önceki sayfa' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(names()).toEqual(['bmt', 'bmx', 'bng-plus', 'cas']);
    expect(screen.getByRole('button', { name: 'Sayfa 2' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
    expect(names()).toEqual(['flexypos', 'idata']);
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeDisabled();

    // Rakam dışı karakter yazılamaz
    await user.clear(size);
    await user.type(size, 'a2b');
    expect(size).toHaveValue('2');
  });

  it('sayfalarda sürükleme (klavye) tüm listedeki sıraya doğru yansır', async () => {
    const user = await openBrands();
    const size = screen.getByLabelText('Sayfada Kaç Marka');
    await user.clear(size);
    await user.type(size, '3');
    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(names()).toEqual(['banknotemaster', 'bmt', 'bmx']);
    screen.getByRole('button', { name: /^BMT sırasını değiştir/ }).focus();
    await user.keyboard('{ArrowUp}');
    expect(names()).toEqual(['bmt', 'banknotemaster', 'bmx']);
    // Adedi artırınca tüm sıra görünür: 1. sayfa bozulmamış, 2. sayfadaki değişiklik kalıcı
    await user.clear(size);
    await user.type(size, '10');
    expect(names()).toEqual([
      'alatel',
      'anypay',
      'asys',
      'bmt',
      'banknotemaster',
      'bmx',
      'bng-plus',
      'cas',
      'flexypos',
      'idata',
    ]);
  });

  it('arama sonuçları da sayfalanır ve aramada ilk sayfaya dönülür', async () => {
    const user = await openBrands();
    const size = screen.getByLabelText('Sayfada Kaç Marka');
    await user.clear(size);
    await user.type(size, '1');
    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    await user.type(screen.getByRole('searchbox', { name: 'Marka ara' }), 'as');
    // as → ASYS, BANKNOTEMASTER, CAS (3 sonuç, sayfada 1): ilk sayfa
    expect(names()).toEqual(['asys']);
    expect(screen.getByText('1–1')).toBeInTheDocument();
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
    expect(screen.getAllByText('Ürünler').length).toBeGreaterThan(0);
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
