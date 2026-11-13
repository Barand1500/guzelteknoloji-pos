import { useEffect, useState } from 'react';
import type {
  CurrencyDto,
  NameItemDto,
  PriceListDto,
  StockLookups,
  TaxOfficeDto,
} from '@gt/shared';
import { apiRequest } from '../../../lib/http';
import { imageAddress } from '../../../lib/catalog-data';
import { Alert } from '../../../components/ui/Alert';
import { SelectField, type SelectOption } from './SiteSelect';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePublishSaveAction } from '../../app-shell/save-action';
import { useWorkspace } from '../../workspace/workspace-context';
import { demoCategoryService } from '../../categories/services/category.demo';
import { demoBrandService } from '../../brands/services/brand.demo';
import type { Category } from '../../categories/types';
import type { Brand } from '../../brands/types';
import { countryOptions } from '../../stock/countries';
import { fileToDataUrl, siteService } from '../services/site.service';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import { FieldGrid, ScreenCard } from './Parts';

const baseCurrency = [{ value: 'TRY', label: '₺ Türk Lirası' }];

const defaults = {
  kategori: '',
  marka: '',
  stokTipi: '',
  alisParaBirimi: '',
  birim: '',
  paraBirimi: '',
  kdv: '20',
  kdvDahil: 'false',
  iadeGun: '14',
  stokYok: 'Stokta Yok',
  stokYokGorselId: '',
  cariTipi: '',
  fiyatTanimi: '',
  fiyatSecimi: '',
  musteriTipi: '',
  vergiDairesi: '',
  ulke: '',
  stokGosterimi: '',
  satisParaBirimi: '',
  girisYonlendirme: '',
};

/**
 * İşletmenin kendi vergi dairesi listesi boşsa gösterilen il daireleri.
 * İlçe daireleri Tanımlamalar → Vergi Daireleri ekranından eklenir; o liste varsa bu kullanılmaz.
 */
const PROVINCE_TAX_OFFICES: SelectOption[] = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Amasya',
  'Ankara',
  'Antalya',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Isparta',
  'Mersin',
  'İstanbul',
  'İzmir',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Kahramanmaraş',
  'Mardin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Rize',
  'Sakarya',
  'Samsun',
  'Siirt',
  'Sinop',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Şanlıurfa',
  'Uşak',
  'Van',
  'Yozgat',
  'Zonguldak',
  'Aksaray',
  'Bayburt',
  'Karaman',
  'Kırıkkale',
  'Batman',
  'Şırnak',
  'Bartın',
  'Ardahan',
  'Iğdır',
  'Yalova',
  'Karabük',
  'Kilis',
  'Osmaniye',
  'Düzce',
].map((name) => ({
  value: `${name} Vergi Dairesi`,
  label: `${name} Vergi Dairesi`,
}));

/** Sunucudan gelen değer sabit listede yoksa görünür kalsın diye listeye eklenir. */
function withCurrent(options: readonly SelectOption[], value: string): SelectOption[] {
  if (!value || options.some((option) => option.value === value)) return [...options];
  return [...options, { value, label: value }];
}

/**
 * Bir yükleme başarısız olsa bile diğer seçenekler dolsun diye hata yutulur ve null döner.
 * (Önceden tek `Promise.all` vardı: bir uç düşünce bütün listeler boş kalıyordu.)
 */
async function settle<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}

/** Kategori listesini "Ana › Alt › Yaprak" etiketiyle düz listeye çevirir. */
function categoryOptions(categories: readonly Category[]): SelectOption[] {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const labelOf = (item: Category) => {
    const parts: string[] = [];
    const seen = new Set<string>();
    let current: Category | undefined = item;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      parts.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return parts.join(' › ');
  };
  return [
    { value: '', label: 'Kategori seçiniz.' },
    ...categories.map((item) => ({ value: item.id, label: labelOf(item) })),
  ];
}

function brandOptions(brands: readonly Brand[]): SelectOption[] {
  return [
    { value: '', label: 'Marka seçiniz.' },
    ...brands.map((item) => ({ value: item.id, label: item.name })),
  ];
}

/**
 * Varsayılanlar: yeni ürün/müşteri ve sistem için başlangıç değerleri (`site_defaults`).
 * Kategori, marka, para birimi, birim, fiyat listesi, stok/cari tipi ve vergi dairesi
 * seçenekleri POS'un gerçek listelerinden yüklenir; yalnızca para birimi için sabit yedek
 * liste vardır. Yüklenemeyen liste boş kalmaz, ekranın altında uyarı olarak söylenir.
 */
export function DefaultsScreen() {
  const { values, setValue, loading, ready, saving, error, message, save } = useSiteSettings(
    'site_defaults',
    defaults,
  );
  // Kaydet düğmesi sayfada değil, yüzen adadaki disket düğmesinde (Dock).
  usePublishSaveAction({ onSave: () => void save(), saving, disabled: loading || !ready });
  const { demo } = useWorkspace();
  const [stockImage, setStockImage] = useState<PickedImage | null>(null);
  const [stockUploading, setStockUploading] = useState(false);
  const [optionsProblem, setOptionsProblem] = useState<string | null>(null);
  const [categoryOptions_, setCategoryOptions] = useState<SelectOption[]>([
    { value: '', label: 'Kategori seçiniz.' },
  ]);
  const [brandOptions_, setBrandOptions] = useState<SelectOption[]>([
    { value: '', label: 'Marka seçiniz.' },
  ]);
  const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>(baseCurrency);
  const [unitOptions, setUnitOptions] = useState<SelectOption[]>([]);
  const [priceListOptions, setPriceListOptions] = useState<SelectOption[]>([]);
  const [stockTypeOptions, setStockTypeOptions] = useState<SelectOption[]>([]);
  const [customerTypeOptions, setCustomerTypeOptions] = useState<SelectOption[]>([]);
  const [taxOfficeOptions, setTaxOfficeOptions] = useState<SelectOption[]>([
    { value: '', label: 'Vergi Dairesi seçiniz.' },
  ]);
  const v = (key: keyof typeof defaults) => values[key] ?? '';

  useEffect(() => {
    let active = true;
    if (demo) {
      // Test oturumu: örnek kategoriler/markalar kullanılır, sunucuya gidilmez.
      void Promise.all([demoCategoryService.list(), demoBrandService.list()]).then(
        ([categories, brands]) => {
          if (!active) return;
          setCategoryOptions(categoryOptions(categories));
          setBrandOptions(brandOptions(brands));
        },
      );
      return () => {
        active = false;
      };
    }
    void Promise.all([
      settle(() => apiRequest<Category[]>('/api/kategoriler')),
      settle(() => apiRequest<Brand[]>('/api/markalar')),
      settle(() => apiRequest<CurrencyDto[]>('/api/para-birimleri')),
      settle(() => apiRequest<StockLookups>('/api/stok/secenekler')),
      settle(() => apiRequest<PriceListDto[]>('/api/cari-stok/fiyat-listeleri')),
      settle(() => apiRequest<NameItemDto[]>('/api/cari-stok/cari-tipleri')),
      settle(() => apiRequest<TaxOfficeDto[]>('/api/vergi-daireleri')),
    ]).then(
      ([categories, brands, currencies, stockLookups, priceLists, customerTypes, offices]) => {
        if (!active) return;
        const missing: string[] = [];
        if (categories) setCategoryOptions(categoryOptions(categories));
        else missing.push('kategori');
        if (brands) setBrandOptions(brandOptions(brands));
        else missing.push('marka');
        {
          // Ürün formunun kullandığı liste (TRY/USD/EUR) + işletmenin eklediği para birimleri.
          const base = stockLookups?.currencies ?? [];
          const extra = (currencies ?? [])
            .filter((item) => !base.some((option) => option.value === item.shortName))
            .map((item) => ({ value: item.shortName, label: `${item.symbol} ${item.name}` }));
          if (base.length + extra.length > 0) setCurrencyOptions([...base, ...extra]);
          else missing.push('para birimi');
        }
        if (stockLookups?.units.length) setUnitOptions(stockLookups.units);
        else missing.push('ölçü birimi');
        if (priceLists && priceLists.length > 0)
          // Müşteri kaydı fiyat listesini ad olarak saklar; ürün formu aynı adı seçenek koduna çözer.
          setPriceListOptions(priceLists.map((item) => ({ value: item.name, label: item.name })));
        else missing.push('fiyat listesi');
        if (stockLookups?.stockTypes.length) setStockTypeOptions(stockLookups.stockTypes);
        else missing.push('stok tipi');
        if (customerTypes && customerTypes.length > 0)
          setCustomerTypeOptions(
            customerTypes.map((item) => ({ value: item.name, label: item.name })),
          );
        else missing.push('cari tipi');
        if (offices) {
          const custom = offices.filter((item) => !item.builtin);
          setTaxOfficeOptions([
            { value: '', label: 'Vergi Dairesi seçiniz.' },
            ...(custom.length > 0
              ? custom.map((item) => ({ value: item.id, label: item.name }))
              : PROVINCE_TAX_OFFICES),
          ]);
        } else missing.push('vergi dairesi');
        setOptionsProblem(
          missing.length > 0
            ? `Şu listeler yüklenemedi: ${missing.join(', ')}. Yetkinizi ve bağlantıyı kontrol edin.`
            : null,
        );
      },
    );
    return () => {
      active = false;
    };
  }, [demo]);

  /** Stok olmama görseli gerçek oturumda yüklenir; dönen kimlik `stokYokGorselId`e yazılır. */
  const chooseStockImage = async (file: File | undefined) => {
    if (!file) return;
    if (demo) {
      pickImage(stockImage, file, setStockImage);
      return;
    }
    setStockUploading(true);
    try {
      const uploaded = await siteService.uploadImage('stok', await fileToDataUrl(file));
      setStockImage({ name: file.name, url: imageAddress(uploaded.url) ?? uploaded.url });
      setValue('stokYokGorselId', uploaded.id);
    } catch {
      setOptionsProblem('Görsel yüklenemedi. Tekrar deneyin.');
    } finally {
      setStockUploading(false);
    }
  };

  // Kayıtlı görsel varsa önizleme ondan gelir; yeni seçim yapılınca o kullanılır.
  const stockPreview =
    stockImage ??
    (v('stokYokGorselId')
      ? {
          name: 'Kayıtlı görsel',
          url: imageAddress(`/api/site/gorseller/${v('stokYokGorselId')}`) ?? '',
        }
      : null);

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard
        title="Ürün Varsayılanları"
        description="Yeni ürün eklenirken seçili gelecek değerler."
      >
        <div className="space-y-5">
          <FieldGrid>
            <SelectField
              label="Kategori"
              value={v('kategori')}
              options={withCurrent(categoryOptions_, v('kategori'))}
              onChange={(value) => setValue('kategori', value)}
            />
            <SelectField
              label="Marka"
              value={v('marka')}
              options={withCurrent(brandOptions_, v('marka'))}
              onChange={(value) => setValue('marka', value)}
            />
            <SelectField
              label="Stok Tipi"
              value={v('stokTipi')}
              options={withCurrent(stockTypeOptions, v('stokTipi'))}
              onChange={(value) => setValue('stokTipi', value)}
            />
            <SelectField
              label="Alış Para Birimi"
              value={v('alisParaBirimi')}
              options={withCurrent(currencyOptions, v('alisParaBirimi'))}
              onChange={(value) => setValue('alisParaBirimi', value)}
            />
            <SelectField
              label="Birim"
              value={v('birim')}
              options={withCurrent(unitOptions, v('birim'))}
              onChange={(value) => setValue('birim', value)}
            />
            <SelectField
              label="Para Birimi"
              value={v('paraBirimi')}
              options={withCurrent(currencyOptions, v('paraBirimi'))}
              onChange={(value) => setValue('paraBirimi', value)}
            />
            <SelectField
              label="KDV Oranı"
              value={v('kdv')}
              options={withCurrent(
                ['0', '1', '8', '10', '18', '20'].map((value) => ({
                  value,
                  label: `%${value}`,
                })),
                v('kdv'),
              )}
              onChange={(value) => setValue('kdv', value)}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">KDV Dahil</span>
              <ToggleSwitch
                label="Fiyatlar KDV dahil"
                checked={v('kdvDahil') === 'true'}
                onChange={(checked) => setValue('kdvDahil', String(checked))}
              />
            </div>
            <TextField
              label="İade/Değişim Zamanı (Gün)"
              numeric="integer"
              value={v('iadeGun')}
              onChange={(e) => setValue('iadeGun', e.target.value)}
            />
            <TextField
              label="Stok Olmama Yazısı"
              value={v('stokYok')}
              onChange={(e) => setValue('stokYok', e.target.value)}
            />
          </FieldGrid>
          <ImagePicker
            label="Stok Olmama Görseli"
            hint="1000×1000 piksel önerilir."
            value={stockPreview}
            busy={stockUploading}
            note={
              demo
                ? undefined
                : v('stokYokGorselId')
                  ? 'Görsel sunucuya yüklendi.'
                  : 'Yükleme için dosya seçin.'
            }
            onPick={(file) => void chooseStockImage(file)}
            onClear={() => {
              setStockImage(null);
              setValue('stokYokGorselId', '');
            }}
          />
        </div>
      </ScreenCard>

      <ScreenCard
        title="Müşteri Varsayılanları"
        description="Yeni müşteri kaydında kullanılacak başlangıç değerleri."
      >
        <FieldGrid>
          <SelectField
            label="Cari Tipi"
            value={v('cariTipi')}
            options={withCurrent(customerTypeOptions, v('cariTipi'))}
            onChange={(value) => setValue('cariTipi', value)}
          />
          <SelectField
            label="Fiyat Tanımı"
            value={v('fiyatTanimi')}
            options={withCurrent(priceListOptions, v('fiyatTanimi'))}
            onChange={(value) => setValue('fiyatTanimi', value)}
          />
          <SelectField
            label="Fiyat Seçimi"
            value={v('fiyatSecimi')}
            options={[
              { value: '', label: 'Seçiniz' },
              { value: '1', label: 'Fiyat 1' },
              { value: '2', label: 'Fiyat 2' },
              { value: '3', label: 'Fiyat 3' },
            ]}
            onChange={(value) => setValue('fiyatSecimi', value)}
          />
          <SelectField
            label="Müşteri Tipi"
            value={v('musteriTipi')}
            options={[
              { value: 'gercek', label: 'Gerçek' },
              { value: 'tuzel', label: 'Tüzel' },
            ]}
            onChange={(value) => setValue('musteriTipi', value)}
          />
          <SelectField
            label="Vergi Dairesi"
            value={v('vergiDairesi')}
            options={withCurrent(taxOfficeOptions, v('vergiDairesi'))}
            onChange={(value) => setValue('vergiDairesi', value)}
          />
          <SelectField
            label="Ülke"
            value={v('ulke')}
            options={withCurrent(
              [{ value: '', label: 'Ülke seçiniz.' }, ...countryOptions()],
              v('ulke'),
            )}
            onChange={(value) => setValue('ulke', value)}
          />
        </FieldGrid>
      </ScreenCard>

      <ScreenCard title="Sistem Varsayılanları">
        <FieldGrid>
          <SelectField
            label="Stok Gösterimi"
            value={v('stokGosterimi')}
            options={[
              { value: 'tam', label: 'Tam Stok Göster' },
              { value: 'adet', label: 'Yalnızca Adet Göster' },
            ]}
            onChange={(value) => setValue('stokGosterimi', value)}
          />
          <SelectField
            label="Satış Para Birimi"
            value={v('satisParaBirimi')}
            options={withCurrent(currencyOptions, v('satisParaBirimi'))}
            onChange={(value) => setValue('satisParaBirimi', value)}
          />
          <div className="sm:col-span-2">
            <TextField
              label="Giriş Yönlendirme Adresi"
              hint="Örn. /hesabim ya da https://…"
              value={v('girisYonlendirme')}
              onChange={(e) => setValue('girisYonlendirme', e.target.value)}
            />
          </div>
        </FieldGrid>
      </ScreenCard>

      {optionsProblem && <Alert tone="info">{optionsProblem}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="info">{message}</Alert>}
    </div>
  );
}
