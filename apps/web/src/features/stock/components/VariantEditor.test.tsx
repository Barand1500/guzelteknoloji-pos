import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '../../../test/utils';
import type { AttributeSnapshot } from '../../attributes/services/attribute.demo';
import { emptyGroupDraft } from '../../attributes/types';
import { VariantEditor } from './VariantEditor';

const attributes: AttributeSnapshot = {
  templates: [],
  groups: [{ ...emptyGroupDraft('1'), id: '10', name: 'Renk', variant: true, valueCount: 2 }],
  values: ['Siyah', 'Beyaz'].map((name, i) => ({
    id: String(i + 1),
    groupId: '10',
    name,
    code: name,
    color: null,
    imageUrl: null,
  })),
};
const row = { code: 'A', barcode: '001', price: '10', quantity: '5', valueIds: ['1'] };
const path = '/api/stok/kartlar/7/varyantlar';
afterEach(() => vi.unstubAllGlobals());

it('virgüllü fiyat ve eksi miktar gönderir; başarılı kayıtta değişiklik işaretini kaldırır', async () => {
  const state = vi.fn();
  const post = vi.fn((init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(body.revision).toBe('a'.repeat(64));
    expect(body.variants[0]).toMatchObject({ price: '12,50', quantity: '-2,5' });
    return jsonResponse(200, {
      variants: [{ ...row, price: '12.5', quantity: '-2.5' }],
      revision: 'b'.repeat(64),
    });
  });
  mockFetch({
    ['GET ' + path]: () => jsonResponse(200, { variants: [row], revision: 'a'.repeat(64) }),
    ['POST ' + path]: post,
  });
  const user = userEvent.setup();
  render(
    <VariantEditor
      cardId="7"
      attributes={attributes}
      selectedIds={['1', '2']}
      disabled={false}
      onStateChange={state}
    />,
  );
  const price = await screen.findByLabelText('Fiyat');
  await waitFor(() => expect(price).toBeEnabled());
  await user.clear(price);
  await user.type(price, '12,50');
  const quantity = screen.getByLabelText('Stok miktarı');
  await user.clear(quantity);
  await user.type(quantity, '-2,5');
  expect(state).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: true }));
  await user.click(screen.getByRole('button', { name: 'Varyantları kaydet' }));
  await screen.findByText('Varyantlar kaydedildi.');
  expect(state).toHaveBeenLastCalledWith(
    expect.objectContaining({ dirty: false, quantity: '-2.500000' }),
  );
});

it('ana kart kaydedilince girilen varyant fiyatını korur ve yeni özellik sürümünü kullanır', async () => {
  let revision = 'a'.repeat(64);
  const fetch = mockFetch({
    ['GET ' + path]: () => jsonResponse(200, { variants: [row], revision }),
    ['POST ' + path]: () =>
      jsonResponse(409, { error: { code: 'CONFLICT', message: 'Kayıt değişti.' } }),
  });
  const state = vi.fn();
  const props = { cardId: '7', attributes, selectedIds: ['1', '2'], onStateChange: state };
  const view = render(<VariantEditor {...props} disabled={false} />);
  const user = userEvent.setup();
  const price = await screen.findByLabelText('Fiyat');
  await waitFor(() => expect(price).toBeEnabled());
  await user.clear(price);
  await user.type(price, '25');
  view.rerender(<VariantEditor {...props} disabled />);
  revision = 'b'.repeat(64);
  view.rerender(<VariantEditor {...props} disabled={false} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Varyantları kaydet' })).toBeEnabled(),
  );
  expect(price).toHaveValue('25');
  await user.click(screen.getByRole('button', { name: 'Varyantları kaydet' }));
  await screen.findByText('Kayıt değişti.');
  const posted = fetch.mock.calls.find(([, init]) => init?.method === 'POST')!;
  expect(JSON.parse(String(posted[1]?.body))).toMatchObject({
    revision,
    variants: [{ price: '25' }],
  });
  expect(price).toHaveValue('25');
  expect(state).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: true }));
});

it('ilk yükleme hatasında yeniden yüklemeyi kilitlemez', async () => {
  mockFetch({
    ['GET ' + path]: () =>
      jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Hata' } }),
  });
  render(
    <VariantEditor
      cardId="7"
      attributes={attributes}
      selectedIds={['1']}
      disabled={false}
      onStateChange={vi.fn()}
    />,
  );
  await screen.findByText('Hata');
  expect(screen.getByRole('button', { name: 'Sunucudaki kaydı yeniden yükle' })).toBeEnabled();
});
