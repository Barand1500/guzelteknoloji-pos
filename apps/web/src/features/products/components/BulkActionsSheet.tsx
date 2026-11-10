import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Check,
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
import { PickList, type PickOption } from '../../../components/ui/PickList';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { useBrandService } from '../../brands/hooks/useBrandService';
import { useCategoryService } from '../../categories/services/category.service';
import { flattenTree } from '../../categories/tree';
import { useDealService } from '../../deals/services/deal.service';
import { useWorkspacePermission } from '../../workspace/workspace-context';
import {
  ROUNDING_STEPS,
  describeChange,
  newExclPrice,
  type BulkPriceChange,
  type BulkPriceMode,
  type BulkRounding,
  type BulkVat,
} from '../bulk-price';
import {
  COST_VIEW,
  currencyOf,
  formatMoney,
  type BulkRequest,
  type BulkResult,
  type PriceColumn,
  type ProductItem,
} from '../types';

type Flow = 'price' | 'deal' | 'category' | 'brand' | 'sales' | 'stock';
type Outcome = { ok: true; result: BulkResult } | { ok: false; message: string };

interface BulkActionsSheetProps {
  count: number;
  priceLists: PriceColumn[];
  /** Seçilenlerden şu an sayfada görünenler (önizleme için); diğer sayfalardakiler listelenmez. */
  items: ProductItem[];
  onApply: (request: BulkRequest) => Promise<Outcome>;
  onSales: (on: boolean) => Promise<boolean>;
  onStock: (on: boolean) => Promise<boolean>;
  onDelete: () => void;
  /** Başarılı işlemden sonra kısa bildirim metni. */
  onDone: (message: string) => void;
  onClose: () => void;
}

const TILES: { id: Flow; title: string; hint: string; icon: LucideIcon }[] = [
  { id: 'price', title: 'Fiyat Güncelle', hint: 'Yüzde ya da tutarla zam, indirim', icon: Percent },
  { id: 'deal', title: 'Fırsat', hint: 'Rozet ekle ya da kaldır', icon: Sparkles },
  { id: 'category', title: 'Kategori', hint: 'Kategoriye ekle ya da çıkar', icon: FolderTree },
  { id: 'brand', title: 'Marka', hint: 'Markayı değiştir', icon: Tag },
  { id: 'sales', title: 'Satış Durumu', hint: 'Satışa aç ya da kapat', icon: ShoppingBag },
  { id: 'stock', title: 'Stok Takibi', hint: 'Takibi aç ya da kapat', icon: Boxes },
];

/** Başlıklı seçenek kartı: seçiliyken dolgulu çerçeve; başlık + kısa açıklama. */
function OptionCard({
  title,
  hint,
  on,
  onClick,
  icon,
}: {
  title: string;
  hint?: string;
  on: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={[
        'flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
        on
          ? 'border-brand-600 bg-brand-50 text-brand-ink'
          : 'border-line bg-surface hover:border-brand-500',
      ].join(' ')}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        {hint ? <span className="block text-sm font-normal text-ink-muted">{hint}</span> : null}
      </span>
      {on ? <Check className="size-5 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}

/** Üst bölüm etiketi (küçük harf büyük yazı). */
const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">{children}</p>
);

const META: Record<Flow, { title: string }> = {
  price: { title: 'Toplu fiyat güncelle' },
  deal: { title: 'Toplu fırsat' },
  category: { title: 'Toplu kategori' },
  brand: { title: 'Toplu marka' },
  sales: { title: 'Toplu satış durumu' },
  stock: { title: 'Toplu stok takibi' },
};

/**
 * Toplu işlem penceresi. Önce işlem seçilir (kutucuklar); sonra kurulum sihirbazı gibi adım adım
 * ilerlenir: üstte adım çubukları, altta "Geri" ve "Devam / Onaylıyorum". Fiyat güncelleme: fiyat ve
 * işlem → KDV dahil mi hariç mi → (varyant fiyatı varsa) onlara ne yapılsın → ürün ürün önizleme.
 * Diğer işlemler: seçim → özet ve onay. Yuvarlama: en yakın 10 kuruş / 50 kuruş / 1 lira / 5 lira.
 */
export function BulkActionsSheet({
  count,
  priceLists,
  items,
  onApply,
  onSales,
  onStock,
  onDelete,
  onDone,
  onClose,
}: BulkActionsSheetProps) {
  const canSave = useWorkspacePermission('save');
  const canDelete = useWorkspacePermission('delete');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Seçenek listeleri (pencere açılınca yüklenir; hata olursa liste boş kalır)
  const dealService = useDealService();
  const categoryService = useCategoryService();
  const brandService = useBrandService();
  const [deals, setDeals] = useState<PickOption[]>([]);
  const [categories, setCategories] = useState<PickOption[]>([]);
  const [brands, setBrands] = useState<PickOption[]>([]);
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
              label: category.name,
              depth,
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
  const [priceKey, setPriceKey] = useState<string>(priceLists[0]?.id ?? '');
  const [direction, setDirection] = useState<'artir' | 'azalt'>('artir');
  const [kind, setKind] = useState<'yuzde' | 'tutar'>('yuzde');
  const [amount, setAmount] = useState('');
  const [rounding, setRounding] = useState<BulkRounding>('yok');
  const [vat, setVat] = useState<BulkVat>('dahil');
  const [variants, setVariants] = useState<boolean | null>(null);
  const isCost = priceKey === 'alis';
  const listId = isCost ? (priceLists[0]?.id ?? '') : priceKey;
  const priceMode: BulkPriceMode =
    kind === 'yuzde'
      ? direction === 'artir'
        ? 'yuzde_artir'
        : 'yuzde_azalt'
      : direction === 'artir'
        ? 'tutar_ekle'
        : 'tutar_cikar';
  const amountOk = /^\d+([.,]\d{1,6})?$/.test(amount.trim());
  const withVariants = !isCost && items.some((p) => (p.variantCount ?? 0) > 0);
  const variantCount = items.filter((p) => (p.variantCount ?? 0) > 0).length;

  // ---- Diğer işlemler
  const [dealId, setDealId] = useState('');
  const [dealAdd, setDealAdd] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [categoryAdd, setCategoryAdd] = useState(true);
  const [brandId, setBrandId] = useState('');
  const brandOptions = useMemo(
    () => [{ value: '', label: 'Markasız (markayı kaldır)' }, ...brands],
    [brands],
  );
  const [flag, setFlag] = useState<'on' | 'off'>('on');

  // ---- Adımlar
  const steps: string[] =
    flow === null
      ? []
      : flow === 'price'
        ? ['choose', 'vat', ...(withVariants ? ['variants'] : []), 'preview']
        : ['choose', 'confirm'];
  const stepKey = steps[step] ?? 'choose';
  const last = flow !== null && step === steps.length - 1;

  const start = (next: Flow) => {
    setFlow(next);
    setStep(0);
    setError(null);
  };
  const back = () => {
    setError(null);
    if (step === 0) setFlow(null);
    else setStep(step - 1);
  };

  // ---- Önizleme (fiyat)
  const view = isCost ? COST_VIEW : listId;
  const preview = useMemo(() => {
    const change: BulkPriceChange = {
      mod: priceMode,
      value: Number(amount.trim().replace(',', '.')) || 0,
      kdv: vat,
      yuvarla: rounding,
    };
    return items.map((p) => {
      const list = p.listPrices?.find((l) => l.id === listId);
      const price = isCost ? list?.purchase : list;
      const excl = price?.net ?? null;
      const rate = price?.vatRate ?? p.vatRate;
      if (excl === null) return { p, old: null, next: null as number | null, negative: false };
      const toBasis = vat === 'dahil' ? 1 + rate / 100 : 1;
      const next = amountOk ? newExclPrice(excl, rate, change) : excl;
      return {
        p,
        old: excl * toBasis,
        next: next === null ? null : next * toBasis,
        negative: next === null,
      };
    });
  }, [items, isCost, listId, vat, priceMode, amount, rounding, amountOk]);
  const missing = preview.filter((r) => r.old === null).length;
  const hasNegative = preview.some((r) => r.negative);
  const hidden = Math.max(0, count - items.length);

  // ---- Uygulama
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
    } else if (outcome === false) setError('İşlem tamamlanamadı. Tekrar deneyin.');
    else if (outcome.ok) {
      onDone(success(outcome.result));
      onClose();
    } else setError(outcome.message);
  };

  const apply = () => {
    if (flow === 'price')
      return void run(
        () =>
          onApply({
            islem: 'fiyat_guncelle',
            listeId: listId,
            yon: isCost ? 'alis' : 'satis',
            mod: priceMode,
            deger: amount.trim(),
            kdv: vat,
            yuvarla: rounding,
            varyantlar: variants === true,
          }),
        (r) =>
          r?.skipped
            ? `${r.affected} üründe fiyat güncellendi (${r.skipped} üründe bu fiyat yoktu).`
            : `${r?.affected ?? count} üründe fiyat güncellendi.`,
      );
    if (flow === 'deal')
      return void run(
        () => onApply({ islem: dealAdd ? 'firsat_ekle' : 'firsat_kaldir', firsatId: dealId }),
        () => `${count} ürün için fırsat ${dealAdd ? 'eklendi' : 'kaldırıldı'}.`,
      );
    if (flow === 'category')
      return void run(
        () =>
          onApply({
            islem: categoryAdd ? 'kategori_ekle' : 'kategori_kaldir',
            kategoriId: categoryId,
          }),
        () => `${count} ürün ${categoryAdd ? 'kategoriye eklendi' : 'kategoriden çıkarıldı'}.`,
      );
    if (flow === 'brand')
      return void run(
        () => onApply({ islem: 'marka_ata', markaId: brandId === '' ? null : brandId }),
        () => `${count} ürünün markası güncellendi.`,
      );
    if (flow === 'sales')
      return void run(
        () => onSales(flag === 'on'),
        () => `${count} ürün satışa ${flag === 'on' ? 'açıldı' : 'kapatıldı'}.`,
      );
    return void run(
      () => onStock(flag === 'on'),
      () => `${count} üründe stok takibi ${flag === 'on' ? 'açıldı' : 'kapatıldı'}.`,
    );
  };

  /** Mevcut adım tamamlanmış mı ("Devam" açılır mı). */
  const ready = (() => {
    if (flow === 'price') {
      if (stepKey === 'choose') return amountOk && priceKey !== '';
      if (stepKey === 'variants') return variants !== null;
      if (stepKey === 'preview') return !hasNegative;
      return true;
    }
    if (stepKey === 'choose') {
      if (flow === 'deal') return dealId !== '';
      if (flow === 'category') return categoryId !== '';
    }
    return true;
  })();

  const subtitle: Record<string, string> = {
    choose: flow === 'price' ? 'Hangi fiyat, nasıl değişsin?' : 'Ne yapılsın?',
    vat: 'Hesap hangi fiyat üzerinden yapılsın?',
    variants: 'Varyant fiyatlarına ne yapılsın?',
    preview: 'Değişiklikleri kontrol edip onaylayın',
    confirm: 'Kontrol edip onaylayın',
  };

  const nameOf = (list: PickOption[], value: string) =>
    list.find((o) => o.value === value)?.label ?? '';

  let body: ReactNode;
  if (flow === null) {
    body = (
      <div className="flex flex-col gap-3">
        {/* Altı eşit boyutlu kutucuk: 2 sütun × 3 satır, hepsi aynı yükseklikte ve aynı hizada. */}
        <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3">
          {TILES.map(({ id, title, hint, icon: Icon }) => (
            <li key={id} className="flex">
              <button
                type="button"
                disabled={!canSave}
                onClick={() => start(id)}
                className="group flex w-full flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-soft disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-ink transition-colors group-hover:bg-brand-100">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-bold">{title}</span>
                  <span className="text-sm leading-snug text-ink-muted">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!canDelete}
          onClick={() => {
            onClose();
            onDelete();
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 px-4 font-bold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
        >
          <Trash2 className="size-5" aria-hidden="true" />
          Seçilenleri Sil
        </button>
      </div>
    );
  } else if (flow === 'price' && stepKey === 'choose') {
    body = (
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <Label>Fiyat</Label>
          <div role="radiogroup" aria-label="Fiyat" className="flex flex-wrap gap-2">
            {[
              ...priceLists.map((l) => ({ id: l.id, name: l.name })),
              { id: 'alis', name: 'Alış' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={priceKey === o.id}
                onClick={() => setPriceKey(o.id)}
                className={[
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors',
                  priceKey === o.id
                    ? 'border-brand-600 bg-brand-50 text-brand-ink'
                    : 'border-field-border text-ink-muted hover:border-brand-500 hover:text-ink',
                ].join(' ')}
              >
                {o.name}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <Label>İşlem</Label>
          <div
            role="radiogroup"
            aria-label="Zam ya da indirim"
            className="grid grid-cols-2 gap-2.5"
          >
            <OptionCard
              title="Zam"
              on={direction === 'artir'}
              onClick={() => setDirection('artir')}
              icon={<ArrowUp className="size-5 shrink-0" aria-hidden="true" />}
            />
            <OptionCard
              title="İndirim"
              on={direction === 'azalt'}
              onClick={() => setDirection('azalt')}
              icon={<ArrowDown className="size-5 shrink-0" aria-hidden="true" />}
            />
          </div>
          <div
            role="radiogroup"
            aria-label="Yüzde ya da sabit tutar"
            className="grid grid-cols-2 gap-2.5"
          >
            <OptionCard title="% Yüzde" on={kind === 'yuzde'} onClick={() => setKind('yuzde')} />
            <OptionCard title="₺ Sabit" on={kind === 'tutar'} onClick={() => setKind('tutar')} />
          </div>
          <TextField
            label={kind === 'yuzde' ? 'Yüzde (%)' : 'Tutar (₺)'}
            numeric="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">Yuvarlama</p>
              <p className="text-sm text-ink-muted">Açıkken sonucu seçtiğiniz adıma yuvarlar</p>
            </div>
            <ToggleSwitch
              label="Yuvarlama"
              checked={rounding !== 'yok'}
              onChange={(on) => setRounding(on ? '1' : 'yok')}
            />
          </div>
          {rounding !== 'yok' ? (
            <div
              role="radiogroup"
              aria-label="Yuvarlama adımı"
              className="grid animate-fade-in grid-cols-2 gap-2.5"
            >
              {ROUNDING_STEPS.map((r) => (
                <OptionCard
                  key={r.value}
                  title={r.label}
                  hint={r.hint}
                  on={rounding === r.value}
                  onClick={() => setRounding(r.value)}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    );
  } else if (flow === 'price' && stepKey === 'vat') {
    body = (
      <div role="radiogroup" aria-label="KDV dayanağı" className="flex flex-col gap-2.5">
        <OptionCard
          title="KDV Dahil"
          hint="Listede gördüğünüz (KDV dahil) fiyat üzerinden hesaplanır"
          on={vat === 'dahil'}
          onClick={() => setVat('dahil')}
        />
        <OptionCard
          title="KDV Hariç"
          hint="Net (KDV hariç) fiyat üzerinden hesaplanır"
          on={vat === 'haric'}
          onClick={() => setVat('haric')}
        />
        <p className="px-1 text-sm text-ink-muted">
          Yüzdeli değişimde ikisi aynı sonucu verir; sabit tutarda (ör. +10 ₺) fark eder.
        </p>
      </div>
    );
  } else if (flow === 'price' && stepKey === 'variants') {
    body = (
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-ink">
          <strong>{variantCount}</strong> ürününde varyant fiyatı var. Bunlara ne yapalım?
        </p>
        <div role="radiogroup" aria-label="Varyant fiyatları" className="flex flex-col gap-2.5">
          <OptionCard
            title="Sadece ürün fiyatı"
            hint="Varyant fiyatları aynı kalsın"
            on={variants === false}
            onClick={() => setVariants(false)}
          />
          <OptionCard
            title="Ürün + varyant fiyatları"
            hint="Aynı zam / indirim varyantlara da uygulansın"
            on={variants === true}
            onClick={() => setVariants(true)}
          />
        </div>
      </div>
    );
  } else if (flow === 'price') {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface-muted px-4 py-3">
          <span className="font-bold">{describeChange(priceMode, amount.trim())}</span>
          <span className="text-sm text-ink-muted">
            {count} ürün güncellenecek · {vat === 'dahil' ? 'KDV Dahil' : 'KDV Hariç'}
            {withVariants && variants ? ' · varyantlar dahil' : ''}
          </span>
        </div>
        {hasNegative ? (
          <Alert tone="error">Bazı ürünlerde fiyat sıfırın altına düşer. Değeri azaltın.</Alert>
        ) : null}
        <ul
          aria-label="Önizleme"
          className="max-h-72 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-surface"
        >
          {preview.map(({ p, old, next }) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="block truncate text-sm text-ink-muted">
                  {p.categoryNames?.[0] ?? p.categoryName ?? 'Kategorisiz'}
                </span>
              </span>
              {old === null ? (
                <span className="text-sm text-ink-muted">Bu fiyat yok</span>
              ) : (
                <span className="shrink-0 text-right">
                  <span className="block text-sm text-ink-muted line-through">
                    {formatMoney(old, currencyOf(p, view))}
                  </span>
                  <span className="block font-bold">
                    {next === null ? '—' : formatMoney(next, currencyOf(p, view))}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
        {hidden > 0 ? (
          <p className="px-1 text-sm text-ink-muted">
            Diğer sayfalardaki {hidden} ürün de aynı kuralla güncellenir (burada listelenmez).
          </p>
        ) : null}
        {missing > 0 ? (
          <p className="px-1 text-sm text-ink-muted">
            {missing} üründe bu fiyat girilmemiş; atlanacak.
          </p>
        ) : null}
      </div>
    );
  } else if (stepKey === 'choose' && flow === 'deal') {
    body = (
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="İşlem" className="grid grid-cols-2 gap-2.5">
          <OptionCard title="Fırsat Ekle" on={dealAdd} onClick={() => setDealAdd(true)} />
          <OptionCard title="Fırsatı Kaldır" on={!dealAdd} onClick={() => setDealAdd(false)} />
        </div>
        <Label>Fırsat</Label>
        <PickList label="Fırsat" options={deals} value={dealId} onChange={setDealId} />
      </div>
    );
  } else if (stepKey === 'choose' && flow === 'category') {
    body = (
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="İşlem" className="grid grid-cols-2 gap-2.5">
          <OptionCard
            title="Kategoriye Ekle"
            on={categoryAdd}
            onClick={() => setCategoryAdd(true)}
          />
          <OptionCard
            title="Kategoriden Çıkar"
            on={!categoryAdd}
            onClick={() => setCategoryAdd(false)}
          />
        </div>
        <Label>Kategori</Label>
        <PickList
          label="Kategori"
          options={categories}
          value={categoryId}
          onChange={setCategoryId}
        />
      </div>
    );
  } else if (stepKey === 'choose' && flow === 'brand') {
    body = (
      <div className="flex flex-col gap-3">
        <Label>Yeni marka</Label>
        <PickList label="Marka" options={brandOptions} value={brandId} onChange={setBrandId} />
      </div>
    );
  } else if (stepKey === 'choose') {
    const sales = flow === 'sales';
    body = (
      <div
        role="radiogroup"
        aria-label={sales ? 'Satış durumu' : 'Stok takibi'}
        className="flex flex-col gap-2.5"
      >
        <OptionCard
          title={sales ? 'Satışa Aç' : 'Takibi Aç'}
          hint={sales ? 'Ürünler mağazada görünür' : 'Adet takip edilir'}
          on={flag === 'on'}
          onClick={() => setFlag('on')}
        />
        <OptionCard
          title={sales ? 'Satışa Kapat' : 'Takibi Kapat'}
          hint={sales ? 'Listede kalır, mağazada görünmez' : 'Ürün "Sınırsız" sayılır'}
          on={flag === 'off'}
          onClick={() => setFlag('off')}
        />
      </div>
    );
  } else {
    // Özet ve onay (fiyat dışı işlemler)
    const sentence =
      flow === 'deal'
        ? `${count} ürün için “${nameOf(deals, dealId)}” fırsatı ${dealAdd ? 'eklenecek' : 'kaldırılacak'}.`
        : flow === 'category'
          ? categoryAdd
            ? `${count} ürün “${nameOf(categories, categoryId)}” kategorisine eklenecek (mevcut kategorileri korunur).`
            : `${count} ürün “${nameOf(categories, categoryId)}” kategorisinden çıkarılacak.`
          : flow === 'brand'
            ? brandId === ''
              ? `${count} ürünün markası kaldırılacak (markasız olacak).`
              : `${count} ürünün markası “${nameOf(brands, brandId)}” olacak.`
            : flow === 'sales'
              ? `${count} ürün ${flag === 'on' ? 'satışa açılacak' : 'satışa kapatılacak'}.`
              : `${count} ürün için stok takibi ${flag === 'on' ? 'açılacak' : 'kapatılacak'}.`;
    const shown = Math.min(5, items.length);
    body = (
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl bg-surface-muted px-4 py-3 font-bold">{sentence}</p>
        <ul
          aria-label="Ürünler"
          className="divide-y divide-line rounded-2xl border border-line bg-surface"
        >
          {items.slice(0, shown).map((p) => (
            <li key={p.id} className="truncate px-4 py-2.5 text-sm font-semibold">
              {p.name}
            </li>
          ))}
          {count > shown ? (
            <li className="px-4 py-2.5 text-sm text-ink-muted">+ {count - shown} ürün daha</li>
          ) : null}
        </ul>
      </div>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={flow ? META[flow].title : `Toplu İşlem · ${count} ürün`}
      {...(flow ? { description: subtitle[stepKey] ?? '' } : {})}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {flow ? (
          <ol aria-label="Adımlar" className="flex gap-2">
            {steps.map((s, i) => (
              <li
                key={s}
                aria-current={i === step ? 'step' : undefined}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand-600' : 'bg-line'}`}
              />
            ))}
          </ol>
        ) : null}

        {body}

        {flow ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <div className="flex items-center gap-3">
              <Button variant="ghost" flow={false} fullWidth={false} onClick={back}>
                Geri
              </Button>
              <div className="flex-1">
                <Button
                  flow={false}
                  disabled={!ready || !canSave}
                  loading={busy}
                  loadingLabel="Uygulanıyor…"
                  onClick={() => (last ? apply() : setStep(step + 1))}
                >
                  {last ? 'Onaylıyorum' : 'Devam'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
