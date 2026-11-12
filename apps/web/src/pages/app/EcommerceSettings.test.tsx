import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACE_RESOURCES, type WorkspaceContext } from '@gt/shared';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const owner: WorkspaceContext = {
  business: { id: 1, name: 'Güzel İşletme' },
  user: { id: 1, name: 'Yunus', email: 'yunus@example.com' },
  owner: true,
  permissions: WORKSPACE_RESOURCES.map((r) => ({
    resource: r.key,
    read: true,
    save: true,
    delete: true,
  })),
};
const login = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: '1', displayName: 'Yunus', email: 'yunus@example.com', avatarUrl: null },
    }),
  'GET /api/hesap': () => jsonResponse(200, owner),
};

beforeEach(() => sessionStorage.setItem('gt-dev-access', '1'));

describe('E-ticaret ayar ekranları', () => {
  it('Ayarlar’dan açılır; on bir ekranın bağlantısı ve dürüst uyarı görünür', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret');
    const nav = await screen.findByRole('navigation', { name: 'E-Ticaret ayarları' });
    expect(within(nav).getAllByRole('link')).toHaveLength(11);
    expect(screen.getAllByText('Sistem Ayarları').length).toBeGreaterThan(0);
  });

  it('sayfa listesi referans satırlarını gösterir; ekleme modalı açılır ve kayıt kapalıdır', async () => {
    const user = userEvent.setup();
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/sayfalar');
    expect((await screen.findAllByText('Üyelik Sözleşmesi')).length).toBeGreaterThan(0);
    expect(screen.getByText('ETBİS Kayıt Belgesi')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sayfa Ekle' });
    expect(within(dialog).getByRole('textbox', { name: 'Sayfa Adı' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Bağlantı yok' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Mesafeli Satış Sözleşmesi' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Kalın' })).toBeInTheDocument();
  });

  it('site iletişim alanları Genel Ayarlar içinde gerçek formda yer alır', async () => {
    mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/general': () => jsonResponse(200, { values: {}, configured: [] }),
    });
    renderApp('/uygulama/ayarlar/general');
    expect(await screen.findByRole('heading', { level: 2, name: 'Genel Ayarlar' })).toBeVisible();
    for (const label of [
      'İşletme Adı',
      'Telefon / GSM',
      'Adres',
      'Site URL',
      'İletişim E-postası',
      'Site E-posta',
      'Firma E-posta',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  });

  it('sistem ekranı yalnızca bildirim, kod ve dosya bölümlerini taşır', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/sistem');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Sistem Bildirimleri' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Özel Sistem Kodları' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Uygulama Linkleri' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ana Dizin Dosya Yüklemeleri' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Firma Adı')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('GSM No')).not.toBeInTheDocument();
  });

  it('şablon değişkenleri referans satırlarını listeler; modal alanları vardır', async () => {
    const user = userEvent.setup();
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/sablon-degiskenleri');
    expect(await screen.findByText('Kullanıcı Ekleme')).toBeInTheDocument();
    expect(screen.getByText('Uygulama - Yeni Kayıt')).toBeInTheDocument();
    expect(screen.getAllByText('#adsoyad#').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Değişken Ekle' });
    expect(within(dialog).getByRole('textbox', { name: 'Adı' })).toBeInTheDocument();
    expect(within(dialog).getAllByText('DB Sütun').length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('Değişken').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeDisabled();
  });

  it('menü yönetimi arama, gruplar ve ekleme penceresini gösterir', async () => {
    const user = userEvent.setup();
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/menu');
    expect((await screen.findAllByText('Ana Sayfa')).length).toBeGreaterThan(0);
    expect(screen.getByRole('searchbox', { name: 'Menüde ara' })).toBeInTheDocument();
    expect(screen.getByText('1. Alt Menü Blok')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Menü Öğesi Ekle' });
    expect(within(dialog).getByRole('textbox', { name: 'Adı' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  });

  it('widget listesi referanstaki gibi boştur', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/widgetlar');
    expect(await screen.findByText('Henüz widget yok.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ekle' })).toBeEnabled();
  });

  it('slider listesi üç örneği, aktif anahtarını ve sıralamayı gösterir', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/sliderlar');
    expect(await screen.findByText('El Terminalleri')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'El Terminalleri aktif' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Ekle' })).toBeEnabled();
  });

  it('görünüm ekranı referans başlangıç seçimlerini gösterir', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/ayarlar/eticaret/gorunum');
    expect(await screen.findByRole('radio', { name: 'Yatay Dikdörtgen' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Kare' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'SIĞDIR' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'KIRP' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Kar Marjı' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'KDV Dahil Sat' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  });
});
