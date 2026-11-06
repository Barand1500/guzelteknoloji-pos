import { useCallback, useRef, useState } from 'react';
import { stockErrorMessage, type StockService } from '../services/stock.service';
import { stockDraftSchema, stockValidationMessage } from '@gt/shared';
import {
  createEmptyDraft,
  createUnitRow,
  syncUnits,
  rebaseUnits,
  validateRequired,
  type DraftErrors,
} from '../stock.rules';
import {
  emptyExtras,
  type StockCardDraft,
  type StockExtraOptions,
  type StockExtras,
  type StockLookups,
  type UnitRow,
} from '../types';
import { useOptionList } from './useOptionList';

/**
 * Stok kartı düzenleyicisinin TÜM durumu ve işlemleri tek yerde. Masaüstü ve telefon düzenleri
 * yalnızca görünümdür; ikisi de aynı `editor` nesnesini kullanır (veri mantığı tekrarlanmaz).
 */
export interface StockEditorOptions {
  /** Dolu başlangıç kartı (düzenleme ya da kopya); yoksa boş kart. */
  initialDraft?: StockCardDraft;
  /** Verilirse kayıt, yeni kart eklemek yerine bu kartı günceller. */
  cardId?: string;
  /** Kayıtlı (ya da kopyalanan) kartın kategori ve fırsat seçimleri. */
  initialExtras?: StockExtras;
  /** Kategori/fırsat seçenekleri; `null` ise bu kutular sunucuya bağlı değildir (kilitli). */
  extraOptions?: StockExtraOptions | null;
}

export function useStockEditor(
  lookups: StockLookups,
  service: StockService,
  options: StockEditorOptions = {},
) {
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
  const [initialDraft] = useState<StockCardDraft>(() => {
    const start = options.initialDraft ?? createEmptyDraft(firstListId);
    // Aktif fiyat listesinin birim satırı yoksa (eski kart) boş bir ana birim eklenir.
    const base = start.units[firstListId]
      ? start
      : { ...start, units: { ...start.units, [firstListId]: [] } };
    // Birim/barkod ortaktır: sunucudan gelen kartın listeleri aynı yapıya getirilir.
    return {
      ...base,
      units: syncUnits(
        base.units,
        start.units[firstListId] ? firstListId : Object.keys(start.units)[0]!,
        'index',
      ),
    };
  });
  const [draft, setDraft] = useState<StockCardDraft>(initialDraft);
  const [activeList, selectList] = useState(firstListId);
  const setActiveList = (id: string) => {
    // Yeni açılan listenin birim yapısı ortak yapıdan gelir; yalnızca fiyatları boştur.
    setDraft((d) =>
      d.units[id] ? d : { ...d, units: syncUnits({ ...d.units, [id]: [] }, firstListId) },
    );
    selectList(id);
  };
  const [initialExtras] = useState<StockExtras>(() => options.initialExtras ?? emptyExtras());
  const [extras, setExtras] = useState<StockExtras>(initialExtras);
  // Kaydedilmemiş değişiklik var mı: başka ürüne geçerken uyarmak için (kayıttan sonra sıfırlanır).
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify({ draft: initialDraft, extras: initialExtras }),
  );
  const extraOptions = options.extraOptions ?? null;
  const toggleExtra = (key: keyof StockExtras, id: string) =>
    setExtras((e) => ({
      ...e,
      [key]: e[key].includes(id) ? e[key].filter((x) => x !== id) : [...e[key], id],
    }));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ---- Temel alanlar ---------------------------------------------------------------
  const set = <K extends keyof StockCardDraft>(key: K, value: StockCardDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ---- Birim satırları (aktif fiyat listesi) -----------------------------------------
  const rows = draft.units[activeList] ?? [];
  // Birim yapısı ortaktır: bir listede yapılan değişiklik diğer listelere de yansır (fiyatlar hariç).
  const setRows = (listId: string, next: UnitRow[]) =>
    setDraft((d) => ({ ...d, units: syncUnits({ ...d.units, [listId]: next }, listId) }));

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
          : { ...d, units: syncUnits({ ...d.units, [created.value]: [] }, firstListId) },
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
      const sent = extraOptions ? extras : undefined;
      const body = JSON.stringify({ draft: parsed.data, extras: sent });
      if (request.current?.body !== body) request.current = { body, id: crypto.randomUUID() };
      // Kutular kilitliyse (sunucuya bağlı değilse) ek bilgi gönderilmez.
      const result = options.cardId
        ? await service.update(options.cardId, parsed.data, request.current.id, sent)
        : await service.save(parsed.data, request.current.id, sent);
      setBaseline(JSON.stringify({ draft, extras }));
      setSavedId(result.id);
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
    setExtras(emptyExtras());
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
    extras,
    extraOptions,
    toggleCategory: (id: string) => toggleExtra('categoryIds', id),
    toggleDeal: (id: string) => toggleExtra('dealIds', id),
    dirty: JSON.stringify({ draft, extras }) !== baseline,
    saved,
    savedId,
    keepEditing: () => setSaved(false),
    save,
    startOver,
  };
}

export type StockEditor = ReturnType<typeof useStockEditor>;
