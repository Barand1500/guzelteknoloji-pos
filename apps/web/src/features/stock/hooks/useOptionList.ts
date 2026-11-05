import { useCallback, useState } from 'react';
import type { SelectOption } from '../../../components/ui/SelectField';
import { stockService } from '../services/stock.service';
import type { OptionListKey } from '../types';

export interface OptionList {
  options: SelectOption[];
  /** Yeni seçenek ekler ve döndürür; aynı ad varsa var olanı döndürür. */
  add: (label: string) => Promise<SelectOption>;
  remove: (value: string) => void;
}

/** Kullanıcının "Yeni ekle" ile büyütüp küçültebildiği bir seçenek listesi. */
export function useOptionList(key: OptionListKey, initial: SelectOption[]): OptionList {
  const [options, setOptions] = useState(initial);

  const add = useCallback(
    async (label: string) => {
      const existing = options.find(
        (o) => o.label.toLocaleLowerCase('tr') === label.toLocaleLowerCase('tr'),
      );
      if (existing) return existing;
      const created = await stockService.addOption(key, label);
      setOptions((list) => [...list, created]);
      return created;
    },
    [key, options],
  );

  const remove = useCallback(
    (value: string) => {
      void stockService.removeOption(key, value);
      setOptions((list) => list.filter((o) => o.value !== value));
    },
    [key],
  );

  return { options, add, remove };
}
