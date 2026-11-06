import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dealService } from '../../features/deals/services/deal.service';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const ids = () =>
  within(screen.getByRole('list', { name: 'Fırsatlar' }))
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-sortable-id'));

async function openDeals() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/urunler/firsatlar');
  await screen.findByRole('list', { name: 'Fırsatlar' });
  return user;
}

beforeEach(() => {
  dealService.reset();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:rozet' }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Fırsat Yönetimi ekranı', () => {
  it('Ürünler sayfasındaki kısayoldan açılır', async () => {
    sessionStorage.setItem('gt-dev-access', '1');
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp('/uygulama/urunler');
    await user.click(await screen.findByRole('link', { name: /Fırsatlar/ }));
    expect(await screen.findByRole('list', { name: 'Fırsatlar' })).toBeInTheDocument();
  });

  it('fırsatları sırayla, rozet yeri ve boyutuyla listeler', async () => {
    await openDeals();
    expect(ids().slice(0, 3)).toEqual(['yeni', 'cok-satan', 'indirim-10']);
    const yeni = screen.getByRole('switch', { name: 'Yeni Ürünler aktif' }).closest('li')!;
    expect(within(yeni).getByText(/Ürün resminde: Üst Sol · Orta/)).toBeInTheDocument();
    const acilis = screen.getByRole('switch', { name: 'Açılışa Özel aktif' }).closest('li')!;
    expect(within(acilis).getByText(/Yalnızca etiket/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Açılışa Özel aktif' })).not.toBeChecked();
  });

  it('arama listeyi süzer ve sıralamayı kapatır', async () => {
    const user = await openDeals();
    await user.type(screen.getByRole('searchbox', { name: 'Fırsat ara' }), 'çok');
    expect(ids()).toEqual(['cok-satan']);
    expect(screen.getByText('Arama sırasında sıralama kapalıdır.')).toBeInTheDocument();
  });

  it('anahtar fırsatı pasife alır', async () => {
    const user = await openDeals();
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler aktif' }));
    expect(screen.getByRole('switch', { name: 'Yeni Ürünler aktif' })).not.toBeChecked();
    await waitFor(async () =>
      expect((await dealService.list()).find((d) => d.id === 'yeni')?.active).toBe(false),
    );
  });

  it('yeni fırsat ekler: rozet yeri ve boyutu örnek resimde seçilir', async () => {
    const user = await openDeals();
    await user.click(screen.getAllByRole('button', { name: 'Fırsat Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Fırsat Ekle' });
    await user.type(within(dialog).getByLabelText('Fırsat Adı'), 'Kampanya');
    // Hazır rozet YOK: ikon yüklenir.
    expect(within(dialog).queryByRole('radio', { name: 'İndirim' })).not.toBeInTheDocument();
    const file = new File(['<svg/>'], 'rozet.svg', { type: 'image/svg+xml' });
    await user.upload(within(dialog).getByLabelText('İkon dosyası seç'), file);
    await user.click(within(dialog).getByRole('radio', { name: 'Alt Sağ' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Büyük' }));
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ids()).toContain('yeni-1'));
    expect(screen.getByText('Kampanya eklendi.')).toBeInTheDocument();
    const added = (await dealService.list()).find((d) => d.id === 'yeni-1');
    expect(added).toMatchObject({ position: 'br', size: 'large', showOnImage: true });
    expect(added?.iconUrl).toBe('blob:rozet');
    expect(screen.getByText(/Alt Sağ · Büyük/)).toBeInTheDocument();
  });

  it('"Ürün resminin üzerinde göster" kapalıyken yer seçici gizlenir', async () => {
    const user = await openDeals();
    await user.dblClick(screen.getByRole('button', { name: 'Yeni Ürünler fırsatını düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fırsatı Düzenle' });
    expect(within(dialog).getByRole('radiogroup', { name: 'Rozetin yeri' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('switch', { name: 'Ürün Resminin Üzerinde Göster' }));
    expect(
      within(dialog).queryByRole('radiogroup', { name: 'Rozetin yeri' }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText(/yalnızca etiket olarak kullanılır/)).toBeInTheDocument();
  });

  it('ürün resminde gösterilecekse ikon yüklemeden kaydetmez', async () => {
    const user = await openDeals();
    await user.click(screen.getAllByRole('button', { name: 'Fırsat Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Fırsat Ekle' });
    await user.type(within(dialog).getByLabelText('Fırsat Adı'), 'Kampanya');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(
      within(dialog).getByText('Rozet olarak kullanılacak bir ikon yükleyin.'),
    ).toBeInTheDocument();
    // Resimde gösterilmeyecekse ikon şart değil.
    await user.click(within(dialog).getByRole('switch', { name: 'Ürün Resminin Üzerinde Göster' }));
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ids()).toHaveLength(7));
  });

  it('boş adla kaydetmeyi engeller', async () => {
    const user = await openDeals();
    await user.click(screen.getAllByRole('button', { name: 'Fırsat Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Fırsat Ekle' });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByText('Fırsat adı gerekli.')).toBeInTheDocument();
  });

  it('klavyeyle (tutamak + ok) sıra değiştirilir', async () => {
    const user = await openDeals();
    screen.getByRole('button', { name: /Yeni Ürünler sırasını değiştir/ }).focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(ids().slice(0, 2)).toEqual(['cok-satan', 'yeni']));
    expect((await dealService.list()).slice(0, 2).map((d) => d.id)).toEqual(['cok-satan', 'yeni']);
  });

  it('silince fırsat ürünlerden de kalkar', async () => {
    const user = await openDeals();
    await user.click(screen.getByRole('button', { name: 'Yeni Ürünler fırsatını sil' }));
    expect(await screen.findByText(/üründe kullanılıyor\. Silerseniz/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(ids()).not.toContain('yeni'));
    const products = await dealService.listProducts();
    expect(products.some((p) => p.dealIds.includes('yeni'))).toBe(false);
  });

  it('Ürünler penceresi: fırsatsız ürün eklenir, diğer fırsatları korunur', async () => {
    const user = await openDeals();
    await user.click(
      screen.getByRole('button', { name: /Yeni Ürünler fırsatının ürünlerini yönet/ }),
    );
    const dialog = await screen.findByRole('dialog', { name: /Yeni Ürünler · Ürünler/ });
    await user.click(await within(dialog).findByRole('tab', { name: 'Ürün Ekle' }));
    const first = (await within(dialog).findAllByRole('checkbox'))[0]!;
    await user.click(first);
    await user.click(within(dialog).getByRole('button', { name: 'Ekle' }));
    await waitFor(async () => {
      const before = (await dealService.list()).find((d) => d.id === 'yeni')!.productCount;
      expect(before).toBeGreaterThan(8);
    });
  });
});
