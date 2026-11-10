import {
  ArrowLeft,
  Boxes,
  FolderTree,
  Percent,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { useBrandService } from '../../brands/hooks/useBrandService';
import { useCategoryService } from '../../categories/services/category.service';
import { flattenTree } from '../../categories/tree';
import { useDealService } from '../../deals/services/deal.service';
import { useWorkspacePermission } from '../../workspace/workspace-context';
import type { BulkRequest, BulkResult, PriceColumn } from '../types';

type View = 'menu' | 'price' | 'deal' | 'category' | 'brand' | 'sales' | 'stock';
type Outcome = { ok: true; result: BulkResult } | { ok: false; message: string };

interface BulkActionsSheetProps {
  count: number;
  priceLists: PriceColumn[];
  /** Parametreli işlemleri uygular (fiyat, fırsat, kategori, marka). */
  onApply: (request: BulkRequest) => Promise<Outcome>;
  /** Açık/kapalı türü basit işlemler. */
  onSales: (on: boolean) => Promise<boolean>;
  onStock: (on: boolean) => Promise<boolean>;
  onDelete: () => void;
  /** Başarılı işlemden sonra kısa bildirim metni. */
  onDone: (message: string) => void;
  onClose: () => void;
}

const TILES: { id: Exclude<View, 'menu'>; title: string; hint: string; icon: LucideIcon }[] = [
  {
    id: 'price',
    title: 'Fiyat Güncelle',
    hint: 'Yüzde ya da tutarla toplu zam/indirim',
    icon: Percent,
  },
  { id: 'deal', title: 'Fırsat', hint: 'Rozet ekle ya da kaldır', icon: Sparkles },
  { id: 'category', title: 'Kategori', hint: 'Kategoriye ekle ya da çıkar', icon: FolderTree },
  { id: 'brand', title: 'Marka', hint: 'Markayı değiştir', icon: Tag },
  { id: 'sales', title: 'Satış Durumu', hint: 'Satışa aç ya da kapat', icon: ShoppingBag },
  { id: 'stock', title: 'Stok Takibi', hint: 'Takibi aç ya da kapat', icon: Boxes },
];

/** İki ya da daha çok seçenekli, tek seçimli düğme grubu (sade kapsül). */
function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={[
            'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors',
            value === key
              ? 'border-brand-600 bg-brand-50 text-brand-ink'
              : 'border-field-border text-ink-muted hover:border-brand-500 hover:text-ink',
          ].join(' ')}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const PRICE_MODES = [
  ['yuzde_artir', '% Artır'],
  ['yuzde_azalt', '% Azalt'],
  ['tutar_ekle', 'Tutar Ekle'],
  ['tutar_cikar', 'Tutar Çıkar'],
  ['ayarla', 'Yeni Fiyat'],
] as const;
type PriceMode = (typeof PRICE_MODES)[number][0];

/**
 * Toplu işlem penceresi: kurulum sihirbazı gibi önce işlem seçilir, sonra o işlemin sade bir ekranı
 * açılır ("‹ Geri" ile menüye dönülür), altta ne olacağını yazan tek cümle ve "Uygula" düğmesi durur.
 * Seçenek listeleri (fırsat, kategori, marka) pencere açılınca yüklenir.
 */
export function BulkActionsSheet({
  count,
  priceLists,
  onApply,
  onSales,
  onStock,
  onDelete,
  onDone,
  onClose,
}: BulkActionsSheetProps) {
  const canSave = useWorkspacePermission('save');
  const canDelete = useWorkspacePermission('delete');
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Seçenek listeleri
  const dealService = useDealService();
  const categoryService = useCategoryService();
  const brandService = useBrandService();
  const [deals, setDeals] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [brands, setBrands] = useState<SelectOption[]>([]);
  useEffect(() => {
    let active = true;
    void dealService
      .list()
      .then((list) => {
        if (active)
          setDeals(list.filter((d) => d.active).map((d) => ({ value: d.id, label: d.name })));
      })
      .catch(() => undefined);
    void categoryService
      .list()
      .then((list) => {
        if (active)
          setCategories(
            flattenTree(list).map(({ category, depth }) => ({
              value: category.id,
              label: `${'— '.repeat(depth)}${category.name}`,
            })),
          );
      })
      .catch(() => undefined);
    void brandService
      .list()
      .then((list) => {
        if (active) setBrands(list.map((b) => ({ value: b.id, label: b.name })));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [dealService, categoryService, brandService]);

  // ---- Fiyat
  const [yon, setYon] = useState<'satis' | 'alis'>('satis');
  const [listId, setListId] = useState(priceLists[0]?.id ?? '');
  const [mode, setMode] = useState<PriceMode>('yuzde_artir');
  const [amount, setAmount] = useState('');
  const [round, setRound] = useState(false);
  const listName = priceLists.find((l) => l.id === listId)?.name ?? '';
  const percent = mode === 'yuzde_artir' || mode === 'yuzde_azalt';

  // ---- Fırsat / kategori / marka
  const [dealId, setDealId] = useState('');
  const [dealAdd, setDealAdd] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [categoryAdd, setCategoryAdd] = useState(true);
  const [brandId, setBrandId] = useState('');
  const brandOptions = useMemo(() => [{ value: '', label: 'Markasız' }, ...brands], [brands]);
  const [flag, setFlag] = useState<'on' | 'off'>('on');

  const go = (next: View) => {
    setError(null);
    setView(next);
  };

  const run = async (
    action: () => Promise<Outcome | boolean>,
    success: (r?: BulkResult) => string,
  ) => {
    setBusy(true);
    setError(null);
    const outcome = await action();
    setBusy(false);
    if (outcome === true) {
      onDone(success());
      onClose();
    } else if (outcome === false) {
      setError('İşlem tamamlanamadı. Tekrar deneyin.');
    } else if (outcome.ok) {
      onDone(success(outcome.result));
      onClose();
    } else {
      setError(outcome.message);
    }
  };

  const unit = `${count} ürün`;

  /** Pencerenin alt bölümü: özet cümle + Uygula. */
  const footer = (summary: string, ready: boolean, onSubmit: () => void) => (
    <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <p className="text-sm leading-relaxed text-ink-muted">{summary}</p>
      <Button
        flow={false}
        disabled={!ready || !canSave}
        loading={busy}
        loadingLabel="Uygulanıyor…"
        onClick={onSubmit}
      >
        Uygula
      </Button>
    </div>
  );

  let body: ReactNode;
  let title = `Toplu İşlem · ${unit}`;

  if (view === 'menu') {
    body = (
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TILES.map(({ id, title: tileTitle, hint, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => go(id)}
              className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-brand-500 disabled:opacity-50"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{tileTitle}</span>
                <span className="block text-sm text-ink-muted">{hint}</span>
              </span>
            </button>
          </li>
        ))}
        <li className="sm:col-span-2">
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => {
              onClose();
              onDelete();
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-danger/30 p-3.5 text-left font-bold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
          >
            <Trash2 className="size-5" aria-hidden="true" />
            Seçilenleri Sil
          </button>
        </li>
      </ul>
    );
  } else if (view === 'price') {
    title = 'Fiyat Güncelle';
    const valid =
      amount.trim() !== '' && /^\d+([.,]\d{1,6})?$/.test(amount.trim()) && listId !== '';
    const what = yon === 'satis' ? 'satış fiyatı' : 'alış fiyatı';
    const how =
      mode === 'yuzde_artir'
        ? `%${amount || '…'} artırılacak`
        : mode === 'yuzde_azalt'
          ? `%${amount || '…'} azaltılacak`
          : mode === 'tutar_ekle'
            ? `${amount || '…'} ₺ eklenecek`
            : mode === 'tutar_cikar'
              ? `${amount || '…'} ₺ düşülecek`
              : `${amount || '…'} ₺ (KDV Dahil) yapılacak`;
    body = (
      <div className="flex flex-col gap-4">
        <Choices
          label="Hangi fiyat"
          options={[
            ['satis', 'Satış Fiyatı'],
            ['alis', 'Alış Fiyatı'],
          ]}
          value={yon}
          onChange={setYon}
        />
        <SelectField
          label="Fiyat Listesi"
          options={priceLists.map((l) => ({ value: l.id, label: l.name }))}
          value={listId}
          onChange={setListId}
        />
        <Choices label="Nasıl değişsin" options={PRICE_MODES} value={mode} onChange={setMode} />
        <TextField
          label={percent ? 'Oran' : 'Tutar (KDV Dahil)'}
          numeric="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          trailing={
            <span className="pr-3 text-sm font-bold text-ink-muted">{percent ? '%' : '₺'}</span>
          }
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={round}
            onChange={(e) => setRound(e.target.checked)}
            className="size-5 accent-brand-600"
          />
          Sonucu tam sayıya yuvarla
        </label>
        {footer(
          `${count} ürünün ${listName} ${what} ${how}. Hesap KDV Dahil fiyat üzerinden yapılır; sıfırın altına düşen olursa hiçbir şey değişmez.`,
          valid,
          () =>
            void run(
              () =>
                onApply({
                  islem: 'fiyat_guncelle',
                  listeId: listId,
                  yon,
                  mod: mode,
                  deger: amount.trim(),
                  yuvarla: round ? 'tam' : 'yok',
                }),
              (r) =>
                r?.skipped
                  ? `${r.affected} üründe fiyat güncellendi (${r.skipped} üründe bu listede fiyat yoktu).`
                  : `${r?.affected ?? count} üründe fiyat güncellendi.`,
            ),
        )}
      </div>
    );
  } else if (view === 'deal') {
    title = 'Fırsat';
    body = (
      <div className="flex flex-col gap-4">
        <Choices
          label="İşlem"
          options={[
            ['add', 'Fırsat Ekle'],
            ['remove', 'Fırsatı Kaldır'],
          ]}
          value={dealAdd ? 'add' : 'remove'}
          onChange={(v) => setDealAdd(v === 'add')}
        />
        <SelectField label="Fırsat" options={deals} value={dealId} onChange={setDealId} />
        {footer(
          `${unit}${dealAdd ? ' için seçilen fırsat eklenecek' : 'den seçilen fırsat kaldırılacak'}.`,
          dealId !== '',
          () =>
            void run(
              () => onApply({ islem: dealAdd ? 'firsat_ekle' : 'firsat_kaldir', firsatId: dealId }),
              () => `${count} ürün için fırsat ${dealAdd ? 'eklendi' : 'kaldırıldı'}.`,
            ),
        )}
      </div>
    );
  } else if (view === 'category') {
    title = 'Kategori';
    body = (
      <div className="flex flex-col gap-4">
        <Choices
          label="İşlem"
          options={[
            ['add', 'Kategoriye Ekle'],
            ['remove', 'Kategoriden Çıkar'],
          ]}
          value={categoryAdd ? 'add' : 'remove'}
          onChange={(v) => setCategoryAdd(v === 'add')}
        />
        <SelectField
          label="Kategori"
          options={categories}
          value={categoryId}
          onChange={setCategoryId}
          searchable
        />
        {footer(
          `${unit}${categoryAdd ? ' seçilen kategoriye eklenecek (mevcut kategorileri korunur)' : ' seçilen kategoriden çıkarılacak'}.`,
          categoryId !== '',
          () =>
            void run(
              () =>
                onApply({
                  islem: categoryAdd ? 'kategori_ekle' : 'kategori_kaldir',
                  kategoriId: categoryId,
                }),
              () =>
                `${count} ürün ${categoryAdd ? 'kategoriye eklendi' : 'kategoriden çıkarıldı'}.`,
            ),
        )}
      </div>
    );
  } else if (view === 'brand') {
    title = 'Marka';
    body = (
      <div className="flex flex-col gap-4">
        <SelectField
          label="Yeni Marka"
          options={brandOptions}
          value={brandId}
          onChange={setBrandId}
          searchable
        />
        {footer(
          brandId === ''
            ? `${count} ürünün markası kaldırılacak (markasız olacak).`
            : `${count} ürünün markası seçilen marka olacak.`,
          true,
          () =>
            void run(
              () => onApply({ islem: 'marka_ata', markaId: brandId === '' ? null : brandId }),
              () => `${count} ürünün markası güncellendi.`,
            ),
        )}
      </div>
    );
  } else {
    const isSales = view === 'sales';
    title = isSales ? 'Satış Durumu' : 'Stok Takibi';
    body = (
      <div className="flex flex-col gap-4">
        <Choices
          label={title}
          options={
            isSales
              ? ([
                  ['on', 'Satışa Aç'],
                  ['off', 'Satışa Kapat'],
                ] as const)
              : ([
                  ['on', 'Takibi Aç'],
                  ['off', 'Takibi Kapat'],
                ] as const)
          }
          value={flag}
          onChange={setFlag}
        />
        {footer(
          isSales
            ? `${unit} ${flag === 'on' ? 'satışa açılacak' : 'satışa kapatılacak (listede kalır, mağazada görünmez)'}.`
            : `${unit} için stok takibi ${flag === 'on' ? 'açılacak' : 'kapatılacak (Sınırsız sayılır)'}.`,
          true,
          () =>
            void run(
              () => (isSales ? onSales(flag === 'on') : onStock(flag === 'on')),
              () =>
                isSales
                  ? `${count} ürün satışa ${flag === 'on' ? 'açıldı' : 'kapatıldı'}.`
                  : `${count} üründe stok takibi ${flag === 'on' ? 'açıldı' : 'kapatıldı'}.`,
            ),
        )}
      </div>
    );
  }

  return (
    <Sheet open onClose={onClose} title={title} size="md">
      <div className="flex flex-col gap-4">
        {view === 'menu' ? null : (
          <button
            type="button"
            onClick={() => go('menu')}
            className="-mt-2 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-full pr-3 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Toplu İşlem · {unit}
          </button>
        )}
        {body}
      </div>
    </Sheet>
  );
}
