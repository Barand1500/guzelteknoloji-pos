import { ChevronDown } from 'lucide-react';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import type { OptionList } from '../hooks/useOptionList';
import type { StockEditor } from '../hooks/useStockEditor';

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
          .then((o) => onCreated(o.value)),
    },
    onRemove: list.remove,
  };
}

/**
 * Ürün bilgisi alanları (tip, kod, ad, marka, KDV departmanı…). Masaüstündeki kartta da
 * telefondaki "Ürün" sekmesinde de aynı bileşen kullanılır. Izgara: tablet 6, geniş ekran 12 sütun.
 */
export function BasicInfoSection({ editor }: { editor: StockEditor }) {
  const { draft, errors, set, lookups, lists, moreOpen, setMoreOpen } = editor;

  const text = (
    key: 'code' | 'name' | 'lowerLimit' | 'upperLimit' | 'gtip' | 'origin',
    label: string,
    decimal = false,
  ) => (
    <TextField
      label={label}
      value={draft[key]}
      error={errors[key]}
      inputMode={decimal ? 'decimal' : undefined}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-12">
      <div className="col-span-2 md:col-span-3 xl:col-span-3">
        <SelectField
          label="Stok Tipi"
          value={draft.stockType}
          onChange={(v) => set('stockType', v)}
          {...editable(lists.stockTypes, 'stok tipi', (v) => set('stockType', v))}
        />
      </div>
      <div className="col-span-2 md:col-span-3 xl:col-span-4">{text('code', 'Stok Kodu')}</div>
      <div className="col-span-2 md:col-span-6 xl:col-span-5">{text('name', 'Stok Adı')}</div>
      <div className="col-span-2 md:col-span-3 xl:col-span-3">
        <SelectField
          label="Marka"
          options={lookups.brands}
          value={draft.brand}
          onChange={(v) => set('brand', v)}
        />
      </div>
      <div className="col-span-2 md:col-span-3 xl:col-span-3">
        <SelectField
          label="KDV Departmanı"
          value={draft.vatDepartment}
          onChange={(v) => set('vatDepartment', v)}
          {...editable(
            lists.vatDepartments,
            'KDV departmanı',
            (v) => set('vatDepartment', v),
            true,
          )}
        />
      </div>
      <div className="col-span-2 md:col-span-3 xl:col-span-3">
        <SelectField
          label="Stok Nevi"
          value={draft.stockKind}
          onChange={(v) => set('stockKind', v)}
          {...editable(lists.stockKinds, 'stok nevi', (v) => set('stockKind', v))}
        />
      </div>
      <div className="col-span-2 md:col-span-3 xl:col-span-3">
        <SelectField
          label="Envanter Takibi"
          options={lookups.inventoryTracking}
          value={draft.inventoryTracking}
          onChange={(v) => set('inventoryTracking', v)}
        />
      </div>

      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        aria-expanded={moreOpen}
        className="col-span-2 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-brand-ink md:col-span-6 xl:col-span-12"
      >
        Daha Fazla Alan
        <ChevronDown
          className={`size-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {moreOpen ? (
        <>
          <div className="col-span-1 md:col-span-3 xl:col-span-2">
            {text('lowerLimit', 'Alt Limit', true)}
          </div>
          <div className="col-span-1 md:col-span-3 xl:col-span-2">
            {text('upperLimit', 'Üst Limit', true)}
          </div>
          <div className="col-span-2 md:col-span-2 xl:col-span-2">{text('gtip', 'GTIP Kodu')}</div>
          <div className="col-span-2 md:col-span-2 xl:col-span-3">{text('origin', 'Menşei')}</div>
          <div className="col-span-2 md:col-span-2 xl:col-span-3">
            <SelectField
              label="Diğer Vergi Ekle"
              options={lookups.otherTaxes}
              value={draft.otherTax}
              onChange={(v) => set('otherTax', v)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
