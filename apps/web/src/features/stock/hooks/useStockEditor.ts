import { useState } from 'react';
import { stockService } from '../services/stock.service';
import {
  createEmptyDraft,
  createUnitRow,
  validateRequired,
  type DraftErrors,
} from '../stock.rules';
import type { StockCardDraft, StockLookups, UnitRow } from '../types';
import { useOptionList } from './useOptionList';

/**
 * Stok kartı düzenleyicisinin TÜM durumu ve işlemleri tek yerde. Masaüstü ve telefon düzenleri
 * yalnızca görünümdür; ikisi de aynı `editor` nesnesini kullanır (veri mantığı tekrarlanmaz).
 */
export function useStockEditor(lookups: StockLookups) {
  const stockTypes = useOptionList('stockTypes', lookups.stockTypes);
  const vatDepartments = useOptionList('vatDepartments', lookups.vatDepartments);
  const stockKinds = useOptionList('stockKinds', lookups.stockKinds);
  const units = useOptionList('units', lookups.units);
  const priceLists = useOptionList('priceLists', lookups.priceLists);

  const firstListId = priceLists.options[0]?.value ?? 'fiyat';
  const [draft, setDraft] = useState<StockCardDraft>(() => createEmptyDraft(firstListId));
  const [activeList, setActiveList] = useState(firstListId);
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
    setRows(
      activeList,
      rows.map((r) => {
        if (r.id === rowId) return { ...r, ...patch };
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
    setRows(
      activeList,
      left.map((r, i) =>
        i === 0 ? { ...r, isMain: r.isMain || needMain, isDefault: r.isDefault || needDefault } : r,
      ),
    );
  };

  // ---- Fiyat adları --------------------------------------------------------------------
  const addPriceList = async (label: string) => {
    const created = await priceLists.add(label);
    setDraft((d) =>
      d.units[created.value]
        ? d
        : { ...d, units: { ...d.units, [created.value]: [createUnitRow(true)] } },
    );
    setActiveList(created.value);
  };
  const removePriceList = (id: string) => {
    priceLists.remove(id);
    setDraft((d) => ({
      ...d,
      units: Object.fromEntries(Object.entries(d.units).filter(([key]) => key !== id)),
    }));
    if (activeList === id) setActiveList(firstListId);
  };

  // ---- Kayıt ----------------------------------------------------------------------------
  /** Eksik zorunlu alan varsa `onInvalid` çağrılır (ör. ilk sekmeye dön); yoksa kaydeder. */
  const save = async (onInvalid?: () => void) => {
    const found = validateRequired(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      onInvalid?.();
      return;
    }
    setSaving(true);
    await stockService.save(draft);
    setSaving(false);
    setSaved(true);
  };

  const startOver = () => {
    setDraft(createEmptyDraft(firstListId));
    setActiveList(firstListId);
    setSaved(false);
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
    saved,
    save,
    startOver,
  };
}

export type StockEditor = ReturnType<typeof useStockEditor>;
