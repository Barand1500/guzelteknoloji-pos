import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Geçici test girişi ve uygulama kabuğu', () => {
  it('girişsiz kullanıcı /uygulama adresinden /login sayfasına döner', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/stok-karti/yeni');
    expect(await screen.findByRole('heading', { name: /giriş yapın/i })).toBeInTheDocument();
  });

  it('"Test Kullanıcısı" butonu yeni stok kartı ekranını açar; gezinme ve gece modu çalışır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    expect(await screen.findByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Stok Kodu')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Ana gezinme' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gece Moduna Geç' }));
    expect(screen.getByRole('button', { name: 'Gündüz Moduna Geç' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Ürünler' }));
    expect(await screen.findByRole('heading', { name: 'Ürünler' })).toBeInTheDocument();
  });

  it('stok kartı: açılır liste, listeye yeni ekleme, birim ekleme ve kayıt çalışır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.type(await screen.findByLabelText('Stok Kodu'), 'A-1');
    await user.type(screen.getByLabelText('Stok Adı'), 'Deneme Ürünü');
    // Canlı önizleme yazdıkça güncellenir.
    expect(screen.getByLabelText('Kart önizlemesi')).toHaveTextContent('Deneme Ürünü');

    // Özel açılır liste: aç, seç.
    await user.click(screen.getByRole('combobox', { name: 'Marka' }));
    await user.click(screen.getByRole('option', { name: 'ASYS' }));
    expect(screen.getByRole('combobox', { name: 'Marka' })).toHaveTextContent('ASYS');

    // Listeye yeni öğe ekleme (ayrı pencere yok).
    await user.click(screen.getByRole('combobox', { name: 'Birim' }));
    await user.type(screen.getByLabelText('Yeni birim adı…'), 'PALET');
    await user.click(screen.getByRole('button', { name: 'Ekle' }));
    expect(await screen.findByRole('combobox', { name: 'Birim' })).toHaveTextContent('PALET');

    // İkinci birim satırı.
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Birim Ekle' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Stok kartı kaydedildi!')).toBeInTheDocument();
  });

  it('ağırlık hesaplayıcı sonucu forma yazar; ek fiyat eklenir', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    // Ağırlık: 10×20×30 cm prizma × 0,5 g/cm³ = 3000 g = 3 kg
    await user.click(await screen.findByRole('button', { name: 'Ağırlık Hesapla' }));
    const dialog = screen.getByRole('dialog', { name: 'Ağırlık Hesapla' });
    await user.type(within(dialog).getByLabelText(/En/), '10');
    await user.type(within(dialog).getByLabelText(/Boy/), '20');
    await user.type(within(dialog).getByLabelText(/Yükseklik/), '30');
    await user.type(within(dialog).getByLabelText(/Yoğunluk/), '0,5');
    expect(within(dialog).getByText('3 kg')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Uygula' }));
    expect(screen.getByLabelText('Ağırlık')).toHaveValue('3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Ek alış fiyatı
    await user.click(screen.getByRole('button', { name: /Ek Alış Fiyatları/ }));
    const extraList = screen.getAllByLabelText('Fiyat')[0]!;
    await user.type(extraList, '80');
    await user.click(screen.getAllByRole('button', { name: 'Ekle' })[0]!);
    expect(screen.getByRole('list', { name: 'Ek alış fiyatları' })).toHaveTextContent('80,00');
  });

  it('küçük ağırlık gram olarak yazılır (birim otomatik g olur)', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.click(await screen.findByRole('button', { name: 'Ağırlık Hesapla' }));
    const dialog = screen.getByRole('dialog', { name: 'Ağırlık Hesapla' });
    await user.type(within(dialog).getByLabelText(/En/), '10');
    await user.type(within(dialog).getByLabelText(/Boy/), '10');
    await user.type(within(dialog).getByLabelText(/Yükseklik/), '10');
    await user.type(within(dialog).getByLabelText(/Yoğunluk/), '0,5');
    expect(within(dialog).getByText('500 g')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Uygula' }));
    expect(screen.getByLabelText('Ağırlık')).toHaveValue('500');
    expect(screen.getByRole('radio', { name: 'g' })).toBeChecked();
  });

  it('KDV departmanı eklerken oran ayrı kutuya yazılır ve ad (%oran) olarak biçimlenir', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.click(await screen.findByRole('combobox', { name: 'KDV Departmanı' }));
    await user.type(screen.getByLabelText('Yeni KDV departmanı adı…'), 'Tekstil');
    // Oran girilmeden Ekle kapalıdır.
    expect(screen.getByRole('button', { name: 'Ekle' })).toBeDisabled();
    await user.type(screen.getByLabelText('KDV departmanı oranı (%)'), '%8,5');
    await user.click(screen.getByRole('button', { name: 'Ekle' }));
    expect(await screen.findByRole('combobox', { name: 'KDV Departmanı' })).toHaveTextContent(
      'Tekstil (%8,5)',
    );
  });

  it('özet paneli ok ile kapanıp açılır; kapalıyken kaydet düğmesi şeritte kalır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.click(await screen.findByRole('button', { name: 'Özeti Kapat' }));
    expect(screen.getByRole('button', { name: 'Özeti Aç' })).toBeInTheDocument();
    // jsdom CSS çalıştırmaz: dar ekran özeti DOM'da kalır, şerit düğmesi de vardır (en az biri).
    expect(screen.getAllByRole('button', { name: 'Kaydet' }).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: 'Özeti Aç' }));
    expect(screen.getByRole('button', { name: 'Özeti Kapat' })).toBeInTheDocument();
  });

  it('desi hesaplayıcı yurt içi ÷3000, yurt dışı ÷5000 ile hesaplar', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.click(await screen.findByRole('button', { name: 'Desi Hesapla' }));
    const dialog = screen.getByRole('dialog', { name: 'Desi Hesapla' });
    await user.type(within(dialog).getByLabelText(/En/), '30');
    await user.type(within(dialog).getByLabelText(/Boy/), '40');
    await user.type(within(dialog).getByLabelText(/Yükseklik/), '50');
    // 60.000 cm³ ÷ 3000 = 20 desi
    expect(within(dialog).getByText('Desi = (En × Boy × Yükseklik) ÷ 3000')).toBeInTheDocument();
    expect(within(dialog).getByText('20 desi')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Yurt Dışı' }));
    expect(within(dialog).getByText('Desi = (En × Boy × Yükseklik) ÷ 5000')).toBeInTheDocument();
    expect(within(dialog).getByText('12 desi')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Uygula' }));
    expect(screen.getByLabelText('Hacim')).toHaveValue('12');
  });

  it('hesaplayıcı arka plana tıklayınca kapanmaz, Esc ile kapanır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.click(await screen.findByRole('button', { name: 'Desi Hesapla' }));
    await user.click(screen.getByLabelText('Stok Kodu'));
    expect(screen.getByRole('dialog', { name: 'Desi Hesapla' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
