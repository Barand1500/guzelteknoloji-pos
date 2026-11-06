import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryService } from '../../features/categories/services/category.service';
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
  it('ana kategorileri kutucuk olarak sırayla listeler', async () => {
    await openCategories();
    expect(ids()).toEqual(['otvt', 'tartim', 'cagri', 'sarf', 'yazilim']);
    expect(screen.getByText('8 alt kategori · 0 ürün')).toBeInTheDocument();
  });

  it('kutucuğa dokununca içine girer, yol görünür ve geri çıkılır', async () => {
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

  it('liste görünümüne geçilir ve seçim hatırlanır', async () => {
    const user = await openCategories();
    await user.click(screen.getByRole('radio', { name: 'Liste' }));
    expect(screen.getByRole('switch', { name: 'OT/VT Ürünleri aktif' })).toBeChecked();
    expect(localStorage.getItem('gt-kategori-gorunum')).toBe('list');
  });

  it('arama tüm ağaçta çalışır ve yolu gösterir', async () => {
    const user = await openCategories();
    await user.type(screen.getByRole('searchbox', { name: 'Kategori ara' }), 'yazıcı');
    expect(ids()).toEqual(['yazici']);
    expect(screen.getByText('Tümü › OT/VT Ürünleri')).toBeInTheDocument();
  });

  it('klavyeyle (Alt + ok) sıra değiştirilir', async () => {
    const user = await openCategories();
    screen.getByRole('button', { name: 'OT/VT Ürünleri kategorisini aç' }).focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
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
    await user.click(screen.getByRole('button', { name: 'Tartım ve Paketleme işlemleri' }));
    await user.click(await screen.findByRole('button', { name: 'Sil' }));
    expect(
      await screen.findByText(/2 alt kategori \(alt dalları dahil\) silinecek/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(ids()).not.toContain('tartim'));
    const left = await categoryService.list();
    expect(left.some((c) => c.id === 'terazi')).toBe(false);
  });

  it('kategori kendi alt kategorisine taşınamaz (üst kategori listesinde yok)', async () => {
    const user = await openCategories();
    await user.click(screen.getByRole('button', { name: 'OT/VT Ürünleri işlemleri' }));
    await user.click(await screen.findByRole('button', { name: 'Düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Kategoriyi Düzenle' });
    await user.click(within(dialog).getByRole('combobox', { name: /Üst Kategori/ }));
    const list = await screen.findByRole('listbox');
    expect(within(list).queryByRole('option', { name: /Dokunmatik POS/ })).not.toBeInTheDocument();
    expect(within(list).getByRole('option', { name: /Tartım ve Paketleme/ })).toBeInTheDocument();
  });
});
