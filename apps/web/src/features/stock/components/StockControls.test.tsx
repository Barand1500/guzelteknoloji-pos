import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceBlock } from './PriceBlock';
import { BarcodeEditor } from './BarcodeEditor';
import { MultiSelectField } from '../../../components/ui/MultiSelectField';
import { createUnitRow } from '../stock.rules';
import type { BarcodeEntry } from '../types';

describe('ürün giriş kontrolleri', () => {
  it('iskontoda Enter toplamı yazar; KDV seçimi mevcut özetin karşılığını hesaplar', async () => {
    function Form() {
      const [data, setData] = useState({
        ...createUnitRow(true).sale,
        amount: '100',
        vatRate: '20',
      });
      return (
        <PriceBlock
          title="Satış"
          data={data}
          lookups={{
            currencies: [{ value: 'TRY', label: 'TRY' }],
            vatRates: [{ value: '20', label: '%20' }],
          }}
          onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
        />
      );
    }
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText('İskonto %'), '20+20{Enter}');
    expect(screen.getByLabelText('İskonto %')).toHaveValue('36');
    expect(screen.getByText(/KDV Dahil:/)).toHaveTextContent('76,80');
    await user.click(screen.getByRole('radio', { name: 'Dahil' }));
    expect(screen.getByText(/KDV Dahil:/)).toHaveTextContent('64,00');
  });
  it('barkodu ikinci kez eklemez; listeyi yalnızca göz penceresinde gösterir ve siler', async () => {
    function Form() {
      const [barcodes, setBarcodes] = useState<BarcodeEntry[]>([]);
      return (
        <BarcodeEditor
          barcodes={barcodes}
          types={[{ value: 'EAN13', label: 'EAN13' }]}
          onChange={setBarcodes}
        />
      );
    }
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText('Barkod'), '001234{Enter}');
    const eye = await screen.findByRole('button', { name: 'Barkodları görüntüle (1)' });
    expect(eye.closest('.field')).toContainElement(screen.getByLabelText('Barkod'));
    expect(screen.queryByRole('list', { name: 'Eklenen barkodlar' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Barkod'), '001234{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('zaten eklenmiş');
    await user.click(eye);
    const modal = screen.getByRole('dialog', { name: 'Barkodlar' });
    expect(within(modal).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(modal).getByRole('button', { name: '001234 barkodunu sil' }));
    expect(within(modal).getByText('Eklenen barkod yok.')).toBeVisible();
  });
  it('alt kategoriyi üst kategorinin akordiyonunda ve aramada tam yoluyla gösterir', async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectField
        label="Kategori"
        value={[]}
        onChange={() => {}}
        options={[
          { id: '1', name: 'Giyim' },
          { id: '2', name: 'Gömlek', parentId: '1' },
        ]}
      />,
    );
    await user.click(screen.getByLabelText('Kategori'));
    expect(screen.queryByRole('checkbox', { name: 'Gömlek' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Giyim alt kategorileri' }));
    expect(screen.getByRole('checkbox', { name: 'Gömlek' })).toBeVisible();
    await user.type(screen.getByLabelText('Kategori içinde ara'), 'Gömlek');
    expect(screen.getByRole('checkbox', { name: /Giyim › Gömlek/ })).toBeVisible();
  });
  it('pasif üst kategorinin alt dallarını da pasif gösterir; durum değişince görünümü yeniler', async () => {
    const user = userEvent.setup();
    const options = [
      { id: '1', name: 'Giyim', active: false },
      { id: '2', name: 'Gömlek', parentId: '1', active: true },
    ];
    const { rerender } = render(
      <MultiSelectField label="Kategori" value={[]} onChange={() => {}} options={options} />,
    );
    await user.click(screen.getByLabelText('Kategori'));
    await user.click(screen.getByRole('button', { name: 'Giyim alt kategorileri' }));
    const child = screen.getByRole('checkbox', { name: 'Gömlek' });
    expect(within(child).getByText('Pasif')).toBeVisible();
    expect(child).not.toBeDisabled();
    rerender(
      <MultiSelectField
        label="Kategori"
        value={[]}
        onChange={() => {}}
        options={[{ ...options[0]!, active: true }, options[1]!]}
      />,
    );
    expect(within(child).queryByText('Pasif')).not.toBeInTheDocument();
    rerender(
      <MultiSelectField
        label="Kategori"
        value={[]}
        onChange={() => {}}
        options={[
          { ...options[0]!, active: true },
          { ...options[1]!, active: false },
        ]}
      />,
    );
    expect(within(child).getByText('Pasif')).toBeVisible();
  });
});
