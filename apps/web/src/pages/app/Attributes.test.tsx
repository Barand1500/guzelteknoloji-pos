import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoAttributeService as attributeService } from '../../features/attributes/services/attribute.demo';
import { demoCategoryService as categoryService } from '../../features/categories/services/category.demo';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const ids = (label: string) =>
  within(screen.getByRole('list', { name: label }))
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-sortable-id'));

async function openAttributes(path = '/uygulama/ozellikler', list = 'Şablonlar') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('list', { name: list });
  return user;
}

beforeEach(() => {
  attributeService.reset();
  categoryService.reset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Özellikler ekranı', () => {
  it('şablonları sırayla, kategori etiketleri ve grup sayısıyla listeler', async () => {
    await openAttributes();
    expect(ids('Şablonlar')).toEqual(['t-pos', 't-kiosk', 't-el', 't-yeni-nesil', 't-fiziksel']);
    const pos = screen.getByRole('button', { name: 'Dokunmatik POS şablonunu aç' });
    expect(within(pos).getByText('5 grup')).toBeInTheDocument();
    const fiziksel = screen.getByRole('button', { name: 'Fiziksel Özellikler şablonunu aç' });
    expect(within(fiziksel).getByText('Tüm ürünler')).toBeInTheDocument();
  });

  it('şablona, sonra gruba girilir; yol çubuğu ve geri düğmesi çalışır', async () => {
    const user = await openAttributes();
    await user.click(screen.getByRole('button', { name: 'Dokunmatik POS şablonunu aç' }));
    await waitFor(() => expect(ids('Gruplar')[0]).toBe('g-os'));
    await user.click(screen.getByRole('button', { name: 'Ekran grubunu aç' }));
    await waitFor(() => expect(ids('Özellikler')).toHaveLength(4));
    const path = screen.getByRole('navigation', { name: 'Özellik yolu' });
    expect(within(path).getByRole('button', { name: 'Ekran' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: 'Bir üst seviyeye çık' }));
    await waitFor(() => expect(ids('Gruplar')[0]).toBe('g-os'));
    await user.click(within(path).getByRole('button', { name: 'Şablonlar' }));
    await waitFor(() => expect(ids('Şablonlar')[0]).toBe('t-pos'));
  });

  it('adres çubuğundaki şablon ve grup doğrudan açılır', async () => {
    await openAttributes('/uygulama/ozellikler?s=t-fiziksel&g=g-renk', 'Özellikler');
    expect(ids('Özellikler')).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Siyah özelliğini düzenle' })).toBeInTheDocument();
  });

  it('hızlı giriş: adı yazıp Enter ile özellik eklenir, aynı ad engellenir', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-os', 'Özellikler');
    const box = screen.getByRole('textbox', { name: 'Yeni özellik adı' });
    await user.type(box, 'Linux{Enter}');
    await waitFor(() => expect(ids('Özellikler')).toHaveLength(5));
    expect(box).toHaveValue('');
    expect(screen.getByText('Linux eklendi.')).toBeInTheDocument();
    const added = (await attributeService.snapshot()).values.find((v) => v.name === 'Linux');
    expect(added?.code).toBe('linux');

    await user.type(box, 'linux{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bu grupta aynı adda bir özellik zaten var.',
    );
    expect(ids('Özellikler')).toHaveLength(5);
  });

  it('özelliğe çift tıklayınca pencere açılmadan yerinde değişir; kod alanı yoktur', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-ram', 'Özellikler');
    await user.dblClick(screen.getByRole('button', { name: '4 GB özelliğini düzenle' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '4 GB özellik adı' });
    await user.clear(input);
    await user.type(input, '4 GB DDR4{Enter}');
    expect(
      await screen.findByRole('button', { name: '4 GB DDR4 özelliğini düzenle' }),
    ).toBeInTheDocument();
    const saved = (await attributeService.snapshot()).values.find((v) => v.name === '4 GB DDR4');
    expect(saved?.code).toBe('4-gb'); // kod değişmez

    // Esc vazgeçer.
    await user.dblClick(screen.getByRole('button', { name: '8 GB özelliğini düzenle' }));
    await user.type(screen.getByRole('textbox', { name: '8 GB özellik adı' }), 'X{Escape}');
    expect(screen.getByRole('button', { name: '8 GB özelliğini düzenle' })).toBeInTheDocument();
  });

  it('çöp kutusu özelliği onayla siler (kalem simgesi yoktur)', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-ram', 'Özellikler');
    await user.click(screen.getByRole('button', { name: '8 GB özelliğini sil' }));
    await user.click(await screen.findByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(ids('Özellikler')).toHaveLength(2));
  });

  it('özellik ekleme penceresinde kod alanı yoktur', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-ram', 'Özellikler');
    await user.click(screen.getAllByRole('button', { name: 'Özellik Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Özellik Ekle' });
    expect(within(dialog).queryByLabelText('Özellik Kodu')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Özellik Adı')).toBeInTheDocument();
  });

  it('resimli grupta hızlı giriş yerine resimli ekleme düğmesi çıkar', async () => {
    await openAttributes('/uygulama/ozellikler?s=t-fiziksel&g=g-kutu', 'Özellikler');
    expect(screen.queryByRole('textbox', { name: 'Yeni özellik adı' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resimli Özellik Ekle' })).toBeInTheDocument();
  });

  it('klavyeyle (Alt + ok) özellik sırası değişir', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-os', 'Özellikler');
    screen.getByRole('button', { name: 'Free DOS özelliğini düzenle' }).focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await waitFor(() => expect(ids('Özellikler').slice(0, 2)).toEqual(['g-os-2', 'g-os-1']));
  });

  it('şablon eklerken kategori ya da "Tüm ürünlerde kullan" şarttır', async () => {
    const user = await openAttributes();
    await user.click(screen.getAllByRole('button', { name: 'Şablon Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Şablon Ekle' });
    await user.type(within(dialog).getByLabelText('Şablon Adı'), 'Terazi');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByText(/En az bir kategori seçin/)).toBeInTheDocument();

    await user.click(
      await within(dialog).findByRole('checkbox', { name: 'Market Terazileri kategorisini seç' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ids('Şablonlar')).toHaveLength(6));
    const created = (await attributeService.snapshot()).templates.at(-1);
    expect(created).toMatchObject({ name: 'Terazi', categoryIds: ['terazi'], allProducts: false });
  });

  it('"Tüm ürünlerde kullan" açıkken kategori listesi gizlenir', async () => {
    const user = await openAttributes();
    await user.click(screen.getAllByRole('button', { name: 'Şablon Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Şablon Ekle' });
    await user.click(within(dialog).getByRole('switch', { name: 'Tüm Ürünlerde Kullan' }));
    expect(within(dialog).queryByRole('list', { name: 'Kategoriler' })).not.toBeInTheDocument();
  });

  it('grup formu: Renk ve Resim tek seçimdir; Resim seçilince yer seçici açılır', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos', 'Gruplar');
    await user.click(screen.getAllByRole('button', { name: 'Grup Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Grup Ekle' });
    // İçinde bulunulan şablon hazır seçili gelir.
    expect(within(dialog).getByRole('combobox', { name: /Şablon/ })).toHaveTextContent(
      'Dokunmatik POS',
    );
    expect(within(dialog).queryByRole('switch', { name: 'Renk' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Resim' }));
    await user.click(
      within(dialog).getByRole('switch', { name: 'Ürün Resminin Üzerinde Gösterilsin mi?' }),
    );
    const places = within(dialog).getByRole('radiogroup', { name: 'Rozetin yeri' });
    // 8 nokta: üstte 3, ortada solda ve sağda 1'er, altta 3.
    expect(
      within(places)
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual([
      'Üst Sol',
      'Üst Orta',
      'Üst Sağ',
      'Orta Sol',
      'Orta Sağ',
      'Alt Sol',
      'Alt Orta',
      'Alt Sağ',
    ]);
    await user.click(within(dialog).getByRole('radio', { name: 'Renk' }));
    expect(
      within(dialog).queryByRole('switch', { name: 'Ürün Resminin Üzerinde Gösterilsin mi?' }),
    ).not.toBeInTheDocument();
  });

  it('grup eklenir: boş ad engellenir, anahtarlar kaydedilir', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos', 'Gruplar');
    await user.click(screen.getAllByRole('button', { name: 'Grup Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Grup Ekle' });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByText('Grup adı gerekli.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Grup Adı'), 'Ağ');
    await user.click(within(dialog).getByRole('switch', { name: 'Mağazada Filtre Olsun mu?' }));
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(ids('Gruplar')).toHaveLength(6));
    const created = (await attributeService.snapshot()).groups.find((g) => g.name === 'Ağ');
    expect(created).toMatchObject({
      templateId: 't-pos',
      filter: true,
      multiple: false,
      kind: 'text',
    });
  });

  it('şablonu silerken uyarır ve grupları ile özellikleri de siler', async () => {
    const user = await openAttributes();
    await user.click(screen.getByRole('button', { name: 'Dokunmatik POS şablonunu sil' }));
    expect(
      await screen.findByText(/içindeki 5 grup ve tüm özellikleriyle birlikte silinecek/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(ids('Şablonlar')).not.toContain('t-pos'));
    const left = await attributeService.snapshot();
    expect(left.groups.some((g) => g.templateId === 't-pos')).toBe(false);
    expect(left.values.some((v) => v.groupId === 'g-os')).toBe(false);
  });

  it('arama tüm ağaçta çalışır: şablon, grup ve özellikler yerleriyle birlikte bulunur', async () => {
    const user = await openAttributes();
    await user.type(screen.getByRole('searchbox', { name: 'Özellik ara' }), 'siyah');
    const section = await screen.findByRole('region', { name: 'Özellikler' });
    expect(within(section).getByText('Siyah')).toBeInTheDocument();
    expect(within(section).getByText('Fiziksel Özellikler › Renk')).toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: /Siyah/ }));
    expect(await screen.findByRole('list', { name: 'Özellikler' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Özellik ara' })).toHaveValue('');
  });

  it('toplu ekleme: virgülle ayrılan her ad ayrı özellik olur; var olan atlanır', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-os', 'Özellikler');
    const box = screen.getByRole('textbox', { name: 'Yeni özellik adı' });
    await user.type(box, 'S, M, L, XL, S{Enter}');
    await waitFor(() => expect(ids('Özellikler')).toHaveLength(8));
    expect(screen.getByText('S, M, L, XL eklendi.')).toBeInTheDocument();
    await user.type(box, 'M, XXL{Enter}');
    await waitFor(() => expect(ids('Özellikler')).toHaveLength(9));
    expect(screen.getByText('XXL eklendi. 1 tanesi zaten vardı.')).toBeInTheDocument();
  });

  it('renkli grupta hazır palet: renk seçilince adı otomatik yazılır, toplu renklerde adı tanınan kendi rengini alır', async () => {
    const user = await openAttributes('/uygulama/ozellikler?s=t-fiziksel&g=g-renk', 'Özellikler');
    const box = screen.getByRole('textbox', { name: 'Yeni özellik adı' });
    await user.click(screen.getByRole('button', { name: 'Renk Turkuaz' }));
    expect(box).toHaveValue('Turkuaz');
    await user.click(screen.getByRole('button', { name: 'Renk Lacivert' }));
    expect(box).toHaveValue('Lacivert');
    await user.clear(box);
    await user.type(box, 'Pembe, Bej{Enter}');
    await waitFor(() => expect(ids('Özellikler')).toHaveLength(11));
    const values = (await attributeService.snapshot()).values;
    expect(values.find((v) => v.name === 'Pembe')?.color).toBe('#ec4899');
    expect(values.find((v) => v.name === 'Bej')?.color).toBe('#dfbfa5');
  });

  it('şablon kopyalanır: gruplar ve özellikler birlikte gelir', async () => {
    const user = await openAttributes();
    await user.click(screen.getByRole('button', { name: 'Dokunmatik POS şablonunu kopyala' }));
    expect(await screen.findByText('Dokunmatik POS (Kopya) oluşturuldu.')).toBeInTheDocument();
    const snap = await attributeService.snapshot();
    const copy = snap.templates.find((t) => t.name === 'Dokunmatik POS (Kopya)')!;
    const original = snap.templates.find((t) => t.name === 'Dokunmatik POS')!;
    const copyGroups = snap.groups.filter((g) => g.templateId === copy.id);
    expect(copyGroups.map((g) => g.name)).toEqual(
      snap.groups.filter((g) => g.templateId === original.id).map((g) => g.name),
    );
    expect(copy.categoryIds).toEqual(original.categoryIds);
    expect(snap.values.filter((v) => copyGroups.some((g) => g.id === v.groupId))).toHaveLength(
      snap.values.filter((v) =>
        snap.groups.some((g) => g.templateId === original.id && g.id === v.groupId),
      ).length,
    );
  });

  it('şablon kartında varyant önizlemesi çıkar', async () => {
    await openAttributes('/uygulama/ozellikler?s=t-fiziksel', 'Gruplar');
    expect(screen.getByText('Renk: 9 varyant')).toBeInTheDocument();
  });

  it('kullanılan özelliği silerken "Şu ürünlerden kalkacak" listesi gösterilir', async () => {
    vi.spyOn(attributeService, 'valueProducts').mockResolvedValue({
      total: 10,
      products: [{ id: 'p1', code: 'K1', name: 'Hızlı Terazi' }],
    });
    const user = await openAttributes('/uygulama/ozellikler?s=t-pos&g=g-ram', 'Özellikler');
    await user.click(screen.getByRole('button', { name: '8 GB özelliğini sil' }));
    expect(await screen.findByText('Şu ürünlerden kalkacak (10)')).toBeInTheDocument();
    expect(screen.getByText('Hızlı Terazi')).toBeInTheDocument();
    expect(screen.getByText('+9 ürün daha')).toBeInTheDocument();
  });
});
