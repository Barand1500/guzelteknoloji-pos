import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmsTemplatesPanel } from './SmsTemplatesPanel';
import { jsonResponse, mockFetch } from '../../test/utils';
import * as exports from '../ecommerce-settings/export';

const workspace = vi.hoisted(() => ({ demo: false }));
vi.mock('./workspace-context', () => ({
  useWorkspace: () => ({ demo: workspace.demo, can: () => true }),
  useWorkspacePermission: () => true,
}));
afterEach(() => {
  vi.restoreAllMocks();
  workspace.demo = false;
});
const template = { id: 's1', name: 'Hazırlanıyor', text: 'Siparişiniz hazırlanıyor.' };
describe('SMS şablon listesi', () => {
  it('iade tutarı yalnızca iade ve değişim olaylarında kullanılabilir', async () => {
    mockFetch({
      'GET /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(200, {
          values: {
            sablonlar: JSON.stringify([
              { ...template, text: '#iadetutari#', event: 'order.created' },
            ]),
          },
        }),
      'GET /api/site/sablon-degiskenleri': () =>
        jsonResponse(200, [
          {
            id: 'v1',
            name: 'İade',
            type: 'Sms',
            module: 'Siparişler',
            fields: [{ column: 'iade.iadeTutari', code: '#ozeliade#' }],
          },
        ]),
      'POST /api/hesap/ayarlar/site_sms_sablonlari': () => jsonResponse(200, {}),
    });
    const user = userEvent.setup();
    render(<SmsTemplatesPanel />);
    await user.click(await screen.findByRole('button', { name: 'Hazırlanıyor şablonunu düzenle' }));
    const dialog = screen.getByRole('dialog', { name: 'Şablon Düzenle' });
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeDisabled();
    expect(
      within(dialog).queryByRole('button', { name: /#iadetutari#|#ozeliade#/ }),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('combobox', { name: 'Gönderim Olayı' }));
    await user.click(screen.getByRole('option', { name: 'İade Kabul Edildi' }));
    expect(within(dialog).getByRole('button', { name: /#iadetutari#/ })).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: /#ozeliade#/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('eski olaysız şablonun bilinmeyen değişkenini ve ek alanlarını korur', async () => {
    const fetch = mockFetch({
      'GET /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(200, {
          values: {
            sablonlar: JSON.stringify([
              { ...template, text: '#legacy#', extra: { preserved: true } },
            ]),
          },
        }),
      'GET /api/site/sablon-degiskenleri': () => jsonResponse(200, []),
      'POST /api/hesap/ayarlar/site_sms_sablonlari': () => jsonResponse(200, {}),
    });
    const user = userEvent.setup();
    render(<SmsTemplatesPanel />);
    await user.click(await screen.findByRole('button', { name: 'Hazırlanıyor şablonunu düzenle' }));
    const dialog = screen.getByRole('dialog', { name: 'Şablon Düzenle' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Gönderim Olayı' }));
    await user.click(screen.getByRole('option', { name: 'Hazırlanıyor' }));
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeDisabled();
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Çözümlenemeyen değişkenler: #legacy#',
    );
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    await user.click(within(dialog).getByRole('combobox', { name: 'Gönderim Olayı' }));
    await user.click(screen.getByRole('option', { name: 'Otomatik gönderim kapalı' }));
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const call = fetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(JSON.parse(String(call?.[1]?.body)).values.sablonlar)[0]).toMatchObject({
      text: '#legacy#',
      event: '',
      extra: { preserved: true },
    });
  });
  it('e-posta şablonunda 20 bin karakter üzerindeki içeriği kaydeder', async () => {
    workspace.demo = true;
    const fetch = mockFetch({});
    const user = userEvent.setup();
    render(<SmsTemplatesPanel channel="email" />);
    await user.click(await screen.findByRole('button', { name: 'Ekle' }));
    const dialog = screen.getByRole('dialog', { name: 'Şablon Ekle' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Şablon' }));
    await user.click(screen.getByRole('option', { name: 'Hazırlanıyor' }));
    fireEvent.change(within(dialog).getByLabelText('Konu'), { target: { value: 'Uzun e-posta' } });
    fireEvent.change(within(dialog).getByLabelText('İçerik'), {
      target: { value: 'a'.repeat(21000) },
    });
    expect(within(dialog).getByLabelText('İçerik')).toHaveAttribute('maxlength', '64000');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Şablonlar deneme listesinde güncellendi; sunucuya kaydedilmedi.');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('gönderim geçmişini yalnızca düğmeye tıklanınca yükler', async () => {
    const fetch = mockFetch({
      'GET /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(200, { values: { sablonlar: '[]' } }),
      'GET /api/hesap/sablon-gonderimleri': () =>
        jsonResponse(200, [
          {
            id: 'd1',
            event: 'order.created',
            channel: 'sms',
            status: 'sent',
            createdAt: '2026-11-13T10:00:00Z',
            sentAt: null,
          },
        ]),
    });
    render(<SmsTemplatesPanel />);
    await screen.findByText('Henüz şablon yok. Ekle ile şablon oluşturabilirsiniz.');
    expect(fetch.mock.calls.some(([url]) => String(url).includes('sablon-gonderimleri'))).toBe(
      false,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Gönderim Geçmişi' }));
    await screen.findByText('Gönderildi');
    expect(
      fetch.mock.calls.some(([url]) => String(url).endsWith('sablon-gonderimleri?kanal=sms')),
    ).toBe(true);
  });
  it('gönderim olayını açık seçimle kaydeder ve desteklenen değişkenleri ekler', async () => {
    const fetch = mockFetch({
      'GET /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(200, { values: { sablonlar: '[]' } }),
      'GET /api/site/sablon-degiskenleri': () =>
        jsonResponse(200, [
          {
            id: 'v1',
            name: 'Sipariş',
            type: 'Sms',
            module: 'Siparişler',
            fields: [
              { column: 'siparis.siparisNo', code: '#ozelno#' },
              { column: 'secret.password', code: '#gizli#' },
            ],
          },
          {
            id: 'v2',
            name: 'Giriş',
            type: 'Sms',
            module: 'Kullanıcılar',
            fields: [{ column: 'ad', code: '#kullanici#' }],
          },
        ]),
      'POST /api/hesap/ayarlar/site_sms_sablonlari': () => jsonResponse(200, {}),
    });
    const user = userEvent.setup();
    render(<SmsTemplatesPanel />);
    await user.click(await screen.findByRole('button', { name: 'Ekle' }));
    const dialog = screen.getByRole('dialog', { name: 'Şablon Ekle' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Şablon' }));
    await user.click(screen.getByRole('option', { name: 'Hazırlanıyor' }));
    expect(within(dialog).getByRole('combobox', { name: 'Gönderim Olayı' })).toHaveTextContent(
      'Otomatik gönderim kapalı',
    );
    await user.click(within(dialog).getByRole('combobox', { name: 'Gönderim Olayı' }));
    await user.click(screen.getByRole('option', { name: 'Sipariş Alındı' }));
    await user.click(within(dialog).getByRole('button', { name: /#siparisno#/ }));
    await user.click(await within(dialog).findByRole('button', { name: /#ozelno#/ }));
    expect(within(dialog).getByLabelText('İçerik')).toHaveValue('#siparisno##ozelno#');
    expect(
      within(dialog).queryByRole('button', { name: /#gizli#|#kullanici#/ }),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const call = fetch.mock.calls.find(([, init]) => init?.method === 'POST');
    const payload = JSON.parse(String(call?.[1]?.body));
    expect(JSON.parse(payload.values.sablonlar)[0]).toMatchObject({
      event: 'order.created',
      text: '#siparisno##ozelno#',
    });
  });
  it.each(['sms', 'email'] as const)(
    'test kullanıcısı %s şablonu ekleyip deneyebilir, sunucuya yazılmaz',
    async (channel) => {
      workspace.demo = true;
      const fetch = mockFetch({});
      const user = userEvent.setup();
      render(<SmsTemplatesPanel channel={channel} />);
      await user.click(await screen.findByRole('button', { name: 'Ekle' }));
      const dialog = await screen.findByRole('dialog', { name: 'Şablon Ekle' });
      await user.click(within(dialog).getByRole('combobox', { name: 'Şablon' }));
      await user.click(screen.getByRole('option', { name: 'Hazırlanıyor' }));
      if (channel === 'email')
        await user.type(within(dialog).getByLabelText('Konu'), 'Siparişiniz hazırlanıyor');
      await user.type(within(dialog).getByLabelText('İçerik'), 'Deneme içeriği');
      await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
      await screen.findByText('Şablonlar deneme listesinde güncellendi; sunucuya kaydedilmedi.');
      expect(screen.getByText('Hazırlanıyor')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('kayıtları arar ve filtrelenen kayıtları CSV olarak dışa aktarır', async () => {
    const download = vi.spyOn(exports, 'downloadCsv').mockImplementation(() => undefined);
    mockFetch({
      'GET /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(200, {
          values: {
            sablonlar: JSON.stringify([
              template,
              { id: 's2', name: 'Fiyat Alarmı', text: 'Fiyat düştü.' },
            ]),
          },
        }),
    });
    render(<SmsTemplatesPanel />);
    await screen.findByText('Hazırlanıyor');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Şablon ara' }), 'fiyat');
    expect(screen.queryByText('Hazırlanıyor')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dışa Aktar' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /CSV.*indir/i }));
    expect(download).toHaveBeenCalledWith('sms-sablonlari.csv', [
      ['Şablon Adı', 'İçerik'],
      ['Fiyat Alarmı', 'Fiyat düştü.'],
    ]);
  });
  it('düzenleme kaydı başarısız olursa pencereyi ve yazılan metni korur', async () => {
    const fetch = mockFetch({
      'GET /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(200, { values: { sablonlar: JSON.stringify([template]) } }),
      'POST /api/hesap/ayarlar/site_sms_sablonlari': () =>
        jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Kayıt başarısız.' } }),
    });
    render(<SmsTemplatesPanel />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Hazırlanıyor şablonunu düzenle' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Şablon Düzenle' });
    await userEvent.clear(within(dialog).getByLabelText('İçerik'));
    await userEvent.type(within(dialog).getByLabelText('İçerik'), 'Yeni mesaj');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await within(dialog).findByText('Kayıt başarısız.');
    expect(within(dialog).getByLabelText('İçerik')).toHaveValue('Yeni mesaj');
    await waitFor(() =>
      expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true),
    );
  });
});
