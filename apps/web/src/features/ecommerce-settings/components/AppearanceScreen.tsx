import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { useWorkspace } from '../../workspace/workspace-context';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePublishSaveAction } from '../../app-shell/save-action';
import { fileToDataUrl, siteService } from '../services/site.service';
import { ScreenCard } from './Parts';

/** Ayarlar sunucusundaki bölüm anahtarı (bkz. `docs/eticaret-site-api.md`). */
const SECTION = 'site_appearance';

/** Varsayılan marka rengi; sunucuda değer yoksa kullanılır. */
const DEFAULT_COLOR = '#f97316';

/**
 * Sunucuda değer yoksa kullanılan başlangıç değerleri. Booleanlar sunucuda `'true'`/`'false'`
 * metni olarak tutulur.
 */
const DEFAULTS: Record<string, string> = {
  color: DEFAULT_COLOR,
  shape: 'yatay',
  fit: 'sigdir',
  logoId: '',
  faviconId: '',
  popupId: '',
  popupLink: '',
  campaignId: '',
  campaignLink: '',
  kargoHesaplanmasin: 'true',
  kdvDahilSat: 'false',
  satisParaBirimiSite: 'false',
  katalogFiyat: 'false',
  sanalPos: 'false',
  googleGiris: 'false',
  appleGiris: 'false',
  dinamikFiltre: 'true',
  serbestOdeme: 'true',
  krediYukleme: 'false',
  tumKampanyalar: 'false',
  karMarji: 'true',
  b2cBayilik: 'true',
};

/** Boyutlandırma kartlarında iki seçenekte de aynı örnek görsel kullanılır. */
const SAMPLE_IMAGE = '/image-sample.svg';

type ImageKind = 'logo' | 'favicon' | 'popup' | 'kampanya';

/** Görsel türü → ayar alanı (yüklemeden dönen kimlik buraya yazılır). */
const IMAGE_FIELDS: Record<ImageKind, string> = {
  logo: 'logoId',
  favicon: 'faviconId',
  popup: 'popupId',
  kampanya: 'campaignId',
};

const IMAGE_META: Record<ImageKind, { label: string; hint: string }> = {
  logo: { label: 'Logo', hint: 'Açık zeminde okunmalı.' },
  favicon: { label: 'Favicon', hint: 'Kare ve küçük boyutta net olmalı.' },
  popup: { label: 'Popup', hint: 'Duyuru penceresinde gösterilir.' },
  kampanya: { label: 'Üst Kampanya Görseli', hint: 'Üst kampanya şeridinde gösterilir.' },
};

interface PickedFile {
  name?: string;
  url: string;
}

/** Sunucuda saklı görselin önizleme adresi (uç: `GET /api/site/gorseller/:id`). */
const siteImageUrl = (id: string) => `/api/site/gorseller/${encodeURIComponent(id)}`;

/**
 * Logo/Favicon/Popup/Kampanya alanı: solda ~272 px dosya seçimi, hemen sağında büyük önizleme.
 * Alt alta ad + küçük resim + kaldır kutusu yığını yerine tek satırda kalır.
 */
function CompactImageField({
  label,
  hint,
  value,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  hint?: string;
  value: PickedFile | null;
  busy?: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 sm:max-w-[17rem]">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            aria-label={`${label} dosyası seç`}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onPick(file);
              // Aynı dosya yeniden seçilebilsin.
              event.target.value = '';
            }}
            className="block w-full rounded-2xl border border-field-border bg-surface-raised p-2.5 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold"
          />
          {busy ? (
            <p className="mt-1 text-xs text-ink-muted">Yükleniyor…</p>
          ) : (
            value && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ink-muted">
                  {value.name ?? 'Kayıtlı görsel'}
                </span>
                <button
                  type="button"
                  onClick={onClear}
                  className="shrink-0 text-xs font-semibold text-danger hover:underline"
                >
                  Kaldır
                </button>
              </div>
            )
          )}
        </div>
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-muted p-2 sm:w-32">
          {value ? (
            <img
              src={value.url}
              alt={`${label} önizlemesi`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-ink-muted">Önizleme yok</span>
          )}
        </div>
      </div>
    </div>
  );
}

const SHAPES = [
  { value: 'kare', label: 'Kare', box: 'size-14' },
  { value: 'yatay', label: 'Yatay Dikdörtgen', box: 'h-12 w-20' },
  { value: 'dikey', label: 'Dikey Dikdörtgen', box: 'h-20 w-12' },
] as const;

const FITS = [
  { value: 'kirp', label: 'KIRP', fit: 'object-cover' },
  { value: 'sigdir', label: 'SIĞDIR', fit: 'object-contain' },
] as const;

const OPTIONS = [
  { key: 'kargoHesaplanmasin', label: 'Kargo Hesaplanmasın' },
  { key: 'kdvDahilSat', label: 'KDV Dahil Sat' },
  { key: 'satisParaBirimiSite', label: 'Satış Para Birimi Site Geneli Aktifleşsin' },
  { key: 'katalogFiyat', label: 'Katalog Modu Fiyat Gösterimi' },
  { key: 'sanalPos', label: 'Sanal POS Hedef Kullanımı' },
  { key: 'googleGiris', label: 'Google Giriş' },
  { key: 'appleGiris', label: 'Apple Giriş' },
  { key: 'dinamikFiltre', label: 'Dinamik Filtre Gösterimi' },
  { key: 'serbestOdeme', label: 'Serbest Ödeme' },
  { key: 'krediYukleme', label: 'Kredi Yükleme ve Hesap Hareketleri' },
  { key: 'tumKampanyalar', label: 'Tüm Kampanyaları Anasayfada Göster' },
  { key: 'karMarji', label: 'Kar Marjı' },
  { key: 'b2cBayilik', label: 'B2C Bayilik Başvuru' },
] as const;

/**
 * Görünüm ayarları: alanlar `site_appearance` bölümünden okunur ve tek "Kaydet" ile yazılır.
 * Görsel seçimleri Base64'e çevrilip `/api/site/gorseller` ucuna yüklenir; dönen kimlik alana,
 * dönen adres önizlemeye yazılır. Test (demo) oturumunda yükleme yapılmaz, yerel önizleme kullanılır.
 */
export function AppearanceScreen() {
  const { demo } = useWorkspace();
  const { values, setValue, loading, ready, saving, error, message, save } = useSiteSettings(
    SECTION,
    DEFAULTS,
  );
  const color = values.color ?? DEFAULT_COLOR;
  // Renk kodu serbest metin: geçersiz değer kaydedilirse site teması bozulur.
  const validColor = /^#[0-9a-f]{6}$/i.test(color);
  // Kaydet düğmesi sayfada değil, yüzen adadaki disket düğmesinde (Dock).
  usePublishSaveAction({
    onSave: () => void save(),
    saving,
    disabled: loading || !ready || !validColor,
  });
  const [images, setImages] = useState<Partial<Record<ImageKind, PickedFile>>>({});
  const [uploading, setUploading] = useState<ImageKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const objectUrls = useRef<Partial<Record<ImageKind, string>>>({});

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of Object.values(urls)) if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const revoke = (kind: ImageKind) => {
    const url = objectUrls.current[kind];
    if (url) URL.revokeObjectURL(url);
    delete objectUrls.current[kind];
  };

  const pick = async (kind: ImageKind, file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (demo) {
      // Demo: sunucuya yüklenmez; yalnızca nesne adresiyle önizleme.
      revoke(kind);
      const url = URL.createObjectURL(file);
      objectUrls.current[kind] = url;
      setImages((previous) => ({ ...previous, [kind]: { name: file.name, url } }));
      return;
    }
    setUploading(kind);
    try {
      const dataUrl = await fileToDataUrl(file);
      const uploaded = await siteService.uploadImage(kind, dataUrl);
      setValue(IMAGE_FIELDS[kind], uploaded.id);
      revoke(kind);
      setImages((previous) => ({ ...previous, [kind]: { name: file.name, url: uploaded.url } }));
    } catch (e) {
      setUploadError(dataError(e));
    } finally {
      setUploading(null);
    }
  };

  const clearImage = (kind: ImageKind) => {
    revoke(kind);
    setImages((previous) => {
      const next = { ...previous };
      delete next[kind];
      return next;
    });
    setValue(IMAGE_FIELDS[kind], '');
  };

  const previewOf = (kind: ImageKind): PickedFile | null => {
    const local = images[kind];
    if (local) return local;
    const id = values[IMAGE_FIELDS[kind]];
    return id && /^\d+$/.test(id) ? { name: `Kayıtlı görsel #${id}`, url: siteImageUrl(id) } : null;
  };

  const field = (kind: ImageKind) => (
    <CompactImageField
      key={kind}
      label={IMAGE_META[kind].label}
      hint={IMAGE_META[kind].hint}
      value={previewOf(kind)}
      busy={uploading === kind}
      onPick={(file) => void pick(kind, file)}
      onClear={() => clearImage(kind)}
    />
  );

  if (loading) {
    return <div className="h-80 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      {uploadError && <Alert tone="error">{uploadError}</Alert>}

      <ScreenCard title="Marka Kimliği">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold">Uygulama Ana Rengi *</p>
              <input
                type="color"
                aria-label="Uygulama ana rengi"
                value={color}
                onChange={(e) => setValue('color', e.target.value)}
                className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-surface-raised p-1"
              />
            </div>
            <div className="w-40">
              <TextField
                label="Renk Kodu"
                value={color}
                onChange={(e) => setValue('color', e.target.value)}
              />
            </div>
            <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface-raised px-3">
              <span
                className="size-8 rounded-lg border border-line"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-ink-muted">Önizleme</span>
            </span>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {(['logo', 'favicon'] as const).map(field)}
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Resim Ayarları">
        <div className="grid gap-6 xl:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="mb-3 text-sm font-semibold">Resim Gösterim Şekli</legend>
            <div className="grid max-w-md grid-cols-3 gap-3">
              {SHAPES.map((option) => {
                const active = values.shape === option.value;
                return (
                  <label
                    key={option.value}
                    className={[
                      'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-2 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600',
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-ink'
                        : 'border-line bg-surface-muted/40 text-ink-muted hover:border-brand-500',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="resim-gosterim"
                      value={option.value}
                      checked={active}
                      onChange={() => setValue('shape', option.value)}
                      className="sr-only"
                    />
                    <span className="flex h-24 w-full items-center justify-center">
                      <span
                        className={`${option.box} flex items-center justify-center rounded-md ${
                          active ? 'bg-brand-600/15' : 'bg-surface-muted'
                        }`}
                      >
                        <ImageIcon
                          className={`size-5 ${active ? 'text-brand-ink' : 'text-ink-muted'}`}
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                    <span className="text-[11px] leading-tight font-bold uppercase break-words">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-3 text-sm font-semibold">Resim Boyutlandırma Şekli</legend>
            <div className="flex max-w-xs gap-3">
              {FITS.map((option) => {
                const active = values.fit === option.value;
                return (
                  <label
                    key={option.value}
                    className={[
                      'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-2 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600',
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-ink'
                        : 'border-line bg-surface-muted/40 text-ink-muted hover:border-brand-500',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="resim-boyutlandirma"
                      value={option.value}
                      checked={active}
                      onChange={() => setValue('fit', option.value)}
                      className="sr-only"
                    />
                    <span className="block h-24 w-20 overflow-hidden rounded-lg bg-surface-muted">
                      <img
                        src={SAMPLE_IMAGE}
                        alt=""
                        className={`size-full ${option.fit}`}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-[11px] font-bold uppercase">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </ScreenCard>

      <ScreenCard
        title="Popup ve Kampanya Görseli"
        description="Duyuru penceresi ve üst kampanya şeridi."
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-3">
            {field('popup')}
            <TextField
              label="Popup Link"
              value={values.popupLink ?? ''}
              onChange={(e) => setValue('popupLink', e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {field('kampanya')}
            <TextField
              label="Üst Kampanya Görseli Link"
              value={values.campaignLink ?? ''}
              onChange={(e) => setValue('campaignLink', e.target.value)}
            />
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Sistem Seçenekleri">
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {OPTIONS.map((option) => (
            <div
              key={option.key}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2"
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <ToggleSwitch
                label={option.label}
                checked={values[option.key] === 'true'}
                onChange={(value) => setValue(option.key, value ? 'true' : 'false')}
              />
            </div>
          ))}
        </div>
      </ScreenCard>

      {!validColor && <Alert tone="error">Renk kodu #RRGGBB biçiminde olmalı.</Alert>}
      {message && <Alert tone="info">{message}</Alert>}
    </div>
  );
}
