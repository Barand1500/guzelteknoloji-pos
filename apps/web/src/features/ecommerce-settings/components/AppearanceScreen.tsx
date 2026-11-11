import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { SaveBar, ScreenCard } from './Parts';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import { setImageDisplay, useImageDisplay } from '../image-display';

/** Boyutlandırma kartlarında iki seçenekte de aynı örnek görsel kullanılır. */
const SAMPLE_IMAGE = '/image-sample.svg';

interface PickedFile {
  name: string;
  url: string;
}

/**
 * Logo/Favicon alanı: solda ~272 px dosya seçimi, hemen sağında büyük önizleme.
 * Alt alta ad + küçük resim + kaldır kutusu yığını yerine tek satırda kalır.
 */
function CompactImageField({
  label,
  hint,
  value,
  onPick,
  onClear,
}: {
  label: string;
  hint?: string;
  value: PickedFile | null;
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
            onChange={(event) => onPick(event.target.files?.[0])}
            className="block w-full rounded-2xl border border-field-border bg-surface-raised p-2.5 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold"
          />
          {value && (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-ink-muted">{value.name}</span>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 text-xs font-semibold text-danger hover:underline"
              >
                Kaldır
              </button>
            </div>
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
  'Kargo Hesaplanmasın',
  'KDV Dahil Sat',
  'Satış Para Birimi Site Geneli Aktifleşsin',
  'Katalog Modu Fiyat Gösterimi',
  'Sanal POS Hedef Kullanımı',
  'Google Giriş',
  'Apple Giriş',
  'Dinamik Filtre Gösterimi',
  'Serbest Ödeme',
  'Kredi Yükleme ve Hesap Hareketleri',
  'Tüm Kampanyaları Anasayfada Göster',
  'Kar Marjı',
  'B2C Bayilik Başvuru',
] as const;

export function AppearanceScreen() {
  const [color, setColor] = useState('#f97316');
  const [logo, setLogo] = useState<PickedFile | null>(null);
  const [favicon, setFavicon] = useState<PickedFile | null>(null);
  const display = useImageDisplay();
  const shape = display.shape;
  const fit = display.fit;
  const [popup, setPopup] = useState<PickedImage | null>(null);
  const [popupLink, setPopupLink] = useState('');
  const [campaign, setCampaign] = useState<PickedImage | null>(null);
  const [campaignLink, setCampaignLink] = useState('');
  const [options, setOptions] = useState<Record<string, boolean>>({
    'Kargo Hesaplanmasın': true,
    'KDV Dahil Sat': false,
    'Dinamik Filtre Gösterimi': true,
    'Serbest Ödeme': true,
    'Kar Marjı': true,
    'B2C Bayilik Başvuru': true,
  });

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard title="Marka Kimliği">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold">Uygulama Ana Rengi *</p>
              <input
                type="color"
                aria-label="Uygulama ana rengi"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-surface-raised p-1"
              />
            </div>
            <div className="w-40">
              <TextField
                label="Renk Kodu"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <span
              className="h-12 flex-1 rounded-xl"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <CompactImageField
              label="Logo"
              hint="Açık zeminde okunmalı."
              value={logo}
              onPick={(file) => pickImage(logo, file, setLogo)}
              onClear={() => setLogo(null)}
            />
            <CompactImageField
              label="Favicon"
              hint="Kare ve küçük boyutta net olmalı."
              value={favicon}
              onPick={(file) => pickImage(favicon, file, setFavicon)}
              onClear={() => setFavicon(null)}
            />
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Resim Ayarları">
        <div className="grid gap-6 xl:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="mb-3 text-sm font-semibold">Resim Gösterim Şekli</legend>
            <div className="grid max-w-md grid-cols-3 gap-3">
              {SHAPES.map((option) => {
                const active = shape === option.value;
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
                      onChange={() => setImageDisplay({ shape: option.value })}
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
                const active = fit === option.value;
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
                      onChange={() => setImageDisplay({ fit: option.value })}
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

      <ScreenCard title="Popup ve Kampanya Görseli" description="Duyuru penceresi ve üst kampanya şeridi.">
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-3">
            <ImagePicker
              label="Popup"
              value={popup}
              onPick={(file) => pickImage(popup, file, setPopup)}
              onClear={() => setPopup(null)}
            />
            <TextField
              label="Popup Link"
              value={popupLink}
              onChange={(e) => setPopupLink(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <ImagePicker
              label="Üst Kampanya Görseli"
              value={campaign}
              onPick={(file) => pickImage(campaign, file, setCampaign)}
              onClear={() => setCampaign(null)}
            />
            <TextField
              label="Üst Kampanya Görseli Link"
              value={campaignLink}
              onChange={(e) => setCampaignLink(e.target.value)}
            />
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Sistem Seçenekleri">
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {OPTIONS.map((option) => (
            <div
              key={option}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2"
            >
              <span className="text-sm font-semibold">{option}</span>
              <ToggleSwitch
                label={option}
                checked={!!options[option]}
                onChange={(value) =>
                  setOptions((previous) => ({ ...previous, [option]: value }))
                }
              />
            </div>
          ))}
        </div>
      </ScreenCard>

      <Alert tone="info">
        Seçimler yalnızca bu ekranda tutulur; siteye uygulanması ve kaydı ayrı bir aşamadır.
      </Alert>
      <SaveBar label="Değişiklikleri Kaydet" />
    </div>
  );
}
