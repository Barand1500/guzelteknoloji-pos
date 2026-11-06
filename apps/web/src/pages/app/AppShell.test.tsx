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
    await user.type(screen.getAllByLabelText('Çarpan')[1]!, '12');

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
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

    // PERAKENDE listesine geçilince aynı iki birim ve barkod orada da vardır; fiyat boştur.
    await user.click(screen.getByRole('tab', { name: 'PERAKENDE' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(within(screen.getAllByRole('article')[0]!).getByText('8690001')).toBeInTheDocument();
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
    await user.click(screen.getByLabelText('Stok Kodu'));
    expect(screen.getByRole('dialog', { name: 'Desi Hesapla' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('envanter takibine göre alanlar değişir; Daha Fazla Alan düğmesi yoktur', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await screen.findByLabelText('Stok Kodu');

    expect(screen.queryByText('Daha Fazla Alan')).not.toBeInTheDocument();
    // Varsayılan Normal: alt/üst limit
    expect(screen.getByLabelText('Alt Limit')).toBeInTheDocument();
    expect(screen.getByLabelText('Üst Limit')).toBeInTheDocument();

    const pick = async (name: string) => {
      await user.click(screen.getByRole('combobox', { name: 'Envanter Takibi' }));
      await user.click(screen.getByRole('option', { name }));
    };

    await pick('Seri No');
    expect(screen.getByRole('combobox', { name: 'Seri No Zorunlu' })).toHaveTextContent('Hayır');
    expect(screen.getByLabelText('Seri No Öneki')).toBeInTheDocument();
    expect(screen.queryByLabelText('Alt Limit')).not.toBeInTheDocument();

    await pick('LOT');
    expect(screen.getByRole('combobox', { name: 'LOT Zorunlu' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'SKT Takibi' })).toBeInTheDocument();
    expect(screen.getByLabelText('LOT Öneki')).toBeInTheDocument();

    await pick('Ömür');
    expect(screen.getByRole('combobox', { name: 'SKT Zorunlu' })).toBeInTheDocument();
    expect(screen.getByLabelText('Raf Ömrü (Gün)')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk (Gün)')).toBeInTheDocument();

    await pick('Yok');
    expect(screen.queryByLabelText('Risk (Gün)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Alt Limit')).not.toBeInTheDocument();
  });

  it('sayı alanlarına rakam dışı karakter yazılamaz; Evet/Hayır seçilir', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await screen.findByLabelText('Stok Kodu');

    await user.type(screen.getByLabelText('Alt Limit'), '12abc,5');
    expect(screen.getByLabelText('Alt Limit')).toHaveValue('12,5');

    await user.click(screen.getByRole('combobox', { name: 'Envanter Takibi' }));
    await user.click(screen.getByRole('option', { name: 'Ömür' }));
    await user.type(screen.getByLabelText('Raf Ömrü (Gün)'), '3a0,5');
    expect(screen.getByLabelText('Raf Ömrü (Gün)')).toHaveValue('305');

    await user.click(screen.getByRole('combobox', { name: 'SKT Zorunlu' }));
    await user.click(screen.getByRole('option', { name: 'Evet' }));
    expect(screen.getByRole('combobox', { name: 'SKT Zorunlu' })).toHaveTextContent('Evet');

    // Fiyat alanı da yalnızca rakam alır
    await user.type(screen.getByLabelText('Satış Fiyatı'), '4x5,0y');
    expect(screen.getByLabelText('Satış Fiyatı')).toHaveValue('45,0');
  });

  it('envanter satırındaki kutular boşluk bırakmaz: Yok 3, Normal/Seri No 5, LOT/Ömür 4+2 sütun', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await screen.findByLabelText('Stok Kodu');

    const cols = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[style*=--cols]')).map((el) =>
        el.style.getPropertyValue('--cols'),
      );
    const pick = async (name: string) => {
      await user.click(screen.getByRole('combobox', { name: 'Envanter Takibi' }));
      await user.click(screen.getByRole('option', { name }));
    };

    expect(cols()).toEqual(['5']); // Normal: Envanter + Alt + Üst + Menşei + Diğer Vergi
    await pick('Yok');
    expect(cols()).toEqual(['3']);
    await pick('Seri No');
    expect(cols()).toEqual(['5']);
    await pick('LOT');
    expect(cols()).toEqual(['4', '2']);
    await pick('Ömür');
    expect(cols()).toEqual(['4', '2']);

    // Menşei en uzun ülke adına göre sınırlı (40 karakter)
    expect(screen.getByLabelText('Menşei')).toHaveAttribute('maxlength', '40');
  });
});
