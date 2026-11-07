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
  expect(screen.getByRole('button', { name: 'Güncel kaydı yükle' })).toBeEnabled();
});

it('seçili varyant özelliği ve kayıt yoksa boş bölümü göstermez', async () => {
  const state = vi.fn();
  mockFetch({
    ['GET ' + path]: () => jsonResponse(200, { variants: [], revision: 'a'.repeat(64) }),
  });
  render(
    <VariantEditor
      cardId="7"
      attributes={attributes}
      selectedIds={[]}
      disabled={false}
      onStateChange={state}
    />,
  );
  await waitFor(() =>
    expect(state).toHaveBeenLastCalledWith(expect.objectContaining({ quantity: '0.000000' })),
  );
  expect(screen.queryByRole('heading', { name: 'Varyantlar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Varyantları kaydet' })).not.toBeInTheDocument();
});

it('normal durumda yeniden yükle düğmesi göstermez ve kayıtlı varyantları gizlemez', async () => {
  mockFetch({
    ['GET ' + path]: () => jsonResponse(200, { variants: [row], revision: 'a'.repeat(64) }),
  });
  render(
    <VariantEditor
      cardId="7"
      attributes={attributes}
      selectedIds={[]}
      disabled={false}
      onStateChange={vi.fn()}
    />,
  );
  await screen.findByLabelText('Stok kodu');
  expect(screen.getByRole('heading', { name: 'Varyantlar' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Güncel kaydı yükle' })).not.toBeInTheDocument();
});

it('tamamlanmış varyantta özellik seçimini başlıkta gösterir; fazladan seçim kutusu açmaz', async () => {
  mockFetch({
    ['GET ' + path]: () => jsonResponse(200, { variants: [row], revision: 'a'.repeat(64) }),
  });
  render(
    <VariantEditor
      cardId="7"
      attributes={attributes}
      selectedIds={['1', '2']}
      disabled={false}
      onStateChange={vi.fn()}
    />,
  );
  await screen.findByLabelText('Stok kodu');
  expect(screen.getByText('Siyah')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('textbox')).toHaveLength(4);
  expect(screen.getByRole('button', { name: 'Varyantları kaydet' })).toBeDisabled();
});

it('yalnızca eksik grubun seçimini açar; tamamlayınca dört ana alanı ve girilen bilgileri korur', async () => {
  const expanded: AttributeSnapshot = {
    ...attributes,
    groups: [
      ...attributes.groups,
      { ...emptyGroupDraft('1'), id: '20', name: 'Beden', variant: true, valueCount: 1 },
    ],
    values: [
      ...attributes.values,
      { id: '3', groupId: '20', name: 'M', code: 'm', color: null, imageUrl: null },
    ],
  };
  const post = vi.fn((init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(body.variants[0]).toEqual({ ...row, valueIds: ['1', '3'] });
    return jsonResponse(200, { variants: body.variants, revision: 'b'.repeat(64) });
  });
  mockFetch({
    ['GET ' + path]: () => jsonResponse(200, { variants: [row], revision: 'a'.repeat(64) }),
    ['POST ' + path]: post,
  });
  const user = userEvent.setup();
  render(
    <VariantEditor
      cardId="7"
      attributes={expanded}
      selectedIds={['1', '2', '3']}
      disabled={false}
      onStateChange={vi.fn()}
    />,
  );
  const selector = await screen.findByRole('combobox', { name: 'Beden' });
  expect(screen.queryByRole('combobox', { name: 'Renk' })).not.toBeInTheDocument();
  await user.click(selector);
  await user.click(await screen.findByRole('option', { name: 'M' }));
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Stok kodu')).toHaveValue('A');
  expect(screen.getByLabelText('Barkod')).toHaveValue('001');
  expect(screen.getByLabelText('Fiyat')).toHaveValue('10');
  expect(screen.getByLabelText('Stok miktarı')).toHaveValue('5');
  await user.click(screen.getByRole('button', { name: 'Varyantları kaydet' }));
  await screen.findByText('Varyantlar kaydedildi.');
  expect(post).toHaveBeenCalledTimes(1);
});
