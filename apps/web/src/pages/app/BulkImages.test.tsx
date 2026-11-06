import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProductService as productService } from '../../features/products/services/product.demo';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const jpg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

async function openBulk(options: { applyAccept?: boolean } = {}) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup({ applyAccept: options.applyAccept ?? true });
  renderApp('/uygulama/urunler/toplu-gorsel');
  await screen.findByLabelText('Görsel dosyaları seç');
  return user;
}

/** "Eşleştir" dosyalar okunup ürün listesi yüklenince açılır; açılmasını bekleyip tıklar. */
async function clickMatch(user: ReturnType<typeof userEvent.setup>) {
  const button = screen.getByRole('button', { name: 'Eşleştir' });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

beforeEach(() => productService.reset());
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

/** Ürün seçili 3 görsel (2'si FP-503, 1'i barkodla FP-505) + 1 eşleşmeyen yükler ve eşleştirir. */
async function uploadAndMatch(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText('Görsel dosyaları seç'), [
    jpg('FLEXYPOS.FP-503.jpg'),
    jpg('FLEXYPOS.FP-503_2.jpg'),
    jpg('8690000000028.jpg'), // p2'nin barkodu
    jpg('bilinmeyen.jpg'),
  ]);
  await screen.findByText('4 görsel seçildi');
  await clickMatch(user);
}

describe('Toplu Görsel Yükleme', () => {
  it('Ürünler sayfasından Fırsatlar yanındaki kısayolla açılır; yol çubuğu geri döner', async () => {
    sessionStorage.setItem('gt-dev-access', '1');
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp('/uygulama/urunler');
    await user.click(await screen.findByRole('link', { name: 'Toplu Görsel' }));
    expect(await screen.findByLabelText('Görsel dosyaları seç')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Toplu Görsel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ürünler sayfasına dön' })).toBeInTheDocument();
  });

  it('dosya seçilmeden Eşleştir kapalıdır; adlandırma kuralı yazılıdır', async () => {
    await openBulk();
    expect(screen.getByRole('button', { name: 'Eşleştir' })).toBeDisabled();
    expect(screen.getByText(/FLEXYPOS.FP-503_2.jpg/)).toBeInTheDocument();
  });

  it('kod ve barkodla eşler, sırayı ve vitrini gösterir, eşleşmeyeni ayırır', async () => {
    const user = await openBulk();
    await uploadAndMatch(user);

    const summary = await screen.findByLabelText('Özet');
    expect(within(summary).getByText('2 ürün eşleşti')).toBeInTheDocument();
    expect(within(summary).getByText('3 görsel')).toBeInTheDocument();
    expect(within(summary).getByText('1 eşleşmeyen')).toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Eşleşen ürünler' });
    const first = within(list).getAllByRole('listitem', { name: '' })[0]!;
    expect(within(first).getByText(/FLEXYPOS FP-503 İ3/)).toBeInTheDocument();
    expect(within(first).getByText('Vitrin')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Eşleşmeyen dosyalar' })).toHaveTextContent(
      'bilinmeyen.jpg',
    );
  });

  it('eşleşmeyen dosyaya ürün seçilince o ürüne eklenir ve yüklenince ürünlere yazılır (sona eklenir)', async () => {
    const user = await openBulk();
    await uploadAndMatch(user);

    await user.click(screen.getByRole('combobox', { name: 'Ürün seç' }));
    await user.click(await screen.findByRole('option', { name: /^3 · FLEXYPOS FP-503M/ }));
    const summary = await screen.findByLabelText('Özet');
    expect(within(summary).getByText('3 ürün eşleşti')).toBeInTheDocument();
    expect(within(summary).getByText('4 görsel')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Eşleşmeyen dosyalar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '4 Görseli Yükle' }));
    expect(await screen.findByText('3 ürüne 4 görsel eklendi.')).toBeInTheDocument();

    const list = await productService.list();
    expect(list.find((p) => p.id === 'p1')?.imageUrls).toHaveLength(3); // 1 mevcut + 2 yeni
    expect(list.find((p) => p.id === 'p2')?.imageUrls).toHaveLength(2);
    expect(list.find((p) => p.id === 'p3')?.imageUrls).toHaveLength(2);
    // Vitrin resmi hâlâ ürünün ilk görseli.
    expect(list.find((p) => p.id === 'p1')?.imageUrl).toBe(
      list.find((p) => p.id === 'p1')?.imageUrls[0],
    );
  });

  it('"Mevcut görselleri değiştir" açıksa ürünün eski görselleri silinir, ilk yeni resim vitrin olur', async () => {
    const user = await openBulk();
    const before = (await productService.list()).find((p) => p.id === 'p1')!;
    await uploadAndMatch(user);
    await user.click(screen.getByRole('switch', { name: 'Mevcut görselleri değiştir' }));
    expect(screen.getAllByText('1 görsel silinecek').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '3 Görseli Yükle' }));
    await screen.findByText(/ürüne 3 görsel eklendi/);

    const after = (await productService.list()).find((p) => p.id === 'p1')!;
    expect(after.imageUrls).toHaveLength(2);
    expect(after.imageUrls).not.toContain(before.imageUrls[0]);
    expect(after.imageUrl).toBe(after.imageUrls[0]);
  });

  it('eşleşen dosya ✕ ile kaldırılır; yükleme sayısı düşer', async () => {
    const user = await openBulk();
    await uploadAndMatch(user);
    await user.click(
      screen.getByRole('button', { name: 'FLEXYPOS.FP-503_2.jpg dosyasını kaldır' }),
    );
    const summary = await screen.findByLabelText('Özet');
    expect(within(summary).getByText('2 görsel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 Görseli Yükle' })).toBeEnabled();
  });

  it('desteklenmeyen biçim ve aynı adlı dosya alınmaz, nedeni söylenir', async () => {
    const user = await openBulk({ applyAccept: false });
    const input = screen.getByLabelText('Görsel dosyaları seç');
    await user.upload(input, [
      new File(['x'], 'belge.pdf', { type: 'application/pdf' }),
      jpg('KOD.jpg'),
    ]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('belge.pdf');
    expect(alert).toHaveTextContent('JPG, PNG veya WebP');
    expect(screen.getByText('1 görsel seçildi')).toBeInTheDocument();

    await user.upload(input, jpg('kod.jpg'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Aynı adlı dosya zaten seçildi.');
    expect(screen.getByText('1 görsel seçildi')).toBeInTheDocument();
  });

  it('hiçbiri eşleşmezse yükleme kapalıdır; Geri ile seçime dönülür', async () => {
    const user = await openBulk();
    await user.upload(screen.getByLabelText('Görsel dosyaları seç'), jpg('hicbiri.jpg'));
    await screen.findByText('1 görsel seçildi');
    await clickMatch(user);
    expect(await screen.findByRole('button', { name: '0 Görseli Yükle' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Geri' }));
    await waitFor(() => expect(screen.getByText('1 görsel seçildi')).toBeInTheDocument());
  });

  it('yükleme bitince Yeni Yükleme temiz başlar', async () => {
    const user = await openBulk();
    await user.upload(screen.getByLabelText('Görsel dosyaları seç'), jpg('FLEXYPOS.FP-503.jpg'));
    await screen.findByText('1 görsel seçildi');
    await clickMatch(user);
    await user.click(await screen.findByRole('button', { name: '1 Görseli Yükle' }));
    await screen.findByText('Görseller yüklendi!');
    await user.click(screen.getByRole('button', { name: 'Yeni Yükleme' }));
    expect(await screen.findByText('Görselleri buraya bırak')).toBeInTheDocument();
  });
});
