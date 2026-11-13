import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmsTemplatesPanel } from './SmsTemplatesPanel';
import { jsonResponse, mockFetch } from '../../test/utils';
import * as exports from '../ecommerce-settings/export';

vi.mock('./workspace-context', () => ({
  useWorkspace: () => ({ demo: false, can: () => true }),
  useWorkspacePermission: () => true,
}));
afterEach(() => vi.restoreAllMocks());
const template = { id: 's1', name: 'Hazırlanıyor', text: 'Siparişiniz hazırlanıyor.' };
describe('SMS şablon listesi', () => {
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
