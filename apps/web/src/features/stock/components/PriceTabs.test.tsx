import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriceTabs } from './PriceTabs';

describe('fiyat adı sekmeleri', () => {
  it('sabit FİYAT sekmesinin adı da çift tıklamayla düzenlenebilir', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(
      <PriceTabs
        lists={[{ value: 'fiyat', label: 'FİYAT', removable: false }]}
        activeId="fiyat"
        onSelect={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByRole('tab', { name: 'FİYAT' }));
    const input = screen.getByRole('textbox', { name: 'FİYAT fiyat adını düzenle' });
    await user.clear(input);
    await user.type(input, 'Standart{Enter}');

    expect(onRename).toHaveBeenCalledWith('fiyat', 'Standart');
    expect(screen.queryByRole('button', { name: 'FİYAT fiyat adını sil' })).not.toBeInTheDocument();
  });

  it.each(['PERAKENDE', 'TOPTAN'])(
    '%s sekmesi çift tıklamayla düzenlenir ve Enter ile kaydedilir',
    async (label) => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      render(
        <PriceTabs
          lists={[
            { value: 'fiyat', label: 'FİYAT', removable: false },
            { value: label.toLocaleLowerCase('tr'), label, removable: true },
          ]}
          activeId="fiyat"
          onSelect={() => {}}
          onAdd={() => {}}
          onRemove={() => {}}
          onRename={onRename}
        />,
      );

      await user.dblClick(screen.getByRole('tab', { name: label }));
      const input = screen.getByRole('textbox', { name: `${label} fiyat adını düzenle` });
      await user.clear(input);
      await user.type(input, `${label} YENİ{Enter}`);

      expect(onRename).toHaveBeenCalledWith(label.toLocaleLowerCase('tr'), `${label} YENİ`);
    },
  );
});
