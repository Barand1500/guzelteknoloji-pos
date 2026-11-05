import { useCallback, useRef, useState } from 'react';
import { stockErrorMessage, type StockService } from '../services/stock.service';
import { stockDraftSchema, stockValidationMessage } from '@gt/shared';
import {
  createEmptyDraft,
  createUnitRow,
  rebaseUnits,
  validateRequired,
  type DraftErrors,
} from '../stock.rules';
import type { StockCardDraft, StockLookups, UnitRow } from '../types';
import { useOptionList } from './useOptionList';

/**
 * Stok kartı düzenleyicisinin TÜM durumu ve işlemleri tek yerde. Masaüstü ve telefon düzenleri
 * yalnızca görünümdür; ikisi de aynı `editor` nesnesini kullanır (veri mantığı tekrarlanmaz).
 */
export function useStockEditor(lookups: StockLookups, service: StockService) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const onError = useCallback((error: unknown) => setSaveError(stockErrorMessage(error)), []);
  const stockTypes = useOptionList('stockTypes', lookups.stockTypes, service, onError);
  const vatDepartments = useOptionList('vatDepartments', lookups.vatDepartments, service, onError);
  const stockKinds = useOptionList('stockKinds', lookups.stockKinds, service, onError);
  const units = useOptionList('units', lookups.units, service, onError);
  const priceLists = useOptionList('priceLists', lookups.priceLists, service, onError);
  const request = useRef<{ body: string; id: string } | null>(null);
  const saveLock = useRef(false);

  const firstListId = priceLists.options[0]?.value ?? 'fiyat';
  const [draft, setDraft] = useState<StockCardDraft>(() => createEmptyDraft(firstListId));
  const [activeList, selectList] = useState(firstListId);
  const setActiveList = (id: string) => {
    setDraft((d) =>
      d.units[id] ? d : { ...d, units: { ...d.units, [id]: [createUnitRow(true)] } },
    );
    selectList(id);
  };
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---- Temel alanlar ---------------------------------------------------------------
  const set = <K extends keyof StockCardDraft>(key: K, value: StockCardDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ---- Birim satırları (aktif fiyat listesi) -----------------------------------------
  const rows = draft.units[activeList] ?? [];
  const setRows = (listId: string, next: UnitRow[]) =>
    setDraft((d) => ({ ...d, units: { ...d.units, [listId]: next } }));

  const updateRow = (rowId: string, patch: Partial<UnitRow>) => {
    if (patch.isMain === true) {
      const next = rebaseUnits(rows, rowId);
      if (!next) {
        setSaveError(
          'Ana birimi değiştirmeden önce tüm çarpanları girin. Çarpanlar 6 ondalık basamakla gösterilebilmeli.',
        );
        return;
      }
      setRows(activeList, next);
      return;
    }
    setRows(
      activeList,
      rows.map((r) => {
        if (r.id === rowId)
          return {
            ...r,
            ...patch,
            ...(r.isMain && patch.isMain === false ? { isMain: true } : {}),
            ...(r.isDefault && patch.isDefault === false ? { isDefault: true } : {}),
          };
        // Ana ve varsayılan birimden yalnızca biri olabilir.
        return {
          ...r,
          isMain: patch.isMain === true ? false : r.isMain,
          isDefault: patch.isDefault === true ? false : r.isDefault,
        };
      }),
    );
  };
  const addRow = () =>
    setRows(activeList, [...rows, createUnitRow(false, units.options[0]?.value)]);
  const removeRow = (rowId: string) => {
    const left = rows.filter((r) => r.id !== rowId);
    // Silinen satır ana/varsayılan idiyse bu işaret ilk satıra geçer.
    const needMain = !left.some((r) => r.isMain);
    const needDefault = !left.some((r) => r.isDefault);
    const rebased = needMain ? rebaseUnits(left, left[0]?.id ?? '') : left;
    if (!rebased) {
      setSaveError('Ana birimi silmeden önce kalan birimlerin çarpanlarını girin.');
      return;
    }
    setRows(
      activeList,
      rebased.map((r, i) =>
        i === 0
          ? {
              ...r,
              isMain: r.isMain || needMain,
              isDefault: r.isDefault || needDefault,
            }
          : r,
      ),
    );
  };

  // ---- Fiyat adları --------------------------------------------------------------------
  const addPriceList = async (label: string) => {
    try {
      const created = await priceLists.add(label);
      setDraft((d) =>
        d.units[created.value]
          ? d
          : { ...d, units: { ...d.units, [created.value]: [createUnitRow(true)] } },
      );
      setActiveList(created.value);
    } catch {
      /* Liste hatası onError ile ekranda gösterilir. */
    }
  };
  const removePriceList = async (id: string) => {
    if (!(await priceLists.remove(id))) return;
    setDraft((d) => ({
      ...d,
      units: Object.fromEntries(Object.entries(d.units).filter(([key]) => key !== id)),
    }));
    if (activeList === id) setActiveList(firstListId);
  };

  // ---- Kayıt ----------------------------------------------------------------------------
  /** Eksik zorunlu alan varsa `onInvalid` çağrılır (ör. ilk sekmeye dön); yoksa kaydeder. */
  const save = async (onInvalid?: () => void) => {
    if (saveLock.current) return;
    if ([stockTypes, vatDepartments, stockKinds, units, priceLists].some((list) => list.busy)) {
      setSaveError('Seçenek işlemi sürüyor. Tamamlanınca tekrar kaydedin.');
      return;
    }
    setSaveError(null);
    const found = validateRequired(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      onInvalid?.();
      return;
    }
    const parsed = stockDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setSaveError(stockValidationMessage(parsed.error));
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      const body = JSON.stringify(parsed.data);
      if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() };
      await service.save(parsed.data, request.current.id);
      setSaved(true);
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  const startOver = () => {
    setDraft(createEmptyDraft(firstListId));
    setActiveList(firstListId);
    setSaved(false);
    setSaveError(null);
    request.current = null;
  };

  return {
    lookups,
    lists: { stockTypes, vatDepartments, stockKinds, units, priceLists },
    draft,
    set,
    errors,
    activeList,
    setActiveList,
    activeListLabel: priceLists.options.find((o) => o.value === activeList)?.label ?? '',
    rows,
    updateRow,
    addRow,
    removeRow,
    addPriceList,
    removePriceList,
    saving,
    saveError,
    saved,
    save,
    startOver,
  };
}

export type StockEditor = ReturnType<typeof useStockEditor>;
