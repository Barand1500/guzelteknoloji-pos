import type { CSSProperties } from 'react';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import type { OptionList } from '../hooks/useOptionList';
import type { StockEditor } from '../hooks/useStockEditor';
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

const YES_NO = [
  { value: 'hayir', label: 'Hayır' },
  { value: 'evet', label: 'Evet' },
];

/** Izgarada tek bir alanın kapladığı yer: telefon tam, tablet yarım, geniş ekran 3/12. */
const cell = 'col-span-2 md:col-span-3 xl:col-span-3';

/**
 * Ürün bilgisi alanları. Masaüstündeki kartta da telefondaki "Ürün" sekmesinde de aynı bileşen
 * kullanılır. Tüm alanlar hep görünür (katlama yok). Izgara: tablet 6, geniş ekran 12 sütun.
 * "Envanter Takibi" seçimine göre yanındaki alanlar değişir (bkz. INVENTORY_FIELDS).
 */
export function BasicInfoSection({ editor }: { editor: StockEditor }) {
  const { draft, errors, set, lookups, lists } = editor;

  const text = (key: 'code' | 'name' | 'gtip' | 'origin', label: string, maxLength?: number) => (
    <TextField
      label={label}
      value={draft[key]}
      error={errors[key]}
      maxLength={maxLength}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  const inventoryFields = INVENTORY_FIELDS[draft.inventoryTracking] ?? [];

  // Satırdaki kutular, geniş ekranda (xl) kendi içinde eşit bölünür; dar ekranda ana ızgaraya karışır
  // ("contents"), bu yüzden telefon/tablet düzeni değişmez.
  const inner = 'col-span-2 md:col-span-3 xl:col-span-1';
  const items = [
    <div key="envanter" className={inner}>
      <SelectField
        label="Envanter Takibi"
        options={lookups.inventoryTracking}
        value={draft.inventoryTracking}
        onChange={(v) => set('inventoryTracking', v)}
      />
    </div>,
    ...inventoryFields.map((field) => (
      <div key={`${draft.inventoryTracking}-${field.key}`} className={`${inner} animate-fade-in`}>
        {field.kind === 'yesno' ? (
          <SelectField
            label={field.label}
            options={YES_NO}
            value={draft[field.key] ? 'evet' : 'hayir'}
            onChange={(v) => set(field.key, v === 'evet')}
          />
        ) : (
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
            // Sayı alanlarına yalnızca rakam girilir; "Önek" alanları serbest metindir.
            numeric={
              field.key === 'stockQuantity'
                ? 'signed-decimal'
                : field.kind === 'text'
                  ? undefined
                  : field.kind
            }
            onChange={(e) => set(field.key, e.target.value)}
          />
        )}
      </div>
    )),
    <div key="mensei" className={inner}>
      {/* En uzun ülke adı ("Güney Georgia ve Güney Sandviç Adaları") 37 karakterdir → 40 sınır. */}
      {text('origin', 'Menşei', 40)}
    </div>,
    <div key="diger-vergi" className={inner}>
      <SelectField
        label="Diğer Vergi Ekle"
        options={lookups.otherTaxes}
        value={draft.otherTax}
        onChange={(v) => set('otherTax', v)}
      />
    </div>,
  ];
  // 3 ek alan olan türlerde (LOT, Ömür) satır 4 + 2 olarak bölünür (zaten tam sığar);
  // diğerlerinde (Yok: 3, Normal/Seri No: 5) hepsi tek satırda eşit genişlikte durur.
  const rowSizes = inventoryFields.length >= 3 ? [inventoryFields.length + 1, 2] : [items.length];
  let taken = 0;
  const inventoryRows = rowSizes.map((size, index) => {
    const rowItems = items.slice(taken, taken + size);
    taken += size;
    return (
      <div
        key={index}
        style={{ '--cols': size } as CSSProperties}
        className="contents xl:col-span-12 xl:grid xl:gap-4 xl:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
      >
        {rowItems}
      </div>
    );
  });

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-12">
      <div className={cell}>
        <SelectField
          label="Stok Tipi"
          value={draft.stockType}
          onChange={(v) => set('stockType', v)}
          {...editable(lists.stockTypes, 'stok tipi', (v) => set('stockType', v))}
        />
      </div>
      <div className="col-span-2 md:col-span-3 xl:col-span-4">{text('code', 'Stok Kodu')}</div>
      <div className="col-span-2 md:col-span-6 xl:col-span-5">{text('name', 'Stok Adı')}</div>

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
      <div className={cell}>
        <SelectField
          label="Stok Nevi"
          value={draft.stockKind}
          onChange={(v) => set('stockKind', v)}
          {...editable(lists.stockKinds, 'stok nevi', (v) => set('stockKind', v))}
        />
      </div>
      <div className={cell}>{text('gtip', 'GTIP Kodu')}</div>

      {/* Envanter takibi + seçime göre değişen alanlar + Menşei + Diğer Vergi: boşluk kalmasın diye
          satırdaki kutu sayısına göre sütunlar eşit bölünür (bkz. inventoryRows). */}
      {inventoryRows}
    </div>
  );
}
