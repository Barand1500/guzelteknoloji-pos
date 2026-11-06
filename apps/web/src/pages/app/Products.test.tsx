import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseImport, sampleImportCsv } from '../../features/products/import.csv';
import { productService } from '../../features/products/services/product.service';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const NAME_1 = 'FLEXYPOS FP-503 İ3-15.6" Dokunmatik POS';
const NAME_4 = 'FLEXYPOS FP-505M İ5-15.6" Dokunmatik POS';

const rowCount = () => document.querySelectorAll('tr[data-product-id]').length;

/** Dar ekranı taklit eder: hiçbir min-width sorgusu eşleşmez → telefon düzeni çizilir. */
function stubNarrowScreen() {
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
}

async function openProducts(options: { phone?: boolean } = {}) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  if (options.phone) stubNarrowScreen();
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByRole('searchbox', { name: 'Ürün ara' });
  await waitFor(() =>
    expect(options.phone ? screen.getAllByRole('listitem').length : rowCount()).toBeGreaterThan(0),
  );
  return user;
}

beforeEach(() => {
  productService.reset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Ürün listesi (masaüstü tablo)', () => {
  it('ürünleri sayfalı listeler ve stok/satış durumlarını gösterir', async () => {
    await openProducts();
    expect(rowCount()).toBe(10);
    const first = document.querySelector('tr[data-product-id="p1"]') as HTMLElement;
    expect(within(first).getByText('318,00 $')).toBeInTheDocument(); // Fiyat 1, KDV dahil
    expect(within(first).getByText('5 adet')).toBeInTheDocument();
    const sixth = document.querySelector('tr[data-product-id="p6"]') as HTMLElement;
    expect(within(sixth).getByText('Tükendi')).toBeInTheDocument();
    expect(
      within(screen.getByRole('switch', { name: `${NAME_4} satışta` })).queryByText,
    ).toBeDefined();
    expect(screen.getByRole('switch', { name: `${NAME_4} satışta` })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('arama ad, kod ve marka üzerinde çalışır', async () => {
    const user = await openProducts();
    await user.type(screen.getByRole('searchbox', { name: 'Ürün ara' }), 'cas');
    await waitFor(() => expect(rowCount()).toBe(2));
  });

  it('süzgeç: marka seçip uygula, sonra süzgeçler kaldırılır', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: 'Süzgeçler' }));
    const dialog = await screen.findByRole('dialog', { name: 'Süzgeçler' });
    await user.click(within(dialog).getByRole('switch', { name: 'CAS' }));
    await user.click(within(dialog).getByRole('button', { name: '2 Ürünü Göster' }));
    await waitFor(() => expect(rowCount()).toBe(2));

    await user.click(screen.getByRole('button', { name: /Süzgeçler, 1 açık/ }));
    const again = await screen.findByRole('dialog', { name: 'Süzgeçler' });
    await user.click(within(again).getByRole('button', { name: 'Sıfırla' }));
    await user.click(within(again).getByRole('button', { name: /Ürünü Göster/ }));
    await waitFor(() => expect(rowCount()).toBe(10));
  });

  it('satış anahtarı ürünü anında günceller ve kaydeder', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('switch', { name: `${NAME_1} satışta` }));
    expect(screen.getByRole('switch', { name: `${NAME_1} satışta` })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    const saved = (await productService.list()).find((p) => p.id === 'p1');
    expect(saved?.salesOpen).toBe(false);
  });

  it('toplu işlem: seçilenlerin satışı kapatılır', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('checkbox', { name: `${NAME_1} seç` }));
    await user.click(screen.getByRole('checkbox', { name: /FP-505 İ5-15.6" Dokunmatik POS seç/ }));
    const bar = screen.getByRole('toolbar', { name: 'Toplu işlemler' });
    expect(within(bar).getByText('2 seçili')).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'İşlemler' }));
    const menu = await screen.findByRole('dialog', { name: 'Seçilenler (2)' });
    await user.click(within(menu).getByRole('button', { name: 'Satışa kapat' }));
    const list = await productService.list();
    expect(list.filter((p) => !p.salesOpen).map((p) => p.id)).toEqual(
      expect.arrayContaining(['p1', 'p2']),
    );
    expect(await screen.findByText('2 ürün satışa kapatıldı.')).toBeInTheDocument();
  });

  it('⋮ menüsünden silinir; onay ister', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    const menu = await screen.findByRole('dialog', { name: NAME_1 });
    await user.click(within(menu).getByRole('button', { name: 'Sil' }));
    expect(await screen.findByText(`${NAME_1} Silinsin Mi?`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(document.querySelector('tr[data-product-id="p1"]')).toBeNull());
    expect((await productService.list()).some((p) => p.id === 'p1')).toBe(false);
  });

  it('⋮ menüsünden kopya oluşturulur (satışa kapalı); pazaryerleri doğrudan görünür', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    const menu = await screen.findByRole('dialog', { name: NAME_1 });
    for (const m of ['Hepsiburada', 'Trendyol', 'N11'])
      expect(within(menu).getByRole('button', { name: m })).toBeInTheDocument();
    expect(within(menu).queryByText(/yakında/i)).not.toBeInTheDocument();
    await user.click(within(menu).getByRole('button', { name: 'Kopya Oluştur' }));
    expect(
      await screen.findByText(`${NAME_1} (Kopya) oluşturuldu (satışa kapalı).`),
    ).toBeInTheDocument();
    const copy = (await productService.list()).find((p) => p.name.endsWith('(Kopya)'));
    expect(copy?.salesOpen).toBe(false);
  });

  it('pazaryeri seçilince henüz bağlı olmadığı dürüstçe söylenir', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    const menu = await screen.findByRole('dialog', { name: NAME_1 });
    await user.click(within(menu).getByRole('button', { name: 'Trendyol' }));
    expect(await screen.findByText(/Trendyol bağlantısı henüz kurulmadı/)).toBeInTheDocument();
  });
});

describe('Excel ile ürün yükleme sihirbazı', () => {
  const csv = [
    'Stok Kodu;Ürün Adı;Fiyat 1;Kategori;Marka;Stok',
    'YENI-1;Yeni Terazi;1.250,50;Market Terazileri;CAS;4',
    'FLEXYPOS.FP-503;Güncel FP-503;270;;;',
    ';Kodsuz ürün;10;;;',
    'YENI-2;Kategorisi yok;10;Olmayan Kategori;;',
  ].join('\r\n');

  it('önizlemede doğru/yanlış satırlar ayrılır; onaylayınca yalnızca doğrular kaydedilir', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: 'Excel ile Yükle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excel ile Ürün Yükle' });
    expect(within(dialog).getByText('Stok Kodu *')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Dosyam Hazır, Devam' }));

    const file = new File([csv], 'urunler.csv', { type: 'text/csv' });
    await user.upload(within(dialog).getByLabelText('CSV dosyası seç'), file);
    await user.click(await within(dialog).findByRole('button', { name: 'Denetle ve Önizle' }));

    expect(await within(dialog).findByText('1 yeni')).toBeInTheDocument();
    expect(within(dialog).getByText('1 güncellenecek')).toBeInTheDocument();
    expect(within(dialog).getByText('2 hatalı')).toBeInTheDocument();
    expect(within(dialog).getByText('Stok kodu boş.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Kategori bulunamadı/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '2 Ürünü Kaydet' }));
    expect(await screen.findByText('1 ürün eklendi, 1 ürün güncellendi.')).toBeInTheDocument();
    const list = await productService.list();
    expect(list).toHaveLength(17);
    expect(list.find((p) => p.code === 'YENI-1')?.prices[0]).toBe(1250.5);
    expect(list.find((p) => p.code === 'FLEXYPOS.FP-503')?.name).toBe('Güncel FP-503');
  });

  it('zorunlu sütun eksikse önizlemeye geçilmez', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: 'Excel ile Yükle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excel ile Ürün Yükle' });
    await user.click(within(dialog).getByRole('button', { name: 'Dosyam Hazır, Devam' }));
    await user.upload(
      within(dialog).getByLabelText('CSV dosyası seç'),
      new File(['Ad;Fiyat\r\nx;1'], 'yanlis.csv', { type: 'text/csv' }),
    );
    await user.click(await within(dialog).findByRole('button', { name: 'Denetle ve Önizle' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Stok Kodu/);
    expect(within(dialog).queryByText('Onayla')).toBeInTheDocument(); // hâlâ 2. adımda
  });
});

describe('Ürün listesi (telefon)', () => {
  it('satıra dokununca açılır: üç fiyat, anahtarlar ve işlemler görünür', async () => {
    const user = await openProducts({ phone: true });
    expect(screen.queryByRole('switch', { name: `${NAME_1} satışta` })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ayrıntılarını aç` }));
    expect(screen.getByText('Fiyat 3', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: `${NAME_1} stok takibi` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Düzenle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kopya' })).toBeInTheDocument();
  });

  it('satıra yalnızca seçilen fiyat yazılır; seçici değişince fiyat değişir', async () => {
    const user = await openProducts({ phone: true });
    const row = screen.getByRole('button', { name: `${NAME_1} ayrıntılarını aç` });
    expect(within(row).getByText('318,00 $')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Listede gösterilecek fiyat' })).getByRole(
        'radio',
        { name: 'Fiyat 2' },
      ),
    );
    expect(within(row).getByText('330,00 $')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Alış' }));
    expect(within(row).getByText('268,80 $')).toBeInTheDocument(); // 224 + %20 KDV
  });

  it('satışa kapalı ürün satırda etiketlenir', async () => {
    await openProducts({ phone: true });
    const row = screen.getByRole('button', { name: `${NAME_4} ayrıntılarını aç` });
    expect(within(row).getByText('Satışta değil')).toBeInTheDocument();
  });

  it('Seç modunda kutucuklar çıkar ve toplu çubuk açılır', async () => {
    const user = await openProducts({ phone: true });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Seç' }));
    await user.click(screen.getByRole('checkbox', { name: `${NAME_1} seç` }));
    const bar = screen.getByRole('toolbar', { name: 'Toplu işlemler' });
    expect(within(bar).getByText('1 seçili')).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: /Tümünü seç \(16\)/ }));
    expect(within(bar).getByText('16 seçili')).toBeInTheDocument();
  });

  it('resim büyüteci resmi büyük açar', async () => {
    const user = await openProducts({ phone: true });
    await user.click(screen.getByRole('button', { name: `${NAME_1} resmini büyüt` }));
    expect(await screen.findByRole('img', { name: NAME_1 })).toBeInTheDocument();
  });
});

describe('Excel dosyası okuma', () => {
  it('noktalı virgül, virgül ve BOM ayraçlarını tanır; sütun sırası önemli değildir', () => {
    const semi = parseImport(`${String.fromCharCode(0xfeff)}Ürün Adı;Stok Kodu;Fiyat 1\r\nA;K1;5`);
    expect(semi.missingColumns).toEqual([]);
    expect(semi.rows[0]).toMatchObject({ code: 'K1', name: 'A', price1: '5', line: 2 });
    const comma = parseImport('stok kodu,ürün adı,fiyat 1\nK2,"B, tırnaklı",7\n\n');
    expect(comma.rows).toHaveLength(1);
    expect(comma.rows[0]?.name).toBe('B, tırnaklı');
  });

  it('ürün adındaki inç işareti satırları bozmaz', () => {
    const inch = 'POS 15.6" Dokunmatik';
    const parsed = parseImport(`Stok Kodu;Ürün Adı;Fiyat 1\r\nA;${inch};5\r\nB;Diğer;6`);
    expect(parsed.rows.map((r) => r.name)).toEqual([inch, 'Diğer']);
  });

  it('örnek dosya kendi okuyucusundan hatasız geçer', () => {
    const parsed = parseImport(sampleImportCsv());
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
  });
});
