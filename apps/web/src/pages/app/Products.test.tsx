import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autoMapping,
  buildImportText,
  missingRequired,
  parseImport,
  readTable,
  sampleImportCsv,
} from '../../features/products/import.csv';
import { demoProductService as productService } from '../../features/products/services/product.demo';
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
    expect(screen.queryByRole('link', { name: 'Önceki Sayfaya Dön' })).not.toBeInTheDocument();
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
    expect(within(first).getByText('318,00 $')).toBeInTheDocument(); // FİYAT listesi, KDV dahil
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
    await user.click(within(dialog).getByRole('button', { name: 'Marka' }));
    await user.click(screen.getByRole('checkbox', { name: 'CAS' }));
    await user.click(await within(dialog).findByRole('button', { name: '2 Ürünü Göster' }));
    await waitFor(() => expect(rowCount()).toBe(2));

    await user.click(screen.getByRole('button', { name: /Süzgeçler, 1 açık/ }));
    const again = await screen.findByRole('dialog', { name: 'Süzgeçler' });
    await user.click(within(again).getByRole('button', { name: 'Sıfırla' }));
    await user.click(
      await within(again).findByRole('button', { name: /Ürünü Göster|Ürünleri Göster/ }),
    );
    await waitFor(() => expect(rowCount()).toBe(10));
  });

  it('satış anahtarı kayıt tamamlanınca ürünü günceller', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('switch', { name: `${NAME_1} satışta` }));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: `${NAME_1} satışta` })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
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
    const menu = await screen.findByRole('dialog', { name: 'Toplu İşlem · 2 ürün' });
    await user.click(within(menu).getByRole('button', { name: /Satış Durumu/ }));
    const step = await screen.findByRole('dialog', { name: 'Toplu satış durumu' });
    await user.click(within(step).getByRole('radio', { name: /Satışa Kapat/ }));
    await user.click(within(step).getByRole('button', { name: 'Devam' }));
    await user.click(within(step).getByRole('button', { name: 'Onaylıyorum' }));
    const list = await productService.list();
    expect(list.filter((p) => !p.salesOpen).map((p) => p.id)).toEqual(
      expect.arrayContaining(['p1', 'p2']),
    );
    expect(await screen.findByText('2 ürün satışa kapatıldı.')).toBeInTheDocument();
  });

  it('satırdaki Sil simgesi ürünü hemen gizler; "Geri Al" ile geri gelir, basılmazsa süre sonunda silinir', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününü sil` }));
    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent(`${NAME_1} silindi.`);
    expect(toast).toHaveTextContent('Geri almak ister misiniz?');
    expect(document.querySelector('tr[data-product-id="p1"]')).toBeNull();
    // Henüz kalıcı silinmedi.
    expect((await productService.list()).some((p) => p.id === 'p1')).toBe(true);

    await user.click(within(toast).getByRole('button', { name: 'Geri Al' }));
    expect(document.querySelector('tr[data-product-id="p1"]')).not.toBeNull();
    expect(screen.queryByText('Geri almak ister misiniz?')).not.toBeInTheDocument();
    expect((await productService.list()).some((p) => p.id === 'p1')).toBe(true);
  });

  it('geri alınmazsa süre dolunca ürün kalıcı silinir', async () => {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününü sil` }));
    await screen.findByText('Geri almak ister misiniz?');
    await waitFor(
      async () => expect((await productService.list()).some((p) => p.id === 'p1')).toBe(false),
      { timeout: 9000 },
    );
    expect(screen.queryByText('Geri almak ister misiniz?')).not.toBeInTheDocument();
  }, 15000);

  it('satırda ⋮ menüsü yoktur: Düzenle, Kopya Oluştur ve Sil doğrudan simgedir', async () => {
    await openProducts();
    expect(screen.queryByRole('button', { name: `${NAME_1} işlemleri` })).not.toBeInTheDocument();
    const row = document.querySelector('tr[data-product-id="p1"]') as HTMLElement;
    expect(
      within(row)
        .getAllByRole('button')
        .map((b) => b.getAttribute('title'))
        .filter(Boolean),
    ).toEqual(expect.arrayContaining(['Düzenle', 'Kopya Oluştur', 'Sil']));
  });

  it('tabloda tek fiyat sütunu vardır; üzerine gelince tüm fiyat listeleri açılır', async () => {
    const user = await openProducts();
    const header = document.querySelector('thead') as HTMLElement;
    expect(within(header).queryByText('PERAKENDE')).not.toBeInTheDocument();
    const cell = screen.getByRole('button', { name: `${NAME_1} fiyatları` });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.hover(cell);
    const card = await screen.findByRole('tooltip');
    for (const name of ['FİYAT', 'PERAKENDE', 'TOPTAN'])
      expect(within(card).getByText(name)).toBeInTheDocument();
    expect(within(card).getAllByText(/KDV Hariç/).length).toBeGreaterThan(0);
    await user.unhover(cell);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('resme çift tıklayınca görseller penceresi açılır; daha fazla görsel yüklenir', async () => {
    const user = await openProducts();
    const row = document.querySelector('tr[data-product-id="p1"]') as HTMLElement;
    await user.dblClick(within(row).getByTitle('Görselleri değiştirmek için çift tıklayın'));
    const dialog = await screen.findByRole('dialog', { name: 'Ürün Görselleri' });
    // Satırın çift tıklaması (düzenleme) çalışmaz.
    expect(screen.queryByRole('heading', { name: 'Stok Kartını Düzenle' })).not.toBeInTheDocument();
    const before = (await productService.list()).find((p) => p.id === 'p1')!.imageUrls.length;
    await user.click(within(dialog).getByRole('button', { name: 'Daha Fazla Yükle' }));
    await user.upload(
      within(dialog).getByLabelText('Görsel dosyaları seç'),
      new File(['x'], 'yeni.png', { type: 'image/png' }),
    );
    await user.click(await within(dialog).findByRole('button', { name: '1 Görseli Yükle' }));
    expect(await screen.findByText(/için 1 görsel eklendi/)).toBeInTheDocument();
    const after = (await productService.list()).find((p) => p.id === 'p1')!.imageUrls.length;
    expect(after).toBe(before + 1);
  });

  it('mevcut ürün görsellerinin sırasını değiştirip kaydeder', async () => {
    await productService.applyImages([{ productId: 'p1', urls: ['data:image/png;base64,a', 'data:image/png;base64,b'] }], true);
    const user = await openProducts();
    const row = document.querySelector('tr[data-product-id="p1"]') as HTMLElement;
    await user.dblClick(within(row).getByTitle('Görselleri değiştirmek için çift tıklayın'));
    const dialog = await screen.findByRole('dialog', { name: 'Ürün Görselleri' });
    const tile = within(dialog).getAllByRole('button', { name: /Mevcut görsel \(sürükleyerek sırala\)/ })[0]!;
    tile.focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await user.click(within(dialog).getByRole('button', { name: 'Sıralamayı Kaydet' }));
    await screen.findByText(/görsel sırası kaydedildi/);
    expect((await productService.list()).find((p) => p.id === 'p1')!.imageUrls).toEqual(['data:image/png;base64,b', 'data:image/png;base64,a']);
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

  async function openWizard() {
    const user = await openProducts();
    await user.click(screen.getByRole('button', { name: 'Excel ile Yükle' }));
    const dialog = await screen.findByRole('dialog', { name: "Excel'den İçe Aktar" });
    return { user, dialog };
  }
  const upload = (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, file: File) =>
    user.upload(within(dialog).getByLabelText('Excel veya CSV dosyası seç'), file);

  it('dosya seçilince sütunlar kendiliğinden eşleşir; önizlemede doğru/yanlış satırlar ayrılır; onaylayınca yalnızca doğrular kaydedilir', async () => {
    const { user, dialog } = await openWizard();
    expect(within(dialog).getByText('Dosya Seç')).toBeInTheDocument();
    await upload(user, dialog, new File([csv], 'urunler.csv', { type: 'text/csv' }));

    // 2. adım: eşleştirme
    const map = await within(dialog).findByRole('list', { name: 'Sütun eşleştirme' });
    expect(within(dialog).getByText('4 satır · 6 sütun bulundu')).toBeInTheDocument();
    expect(within(map).getAllByRole('listitem')).toHaveLength(6);
    const first = within(map).getAllByRole('listitem')[0]!;
    expect(within(first).getByRole('combobox')).toHaveTextContent('Ürün Kodu *'); // "Stok Kodu" başlığı
    await user.click(within(dialog).getByRole('button', { name: 'Ön İzlemeyi Gör' }));

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

  it('zorunlu alan eşleşmemişse önizlemeye geçilmez; elle eşleştirilince geçilir', async () => {
    const { user, dialog } = await openWizard();
    await upload(
      user,
      dialog,
      new File(['SKU;Mal Adı;Birim Fiyatı\r\nZ-1;Deneme Malı;12'], 'ozel.csv', {
        type: 'text/csv',
      }),
    );
    const map = await within(dialog).findByRole('list', { name: 'Sütun eşleştirme' });
    const rows = within(map).getAllByRole('listitem');
    // "SKU" kendiliğinden Ürün Koduna eşleşir; diğer ikisi atlanmıştır.
    expect(within(rows[0]!).getByRole('combobox')).toHaveTextContent('Ürün Kodu *');
    expect(within(rows[1]!).getByRole('combobox')).toHaveTextContent('Bu sütunu atla');
    const next = within(dialog).getByRole('button', { name: 'Ön İzlemeyi Gör' });
    expect(next).toBeDisabled();
    expect(within(dialog).getByRole('status')).toHaveTextContent(/Ürün Adı, Fiyat 1/);

    await user.click(within(rows[1]!).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Ürün Adı *' }));
    await user.click(within(rows[2]!).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Fiyat 1 (ilk liste) *' }));
    expect(next).toBeEnabled();
    await user.click(next);
    expect(await within(dialog).findByText('1 yeni')).toBeInTheDocument();
  });
});

describe('Ürün listesi (telefon)', () => {
  it('satıra dokununca açılır: tüm fiyat listeleri (kendi adlarıyla), anahtarlar ve işlemler görünür', async () => {
    const user = await openProducts({ phone: true });
    expect(screen.queryByRole('switch', { name: `${NAME_1} satışta` })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ayrıntılarını aç` }));
    expect(screen.getByText('TOPTAN', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.queryByText(/Fiyat 3/)).not.toBeInTheDocument();
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
        { name: 'PERAKENDE' },
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

  it('başlıklar harf/aksan farkına bakmadan eşleşir; aynı tablo sütunu iki kez kullanılmaz', () => {
    expect(autoMapping(['URUN KODU', 'urun adi', 'FİYAT', 'Fiyat 1', 'Bilinmeyen'])).toEqual([
      'code',
      'name',
      'price1',
      '',
      '',
    ]);
    const table = readTable('Kod;Ad;Fiyat\r\nA;B;5\r\n\r\n');
    expect(table.records).toHaveLength(1);
    expect(buildImportText(table, ['code', 'name', 'price1'])).toBe(
      '"Stok Kodu";"Ürün Adı";"Fiyat 1";"Kategori";"Marka";"Fiyat 2";"Fiyat 3";"Alış Fiyatı";"KDV";"Stok"\r\n"A";"B";"5";"";"";"";"";"";"";""',
    );
    expect(missingRequired(['code', 'name', ''])).toEqual(['Fiyat 1 (ilk liste)']);
  });

  it('örnek dosya kendi okuyucusundan hatasız geçer', () => {
    const parsed = parseImport(sampleImportCsv());
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
  });
});

describe('Toplu işlem sihirbazı', () => {
  async function openBulk(user: Awaited<ReturnType<typeof openProducts>>, ...ids: string[]) {
    for (const id of ids) {
      const row = document.querySelector(`tr[data-product-id="${id}"]`) as HTMLElement;
      await user.click(within(row).getByRole('checkbox'));
    }
    await user.click(
      within(screen.getByRole('toolbar', { name: 'Toplu işlemler' })).getByRole('button', {
        name: 'İşlemler',
      }),
    );
    return screen.findByRole('dialog', { name: `Toplu İşlem · ${ids.length} ürün` });
  }

  it('önce işlem kutucukları gelir; bir işleme girince "Geri" ile menüye dönülür', async () => {
    const user = await openProducts();
    const menu = await openBulk(user, 'p1', 'p2');
    for (const name of [
      /Fiyat Güncelle/,
      /Fırsat/,
      /Kategori/,
      /Marka/,
      /Satış Durumu/,
      /Stok Takibi/,
    ])
      expect(within(menu).getByRole('button', { name })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Seçilenleri Sil' })).toBeInTheDocument();

    await user.click(within(menu).getByRole('button', { name: /Marka/ }));
    const step = await screen.findByRole('dialog', { name: 'Toplu marka' });
    expect(within(step).getByRole('list', { name: 'Adımlar' })).toBeInTheDocument();
    await user.click(within(step).getByRole('button', { name: 'Geri' }));
    expect(await screen.findByRole('dialog', { name: 'Toplu İşlem · 2 ürün' })).toBeInTheDocument();
  });

  it('fiyat: işlem → KDV → önizleme (eski/yeni fiyat) → onay; yüzde artırma uygulanır', async () => {
    const user = await openProducts();
    const before = (await productService.list()).find((p) => p.id === 'p1')!;
    const net = before.listPrices![0]!.net!;
    const menu = await openBulk(user, 'p1', 'p2');
    await user.click(within(menu).getByRole('button', { name: /Fiyat Güncelle/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Toplu fiyat güncelle' });

    // 1) Fiyat ve işlem
    expect(within(dialog).getByRole('button', { name: 'Devam' })).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: 'Zam' }));
    await user.click(within(dialog).getByRole('radio', { name: '% Yüzde' }));
    await user.type(within(dialog).getByLabelText('Yüzde (%)'), '10');
    // Yuvarlama kapalıyken adım seçenekleri yoktur; açınca dört adım çıkar.
    expect(within(dialog).queryByRole('radio', { name: /0,50 ₺/ })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('switch', { name: 'Yuvarlama' }));
    expect(within(dialog).getByRole('radio', { name: /0,10 ₺/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /1 ₺/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(within(dialog).getByRole('switch', { name: 'Yuvarlama' })); // kapat
    await user.click(within(dialog).getByRole('button', { name: 'Devam' }));

    // 2) KDV dahil mi hariç mi
    expect(within(dialog).getByRole('radio', { name: /KDV Dahil/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(within(dialog).getByRole('radio', { name: /KDV Hariç/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Devam' }));

    // 3) Önizleme
    expect(within(dialog).getByText('%10 zam')).toBeInTheDocument();
    const list = within(dialog).getByRole('list', { name: 'Önizleme' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    await user.click(within(dialog).getByRole('button', { name: 'Onaylıyorum' }));
    expect(await screen.findByText(/üründe fiyat güncellendi/)).toBeInTheDocument();
    const after = (await productService.list()).find((p) => p.id === 'p1')!;
    expect(after.listPrices![0]!.net!).toBeCloseTo(net * 1.1, 4);
  });

  it('fırsat: listeden seçilir, özet cümle ve ürünler gösterilir, onayla eklenir', async () => {
    const user = await openProducts();
    const menu = await openBulk(user, 'p3');
    await user.click(within(menu).getByRole('button', { name: /^Fırsat/ }));
    const step = await screen.findByRole('dialog', { name: 'Toplu fırsat' });
    expect(within(step).getByRole('button', { name: 'Devam' })).toBeDisabled();
    await user.click(await within(step).findByRole('radio', { name: 'Yeni Ürünler' }));
    await user.click(within(step).getByRole('button', { name: 'Devam' }));
    expect(within(step).getByText(/“Yeni Ürünler” fırsatı eklenecek/)).toBeInTheDocument();
    await user.click(within(step).getByRole('button', { name: 'Onaylıyorum' }));
    expect(await screen.findByText('1 ürün için fırsat eklendi.')).toBeInTheDocument();
    expect((await productService.list()).find((p) => p.id === 'p3')!.dealIds).toContain('yeni');
  });

  it('kategori: arama kutulu düz liste (açılır kutu yok); seçilen kategoriye eklenir', async () => {
    const user = await openProducts();
    const menu = await openBulk(user, 'p3');
    await user.click(within(menu).getByRole('button', { name: /^Kategori/ }));
    const step = await screen.findByRole('dialog', { name: 'Toplu kategori' });
    expect(within(step).queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(await within(step).findByRole('radio', { name: 'Dokunmatik POS' }));
    await user.click(within(step).getByRole('button', { name: 'Devam' }));
    await user.click(within(step).getByRole('button', { name: 'Onaylıyorum' }));
    expect(await screen.findByText('1 ürün kategoriye eklendi.')).toBeInTheDocument();
    expect((await productService.list()).find((p) => p.id === 'p3')!.categoryIds).toContain('pos');
  });
});
