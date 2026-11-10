import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoBrandService as brandService } from '../../features/brands/services/brand.demo';
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
  it('markaları sırayla listeler; satırda "N ürün" yazısı yoktur', async () => {
    await openBrands();
    expect(names().slice(0, 3)).toEqual(['alatel', 'anypay', 'asys']);
    const row = screen.getByRole('switch', { name: 'ASYS aktif' }).closest('li')!;
    expect(within(row).queryByText(/\d+ ürün/)).not.toBeInTheDocument();
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

  it('marka formunda Aktif anahtarı ve Ürünler düğmesi yoktur; açıklama adın altındadır, SEO katlıdır', async () => {
    const user = await openBrands();
    await user.dblClick(screen.getByRole('button', { name: 'ANYPAY markasını düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Markayı Düzenle' });
    expect(within(dialog).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Ürünler/ })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Açıklama')).toBeInTheDocument();
    // SEO alanları "Gelişmiş: SEO" altında katlıdır.
    expect(within(dialog).queryByLabelText('SEO Başlığı')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Gelişmiş: SEO/ }));
    expect(within(dialog).getByLabelText('SEO Başlığı')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('SEO Açıklaması')).toBeInTheDocument();
    // Marka Ekle penceresi de aynı düzendedir.
    await user.keyboard('{Escape}');
    await user.click(screen.getAllByRole('button', { name: 'Marka Ekle' })[0]!);
    const add = await screen.findByRole('dialog', { name: 'Marka Ekle' });
    expect(within(add).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(add).getByLabelText('Açıklama')).toBeInTheDocument();
  });

  it('logoya çift tıklayınca pencere açılmadan doğrudan logo seçici çalışır; satıra çift tıklama düzenlemeyi açar', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    const user = await openBrands();
    const row = screen.getByRole('button', { name: 'ANYPAY markasını düzenle' });
    // Satıra (ada) çift tıklama: logo seçici açılmaz.
    await user.dblClick(within(row).getByText('ANYPAY'));
    await screen.findByRole('dialog', { name: 'Markayı Düzenle' });
    expect(click).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    // Logoya çift tıklama: dosya seçici açılır.
    await user.dblClick(within(row).getByTitle('Logoyu değiştirmek için çift tıklayın'));
    expect(click).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Markayı Düzenle' })).not.toBeInTheDocument();
    click.mockRestore();
  });

  it('satırdaki Ürünler düğmesi yalnızca ürünler penceresini açar (düzenleme formu gelmez); toplu ekleme sayıyı günceller', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('button', { name: 'ANYPAY markasının ürünlerini yönet' }));
    const side = await screen.findByRole('dialog', { name: 'ANYPAY · Ürünler' });
    // Düzenleme formu açılmaz
    expect(screen.queryByRole('dialog', { name: 'Markayı Düzenle' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Marka Adı')).not.toBeInTheDocument();
    // Doğrudan "Ürün Ekle" sekmesinde açılır.
    expect(within(side).getByRole('tab', { name: 'Ürün Ekle' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await within(side).findByRole('radio', { name: 'Markasız (4)' });
    // Başka markadaki ürünler "taşınır" notuyla görünür
    await user.click(within(side).getByRole('radio', { name: 'Başka Marka (12)' }));
    expect(within(side).getAllByText("FLEXYPOS'dan taşınır").length).toBeGreaterThan(0);
    await user.click(within(side).getByRole('radio', { name: 'Markasız (4)' }));
    // Tümünü seç → Ekle
    await user.click(within(side).getByRole('button', { name: 'Tümünü Seç' }));
    expect(within(side).getByText('4 ürün seçili')).toBeInTheDocument();
    await user.click(within(side).getByRole('button', { name: 'Ekle' }));
    expect(within(side).getByRole('tab', { name: 'Bu Markada (4)' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('benzer ad uyarısı: "alatel" yazınca ALATEL zaten var denir, kayıt kapanır, var olan açılır', async () => {
    const user = await openBrands();
    await user.click(screen.getAllByRole('button', { name: 'Marka Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Marka Ekle' });
    await user.type(within(dialog).getByLabelText('Marka Adı'), 'Alatel ');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('ALATEL zaten var');
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'ALATEL markasını aç' }));
    expect(await screen.findByRole('dialog', { name: 'Markayı Düzenle' })).toBeInTheDocument();
  });

  it('Birleştir: hedef seçilir, ürünler hedefe geçer, kaynak silinir', async () => {
    const user = await openBrands();
    const before = await brandService.listProducts();
    const moved = before.filter((p) => p.brandId === 'bmx').length;
    const targetBefore = before.filter((p) => p.brandId === 'bmt').length;
    await user.click(
      screen.getByRole('button', { name: 'BMX markasını başka bir markayla birleştir' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Markayı Birleştir' });
    const confirm = within(dialog).getByRole('button', { name: 'Birleştir' });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: 'BMT' }));
    await user.click(confirm);
    expect(await screen.findByText('BMX, BMT ile birleştirildi.')).toBeInTheDocument();
    expect(names()).not.toContain('bmx');
    const after = await brandService.listProducts();
    expect(after.filter((p) => p.brandId === 'bmt')).toHaveLength(targetBefore + moved);
  });

  it('Toplu logo: dosya adı marka adıyla eşleşenler yüklenir, eşleşmeyen atlanır', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('button', { name: 'Toplu logo yükle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Toplu Logo Yükle' });
    await user.upload(within(dialog).getByLabelText('Logo dosyaları seç'), [
      new File(['x'], 'alatel.png', { type: 'image/png' }),
      new File(['x'], 'Logo-CAS.png', { type: 'image/png' }),
      new File(['x'], 'bilinmeyen.png', { type: 'image/png' }),
    ]);
    const list = await within(dialog).findByRole('list', { name: 'Eşleşmeler' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText(/Eşleşen marka yok/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '2 logoyu yükle' }));
    expect(await within(dialog).findByText('2 markanın logosu güncellendi.')).toBeInTheDocument();
    const saved = await brandService.list();
    expect(saved.find((b) => b.id === 'alatel')!.logoUrl).toMatch(/^data:image\/png/);
    expect(saved.find((b) => b.id === 'cas')!.logoUrl).toMatch(/^data:image\/png/);
  });

  it('sayfalama yoktur: tüm markalar tek listede görünür', async () => {
    await openBrands();
    expect(screen.queryByLabelText('Sayfada Kaç Marka')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sonraki sayfa' })).not.toBeInTheDocument();
    expect(names().length).toBeGreaterThanOrEqual(10);
  });

  it('arama tüm listede çalışır', async () => {
    const user = await openBrands();
    await user.type(screen.getByRole('searchbox', { name: 'Marka ara' }), 'as');
    expect(names()).toEqual(['asys', 'banknotemaster', 'cas']);
  });

  it('pasif yapılan marka stok kartındaki marka listesinde görünmez', async () => {
    const user = await openBrands();
    await user.click(screen.getByRole('switch', { name: 'ALATEL aktif' }));
    // Markalar sayfasında ortadaki düğme "Marka Ekle"dir; stok kartına Ürünler üzerinden gidilir.
    expect(screen.queryByRole('link', { name: 'Yeni Stok Kartı' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ürünler' }));
    await user.click(await screen.findByRole('link', { name: 'Yeni Stok Kartı' }));
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
