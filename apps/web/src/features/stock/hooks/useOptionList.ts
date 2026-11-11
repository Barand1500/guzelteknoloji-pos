import { useCallback, useState } from 'react';
import type { SelectOption } from '../../../components/ui/SelectField';
import type { StockService } from '../services/stock.service';
import type { OptionListKey } from '../types';

export interface OptionList {
  busy: boolean;
  options: SelectOption[];
  /** Yeni seçenek ekler ve döndürür; aynı ad varsa var olanı döndürür. */
  add: (label: string) => Promise<SelectOption>;
  remove: (value: string) => Promise<boolean>;
  rename: (value: string, label: string) => Promise<boolean>;
}

/** Kullanıcının "Yeni ekle" ile büyütüp küçültebildiği bir seçenek listesi. */
export function useOptionList(
  key: OptionListKey,
  initial: SelectOption[],
  service: StockService,
  onError: (error: unknown) => void,
): OptionList {
  const [options, setOptions] = useState(initial);
  const [pending, setPending] = useState(0);

  const add = useCallback(
    async (label: string) => {
      const existing = options.find(
        (o) => o.label.toLocaleLowerCase('tr') === label.toLocaleLowerCase('tr'),
      );
      if (existing) return existing;
      setPending((n) => n + 1);
      try {
        const created = await service.addOption(key, label);
        setOptions((list) =>
          list.some((o) => o.value === created.value) ? list : [...list, created],
        );
        return created;
      } catch (error) {
        onError(error);
        throw error;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [key, options, service, onError],
  );

  const remove = useCallback(
    async (value: string) => {
      setPending((n) => n + 1);
      try {
        await service.removeOption(key, value);
        setOptions((list) => list.filter((o) => o.value !== value));
        return true;
      } catch (error) {
        onError(error);
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [key, service, onError],
  );

  const rename = useCallback(
    async (value: string, label: string) => {
      const clean = label.trim();
      if (
        !clean ||
        options.some(
          (o) =>
            o.value !== value && o.label.toLocaleLowerCase('tr') === clean.toLocaleLowerCase('tr'),
        )
      )
        return false;
      setPending((n) => n + 1);
      try {
        const updated = await service.renameOption(key, value, clean);
        setOptions((list) => list.map((o) => (o.value === value ? updated : o)));
        return true;
      } catch (error) {
        onError(error);
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [key, onError, options, service],
  );

  return { options, add, remove, rename, busy: pending > 0 };
}
