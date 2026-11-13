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
import { emptyBrandDraft, type Brand } from '../../brands/types';
import { emptyCategoryDraft, type Category, type CategoryDraft } from '../../categories/types';
import { applyProductDefaults, type ProductDefaults } from '../stock-defaults';

/**
 * Stok kartı düzenleyicisinin TÜM durumu ve işlemleri tek yerde. Masaüstü ve telefon düzenleri
 * yalnızca görünümdür; ikisi de aynı `editor` nesnesini kullanır (veri mantığı tekrarlanmaz).
 */
export interface StockEditorOptions {
  /** Varyantlı kartlarda miktar, kaydedilen varyantlardan hesaplanır. */
  variantStock?: string;
  stayOnSave?: boolean;
  /** Dolu başlangıç kartı (düzenleme ya da kopya); yoksa boş kart. */
  initialDraft?: StockCardDraft;
  /** Verilirse kayıt, yeni kart eklemek yerine bu kartı günceller. */
  cardId?: string;
  /** Kayıtlı (ya da kopyalanan) kartın kategori ve fırsat seçimleri. */
  initialExtras?: StockExtras;
  /** Only supplied for a brand-new product; edit/copy flows retain their saved values. */
  productDefaults?: ProductDefaults;
  /** Kategori/fırsat seçenekleri; `null` ise bu kutular sunucuya bağlı değildir (kilitli). */
  extraOptions?: StockExtraOptions | null;
  /** Formdan hızlı marka/kategori ekleme; verilmezse ilgili "yeni ekle" çalışmaz. */
  quickAdd?: {
    createBrand: (draft: typeof emptyBrandDraft) => Promise<Brand>;
    createCategory: (draft: CategoryDraft) => Promise<Category>;
  };
}

export function useStockEditor(
  lookups: StockLookups,
  service: StockService,
  options: StockEditorOptions = {},
) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
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
    const start = options.initialDraft ?? applyProductDefaults(
      createEmptyDraft(firstListId),
      options.productDefaults ?? {},
      {
        stockTypes: stockTypes.options,
        units: units.options,
        currencies: lookups.currencies,
        vatRates: lookups.vatRates,
      },
    );
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
  const syncVariantQuantity = useCallback((quantity: string) => {
    setDraft((d) => ({ ...d, stockQuantity: quantity }));
    setBaseline((value) => {
      const saved = JSON.parse(value) as { draft: StockCardDraft; extras: StockExtras };
      return JSON.stringify({ ...saved, draft: { ...saved.draft, stockQuantity: quantity } });
    });
  }, []);
  // Hızlı ekleme: formdan çıkmadan yeni marka / kategori. Eklenenler listeye hemen girer.
  const quickAdd = options.quickAdd;
  const [brandList, setBrandList] = useState(lookups.brands);
  const [addedCategories, setAddedCategories] = useState<Category[]>([]);
  const baseExtraOptions = options.extraOptions ?? null;
  const extraOptions = baseExtraOptions
    ? {
        ...baseExtraOptions,
        categories: [
          ...baseExtraOptions.categories,
          ...addedCategories.filter((c) => !baseExtraOptions.categories.some((o) => o.id === c.id)),
        ],
      }
    : null;
  /** Yeni marka ekler (aynı ad varsa onu seçer) ve forma seçili getirir. */
  const addBrand = async (name: string) => {
    const label = name.trim();
    if (label === '' || !quickAdd) return;
    const same = brandList.find(
      (b) => b.label.toLocaleLowerCase('tr') === label.toLocaleLowerCase('tr'),
    );
    try {
      const target = same ?? (await quickAdd.createBrand({ ...emptyBrandDraft, name: label }));
      const option = 'label' in target ? target : { value: target.id, label: target.name };
      if (!same) setBrandList((list) => [...list, option]);
      setDraft((d) => ({ ...d, brand: option.value }));
    } catch (error) {
      onError(error);
    }
  };
  /** Yeni kategori ekler (üst kategori boş olabilir) ve ürüne seçili ekler. */
  const addCategory = async (name: string, parentId: string | null) => {
    const label = name.trim();
    if (label === '' || !quickAdd) return;
    try {
      const created = await quickAdd.createCategory({
        ...emptyCategoryDraft(parentId),
        name: label,
      });
      setAddedCategories((list) => [...list, created]);
      setExtras((e) =>
        e.categoryIds.includes(created.id)
          ? e
          : { ...e, categoryIds: [...e.categoryIds, created.id] },
      );
    } catch (error) {
      onError(error);
    }
  };
  const toggleExtra = (key: 'categoryIds' | 'dealIds', id: string) =>
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
    if (
      patch.barcodes?.some((b) =>
        rows.some(
          (r) =>
            r.id !== rowId &&
            r.barcodes.some(
              (other) =>
                other.code.toLocaleLowerCase('en-US') === b.code.toLocaleLowerCase('en-US'),
            ),
        ),
      )
    ) {
      setSaveError('Bu barkod başka bir birimde zaten eklenmiş.');
      return;
    }
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
  const renamePriceList = (id: string, label: string) => priceLists.rename(id, label);

  // ---- Kayıt ----------------------------------------------------------------------------
  /** Eksik zorunlu alan varsa `onInvalid` çağrılır (ör. ilk sekmeye dön); yoksa kaydeder. */
  const save = async (onInvalid?: () => void) => {
    if (saveLock.current) return;
    if ([stockTypes, vatDepartments, stockKinds, units, priceLists].some((list) => list.busy)) {
      setSaveError('Seçenek işlemi sürüyor. Tamamlanınca tekrar kaydedin.');
      return;
    }
    setSaveError(null);
    setSaveNotice('');
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
      setSaved(!options.stayOnSave);
      if (options.stayOnSave)
        setSaveNotice(
          'Stok kartı kaydedildi. Varyant değişiklikleri için “Varyantları kaydet” düğmesine basın.',
        );
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
    lookups: { ...lookups, brands: brandList },
    addBrand,
    addCategory,
    variantStock: options.variantStock,
    syncVariantQuantity,
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
    renamePriceList,
    saving,
    saveError,
    saveNotice,
    extras,
    extraOptions,
    toggleCategory: (id: string) => toggleExtra('categoryIds', id),
    toggleDeal: (id: string) => toggleExtra('dealIds', id),
    toggleAttribute: (id: string, groupId: string, multiple: boolean) =>
      setExtras((e) => {
        const ids = e.attributeValueIds ?? [];
        const groupValues =
          extraOptions?.attributes?.values.filter((v) => v.groupId === groupId).map((v) => v.id) ??
          [];
        const next = ids.includes(id)
          ? ids.filter((x) => x !== id)
          : [...(multiple ? ids : ids.filter((x) => !groupValues.includes(x))), id];
        return { ...e, attributeValueIds: next };
      }),
    dirty: JSON.stringify({ draft, extras }) !== baseline,
    saved,
    savedId,
    keepEditing: () => setSaved(false),
    save,
    startOver,
  };
}

export type StockEditor = ReturnType<typeof useStockEditor>;
