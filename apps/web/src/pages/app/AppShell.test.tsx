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
    expect(await screen.findByLabelText('Ürün Kodu')).toBeInTheDocument();
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

    await user.type(await screen.findByLabelText('Ürün Kodu'), 'A-1');
    await user.type(screen.getByLabelText('Ürün Adı'), 'Deneme Ürünü');
    // Sağ kenarda dikey sekme yoktur (fırsat/özellik Ürün Bilgisi kartının altındadır).
    expect(screen.queryByRole('tablist', { name: 'Yan sekmeler' })).not.toBeInTheDocument();

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
    await user.type(screen.getAllByLabelText('Çarpan')[1]!, '12');

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
  });

  it('ağırlık hesaplayıcı sonucu forma yazar', async () => {
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

  it('birim ve barkod ortaktır: bir fiyat listesinde yapılan değişiklik diğerlerinde de görünür, fiyatlar ayrı kalır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    // FİYAT listesinde satış fiyatı gir, ikinci birim ekle ve barkod yaz.
    await user.type(await screen.findByLabelText('Satış Fiyatı'), '100');
    await user.click(screen.getByRole('button', { name: 'Birim Ekle' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.type(screen.getAllByLabelText('Barkod')[0]!, '8690001');
    await user.click(screen.getAllByRole('button', { name: 'Barkod Ekle' })[0]!);
    await screen.findByRole('button', { name: 'Barkodları görüntüle (1)' });

    // PERAKENDE listesine geçilince aynı iki birim ve barkod orada da vardır; fiyat boştur.
    await user.click(screen.getByRole('tab', { name: 'PERAKENDE' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(
      within(screen.getAllByRole('article')[0]!).getByRole('button', {
        name: 'Barkodları görüntüle (1)',
      }),
    );
    const barcodes = screen.getByRole('dialog', { name: 'Barkodlar' });
    expect(within(barcodes).getByText('8690001')).toBeInTheDocument();
    await user.click(within(barcodes).getByRole('button', { name: 'Kapat' }));
    expect(screen.getAllByLabelText('Satış Fiyatı')[0]).toHaveValue('');

    // Perakendeye birim eklenirse FİYAT listesinde de görünür.
    await user.click(screen.getByRole('button', { name: 'Birim Ekle' }));
    await user.click(screen.getByRole('tab', { name: 'FİYAT' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getAllByLabelText('Satış Fiyatı')[0]).toHaveValue('100');
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
    await user.click(screen.getByLabelText('Ürün Kodu'));
    expect(screen.getByRole('dialog', { name: 'Desi Hesapla' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Ürün Bilgisi: KDV departmanı, stok nevi ve GTIP yok; alanlar Ürün Kodu/Adı/Tipi adını taşır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await screen.findByLabelText('Ürün Kodu');

    for (const label of ['Ürün Adı', 'Marka', 'Menşei', 'Envanter Takibi', 'Kategori'])
      expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: 'Ürün Tipi' })).toBeInTheDocument();
    for (const gone of ['KDV Departmanı', 'Stok Nevi', 'GTIP Kodu', 'Stok Kodu', 'Stok Adı'])
      expect(screen.queryByLabelText(gone)).not.toBeInTheDocument();
  });

  it('Envanter Takibi yalnızca Evet/Hayır; stok miktarı, limit ve diğer vergi alanları yoktur', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await screen.findByLabelText('Ürün Kodu');

    const tracking = screen.getByRole('combobox', { name: 'Envanter Takibi' });
    await user.click(tracking);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Hayır', 'Evet']);
    await user.click(screen.getByRole('option', { name: 'Evet' }));
    for (const gone of ['Stok Miktarı', 'Alt Limit', 'Üst Limit', 'Diğer Vergi Ekle'])
      expect(screen.queryByLabelText(gone)).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Envanter Takibi' }));
    await user.click(screen.getByRole('option', { name: 'Hayır' }));

    // Fiyat alanı da yalnızca rakam alır.
    await user.type(screen.getByLabelText('Satış Fiyatı'), '4x5,0y');
    expect(screen.getByLabelText('Satış Fiyatı')).toHaveValue('45,0');
  });

  it('Menşei: ülke adı yazınca süzülür, bayraklı seçenek seçilir; "Belirtilmedi" boşaltır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await screen.findByLabelText('Ürün Kodu');

    await user.click(screen.getByRole('combobox', { name: 'Menşei' }));
    await user.type(screen.getByLabelText('Menşei içinde ara'), 'alman');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Almanya');
    expect(options[0]!.querySelector('.fi-de')).not.toBeNull(); // bayrak SVG sınıfı
    await user.click(options[0]!);
    expect(screen.getByRole('combobox', { name: 'Menşei' })).toHaveTextContent('Almanya');

    await user.click(screen.getByRole('combobox', { name: 'Menşei' }));
    await user.click(screen.getByRole('option', { name: 'Belirtilmedi' }));
    expect(screen.getByRole('combobox', { name: 'Menşei' })).toHaveTextContent('Belirtilmedi');
  });
});
