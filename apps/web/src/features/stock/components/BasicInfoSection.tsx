import { useMemo } from 'react';
import { SelectField } from '../../../components/ui/SelectField';
import { MultiSelectField } from '../../../components/ui/MultiSelectField';
import { TextField } from '../../../components/ui/TextField';
import type { OptionList } from '../hooks/useOptionList';
import type { StockEditor } from '../hooks/useStockEditor';
import { countryOptions } from '../countries';
import { flattenTree } from '../../categories/tree';

/** Seçim kutusuna "Yeni ekle" + silme davranışını bağlar (ayrı pencere yok). */
function editable(
  list: OptionList,
  noun: string,
  onCreated: (value: string) => void,
  withRate = false,
) {
  return {
    options: list.options,
    creator: {
      placeholder: `Yeni ${noun} adı…`,
      ...(withRate ? { ratePlaceholder: `${noun} oranı (%)` } : {}),
      // Oran varsa ada parantez içinde eklenir: "Gıda" + 10 → "Gıda (%10)".
      onCreate: (label: string, rate?: string) =>
        void list
          .add(withRate && rate ? `${label} (%${rate})` : label)
          .then((o) => onCreated(o.value))
          .catch(() => {
            /* Hata düzenleyicide gösterilir. */
          }),
    },
    onRemove: list.remove,
  };
}

/** Envanter Takibi yalnızca Evet / Hayır'dır: Hayır = "yok", Evet = "normal". */
const TRACKING = [
  { value: 'yok', label: 'Hayır' },
  { value: 'normal', label: 'Evet' },
];

/** Izgarada tek bir alanın kapladığı yer: telefon tam, tablet yarım, geniş ekran 3/12. */
const cell = 'col-span-2 md:col-span-3 xl:col-span-3';

/**
 * Ürün bilgisi alanları. Masaüstündeki kartta da telefondaki "Ürün" sekmesinde de aynı bileşen
 * kullanılır. Tüm alanlar hep görünür (katlama yok). Izgara: tablet 6, geniş ekran 12 sütun.
 * Sıra: Ürün Tipi, Ürün Kodu, Ürün Adı / Marka, Menşei, Envanter Takibi (Evet/Hayır), Kategori.
 * KDV departmanı, stok nevi, GTIP, stok miktarı, limitler ve diğer vergiler bu ekrandan kaldırıldı.
 */
export function BasicInfoSection({ editor }: { editor: StockEditor }) {
  const { draft, errors, set, lookups, lists } = editor;

  const text = (key: 'code' | 'name', label: string) => (
    <TextField
      label={label}
      value={draft[key]}
      error={errors[key]}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  // Menşei: ülke listesi (bayraklı, aranabilir). "Belirtilmedi" seçimi alanı boşaltır; eski kayıtta
  // listede olmayan serbest metin varsa o da seçenek olarak görünür, kaybolmaz.
  const origins = useMemo(() => {
    const list = [{ value: '', label: 'Belirtilmedi' }, ...countryOptions()];
    if (draft.origin && !list.some((o) => o.value === draft.origin))
      list.push({ value: draft.origin, label: draft.origin });
    return list;
  }, [draft.origin]);

  const tracking = draft.inventoryTracking === 'yok' ? 'yok' : 'normal';

  // Kategori: ağaç sırasıyla, alt kategoriler "Üst › Alt" yoluyla gösterilir. Seçim yan paneldeki
  // Kategori sekmesiyle ortaktır (aynı durum).
  const categories = editor.extraOptions?.categories;
  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    const byId = new Map(categories.map((c) => [c.id, c]));
    const path = (id: string): string => {
      const c = byId.get(id);
      return c ? (c.parentId ? `${path(c.parentId)} › ${c.name}` : c.name) : id;
    };
    return flattenTree(categories).map(({ category }) => ({
      id: category.id,
      name: path(category.id),
    }));
  }, [categories]);
  const chooseCategories = (ids: string[]) => {
    const current = editor.extras.categoryIds;
    for (const id of [
      ...ids.filter((x) => !current.includes(x)),
      ...current.filter((x) => !ids.includes(x)),
    ])
      editor.toggleCategory(id);
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-12">
      <div className={cell}>
        <SelectField
          label="Ürün Tipi"
          value={draft.stockType}
          onChange={(v) => set('stockType', v)}
          {...editable(lists.stockTypes, 'ürün tipi', (v) => set('stockType', v))}
        />
      </div>
      <div className="col-span-2 md:col-span-3 xl:col-span-4">{text('code', 'Ürün Kodu')}</div>
      <div className="col-span-2 md:col-span-6 xl:col-span-5">{text('name', 'Ürün Adı')}</div>

      {/* 2. satır: Marka, Menşei, Envanter Takibi, Kategori — dört eşit sütun. */}
      <div className="col-span-full grid grid-cols-2 gap-4 md:grid-cols-4">
        <SelectField
          label="Marka"
          options={lookups.brands}
          value={draft.brand}
          onChange={(v) => set('brand', v)}
        />
        <SelectField
          label="Menşei"
          options={origins}
          value={draft.origin}
          onChange={(v) => set('origin', v)}
          searchable
        />
        <SelectField
          label="Envanter Takibi"
          options={TRACKING}
          value={tracking}
          onChange={(v) => set('inventoryTracking', v)}
        />
        {categories ? (
          <MultiSelectField
            label="Kategori"
            options={categoryOptions}
            value={editor.extras.categoryIds}
            onChange={chooseCategories}
            emptyText="Seçilmedi"
          />
        ) : null}
      </div>
    </div>
  );
}
