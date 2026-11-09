import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoCategoryService as categoryService } from '../../features/categories/services/category.demo';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const ids = () =>
  within(screen.getByRole('list', { name: 'Kategoriler' }))
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-sortable-id'));

async function openCategories(path = '/uygulama/kategoriler') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('list', { name: 'Kategoriler' });
  return user;
}

beforeEach(() => {
  categoryService.reset();
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Kategoriler ekranı', () => {
  it('ana kategorileri liste olarak sırayla listeler; "N alt · N ürün" yazısı yoktur', async () => {
    await openCategories();
    expect(ids()).toEqual(['otvt', 'tartim', 'cagri', 'sarf', 'yazilim']);
    expect(screen.queryByText(/\d+ alt/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ ürün/)).not.toBeInTheDocument();
  });

  it('satıra tıklayınca içine girer, yol görünür ve geri çıkılır', async () => {
    const user = await openCategories();
    await user.click(screen.getByRole('button', { name: 'OT/VT Ürünleri kategorisini aç' }));
    await waitFor(() => expect(ids()[0]).toBe('pos'));
    const path = screen.getByRole('navigation', { name: 'Kategori yolu' });
    expect(within(path).getByRole('button', { name: 'OT/VT Ürünleri' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: 'Ödeme Kaydediciler kategorisini aç' }));
    await waitFor(() => expect(ids()).toEqual(['yeni-nesil', 'yazarkasa-aks']));

    await user.click(screen.getByRole('button', { name: 'Bir üst kategoriye çık' }));
    await waitFor(() => expect(ids()[0]).toBe('pos'));
    await user.click(within(path).getByRole('button', { name: 'Tümü' }));
    await waitFor(() => expect(ids()[0]).toBe('otvt'));
  });

  it('adres çubuğundaki kategori doğrudan açılır', async () => {
    await openCategories('/uygulama/kategoriler?k=odeme');
    expect(ids()).toEqual(['yeni-nesil', 'yazarkasa-aks']);
  });

  it('yalnızca liste vardır (kutucuk seçici yok) ve sayfalama yoktur', async () => {
    await openCategories();
    expect(screen.queryByRole('radio', { name: 'Kutucuk' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Görünüm' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'OT/VT Ürünleri aktif' })).toBeChecked();
    expect(screen.queryByLabelText('Sayfada Kaç Kategori')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sonraki sayfa' })).not.toBeInTheDocument();
  });

  it('kategori formunda Aktif, Mağazada Gizle ve Ürünler yok; açıklama adın altındadır', async () => {
    const user = await openCategories();
    await user.click(screen.getByRole('button', { name: 'OT/VT Ürünleri kategorisini düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Kategoriyi Düzenle' });
    expect(within(dialog).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Ürünler/ })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Açıklama')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('SEO Başlığı')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Gelişmiş: SEO/ }));
    expect(within(dialog).getByLabelText('SEO Başlığı')).toBeInTheDocument();
  });

  it('görsele çift tıklayınca kategoriye girmez; düzenleme açılır ve görsel seçici çalışır', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    const user = await openCategories();
    await user.dblClick(screen.getAllByTitle('Görseli değiştirmek için çift tıklayın')[0]!);
    await screen.findByRole('dialog', { name: 'Kategoriyi Düzenle' });
    expect(click).toHaveBeenCalled();
    click.mockRestore();
    // Kategorinin içine girilmedi (yol çubuğunda yalnızca "Tümü").
    const path = screen.getByRole('navigation', { name: 'Kategori yolu' });
    expect(within(path).getAllByRole('button')).toHaveLength(1);
  });

  it('arama tüm ağaçta çalışır ve yolu gösterir', async () => {
    const user = await openCategories();
    await user.type(screen.getByRole('searchbox', { name: 'Kategori ara' }), 'yazıcı');
    expect(ids()).toEqual(['yazici']);
    expect(screen.getByText('Tümü › OT/VT Ürünleri')).toBeInTheDocument();
  });

  it('klavyeyle (Alt + ok) sıra değiştirilir', async () => {
    const user = await openCategories();
    screen.getByRole('button', { name: /^OT\/VT Ürünleri sırasını değiştir/ }).focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(ids().slice(0, 2)).toEqual(['tartim', 'otvt']));
    const next = await categoryService.list();
    expect(
      next
        .filter((c) => c.parentId === null)
        .map((c) => c.id)
        .slice(0, 2),
    ).toEqual(['tartim', 'otvt']);
  });

  it('alt kategori ekler', async () => {
    const user = await openCategories('/uygulama/kategoriler?k=tartim');
    await user.click(screen.getAllByRole('button', { name: 'Alt Kategori Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Kategori Ekle' });
    await user.type(within(dialog).getByLabelText('Kategori Adı'), 'Etiket Makineleri');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ids()).toContain('yeni-1'));
    expect(screen.getByText('Etiket Makineleri eklendi.')).toBeInTheDocument();
  });

  it('boş adla kaydetmeyi engeller', async () => {
    const user = await openCategories();
    await user.click(screen.getAllByRole('button', { name: 'Kategori Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Kategori Ekle' });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByText('Kategori adı gerekli.')).toBeInTheDocument();
  });

  it('alt kategorisi olan kategoriyi silerken uyarır ve dalı siler', async () => {
    const user = await openCategories();
    await user.click(screen.getByRole('button', { name: 'Tartım ve Paketleme kategorisini sil' }));
    expect(
      await screen.findByText(/2 alt kategori \(alt dalları dahil\) silinecek/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(ids()).not.toContain('tartim'));
    const left = await categoryService.list();
    expect(left.some((c) => c.id === 'terazi')).toBe(false);
  });

  it('Taşı: istenen kategoriye gezip "Buraya Taşı" ile taşır', async () => {
    const user = await openCategories('/uygulama/kategoriler?k=otvt');
    await user.click(screen.getByRole('button', { name: 'Dokunmatik POS kategorisini taşı' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dokunmatik POS · Taşı' });
    // Başlangıçta şu anki yerinde: taşıma kapalı.
    expect(within(dialog).getByRole('button', { name: 'Zaten Burada' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Ana Kategoriler' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tartım ve Paketleme içine gir' }));
    expect(within(dialog).getByText('Hedef:')).toHaveTextContent('Tartım ve Paketleme');
    await user.click(within(dialog).getByRole('button', { name: 'Buraya Taşı' }));
    await waitFor(() => expect(ids()).not.toContain('pos'));
    expect(
      screen.getByText('Dokunmatik POS, Tartım ve Paketleme içine taşındı.'),
    ).toBeInTheDocument();
    const moved = (await categoryService.list()).find((c) => c.id === 'pos');
    expect(moved?.parentId).toBe('tartim');
  });

  it('Taşı: kategori kendi dalına taşınamaz (kendisi ve altları listede yok)', async () => {
    const user = await openCategories();
    await user.click(screen.getByRole('button', { name: 'OT/VT Ürünleri kategorisini taşı' }));
    const dialog = await screen.findByRole('dialog', { name: 'OT/VT Ürünleri · Taşı' });
    expect(
      within(dialog).queryByRole('button', { name: 'OT/VT Ürünleri içine gir' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Tartım ve Paketleme içine gir' }),
    ).toBeInTheDocument();
  });

  it('düzenleme penceresinde Konum düğmesi yan taşıma panelini açar ve hemen taşır', async () => {
    const user = await openCategories('/uygulama/kategoriler?k=otvt');
    await user.click(
      screen.getByRole('button', { name: 'Fiyatgör ve Kiosk kategorisini düzenle' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Kategoriyi Düzenle' });
    await user.click(within(dialog).getByRole('button', { name: /Konum · Taşı/ }));
    await user.click(await screen.findByRole('button', { name: 'Ana Kategoriler' }));
    await user.click(screen.getByRole('button', { name: 'Buraya Taşı' }));
    await waitFor(async () =>
      expect((await categoryService.list()).find((c) => c.id === 'kiosk')?.parentId).toBeNull(),
    );
    expect(within(dialog).getByRole('button', { name: /Konum · Taşı/ })).toHaveTextContent(
      'Ana Kategori',
    );
  });
});
