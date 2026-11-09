import { useMemo } from 'react';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import type { OptionList } from '../hooks/useOptionList';
import type { StockEditor } from '../hooks/useStockEditor';
import { countryOptions } from '../countries';
import { OtherTaxes } from './OtherTaxes';
import { INVENTORY_FIELDS } from '../stock.rules';

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

/** Sunucunun şu an tanıdığı diğer vergi kodları (yenileri sunucu desteğiyle gelecek). */
const LEGACY_TAXES = new Set(['otv', 'oiv', 'konaklama']);


/** Envanter Takibi yalnızca Evet / Hayır'dır: Hayır = "yok", Evet = "normal" (stok miktarı + limitler). */
const TRACKING = [
  { value: 'yok', label: 'Hayır' },
  { value: 'normal', label: 'Evet' },
];

/** Izgarada tek bir alanın kapladığı yer: telefon tam, tablet yarım, geniş ekran 3/12. */
const cell = 'col-span-2 md:col-span-3 xl:col-span-3';

/**
 * Ürün bilgisi alanları. Masaüstündeki kartta da telefondaki "Ürün" sekmesinde de aynı bileşen
 * kullanılır. Tüm alanlar hep görünür (katlama yok). Izgara: tablet 6, geniş ekran 12 sütun.
 * Sıra: Ürün Tipi, Ürün Kodu, Ürün Adı / Marka, Menşei, Envanter Takibi / Diğer Vergi Ekle (seçilen
 * vergilerin oran alanlarıyla) / (Envanter Takibi = Evet ise) Stok Miktarı, Alt Limit, Üst Limit.
 * KDV departmanı, stok nevi ve GTIP kodu bu ekrandan kaldırıldı; taslaktaki alanları durur.
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

  // Eski kayıtlarda yalnızca tek "otherTax" olabilir; oran bilinmediği için boş gelir.
  const taxes = draft.otherTaxes ?? (draft.otherTax ? [{ code: draft.otherTax, rate: '' }] : []);
  const tracking = draft.inventoryTracking === 'yok' ? 'yok' : 'normal';
  const inventoryFields = INVENTORY_FIELDS[tracking] ?? [];

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

      <div className={cell}>
        <SelectField
          label="Marka"
          options={lookups.brands}
          value={draft.brand}
          onChange={(v) => set('brand', v)}
        />
      </div>
      <div className={cell}>
        <SelectField
          label="Menşei"
          options={origins}
          value={draft.origin}
          onChange={(v) => set('origin', v)}
          searchable
        />
      </div>
      <div className={cell}>
        <SelectField
          label="Envanter Takibi"
          options={TRACKING}
          value={tracking}
          onChange={(v) => set('inventoryTracking', v)}
        />
      </div>

      {/* Diğer vergiler: seçilen her vergi için yanında oran (%) alanı belirir. */}
      <div className="col-span-full">
        <OtherTaxes
          options={lookups.otherTaxes}
          value={taxes}
          onChange={(next) => {
            set('otherTaxes', next);
            // Sunucu şimdilik tek vergi saklar: bildiği vergilerden eklenen ilki yazılır.
            set('otherTax', next.find((t) => LEGACY_TAXES.has(t.code))?.code ?? '');
          }}
        />
      </div>

      {/* Envanter takibi açıksa stok miktarı ve limitler çıkar. */}
      {inventoryFields.map((field) => (
        <div key={`${draft.inventoryTracking}-${field.key}`} className={`${cell} animate-fade-in`}>
          <TextField
            label={field.label}
            value={
              field.key === 'stockQuantity' && editor.variantStock !== undefined
                ? editor.variantStock
                : draft[field.key]
            }
            readOnly={field.key === 'stockQuantity' && editor.variantStock !== undefined}
            hint={
              field.key === 'stockQuantity' && editor.variantStock !== undefined
                ? 'Varyant miktarlarının toplamı. Varyantlar bölümünden değiştirilir.'
                : undefined
            }
            error={errors[field.key]}
            numeric={field.key === 'stockQuantity' ? 'signed-decimal' : field.kind}
            onChange={(e) => set(field.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
