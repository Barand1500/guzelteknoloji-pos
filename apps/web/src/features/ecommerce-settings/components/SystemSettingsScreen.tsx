import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import { BACKEND_NOTICE_ID, SaveBar, ScreenCard } from './Parts';

/**
 * Sistem Ayarları — referans görseldeki bölüm adları ve alan sırası korunur:
 * Sistem Ayarları · Sistem Bildirimleri · Özel Sistem Kodları · Köşe Yazısı · Uygulama Linkleri ·
 * Ziyaretçi İstatistikleri · Ana Dizin Dosya Yüklemeleri.
 * Hiçbir alan sunucuya gönderilmez; kodlar düz metin olarak düzenlenir, çalıştırılmaz.
 */
export function SystemSettingsScreen() {
  const [values, setValues] = useState({
    firmaAdi: 'Güzel Teknoloji',
    iletisimEposta: 'info@guzelteknoloji.com',
    gsm: '0850 000 00 00',
    adres: '',
    siteEposta: 'info@guzelteknoloji.com',
    siteUrl: 'https://guzelteknoloji.com',
    firmaEposta: 'info@guzelteknoloji.com',
    bildirimEposta: '',
    bildirimNumara: '',
    head: '',
    body: '',
    kod3: '',
    kod4: '',
    koseYazisi: '',
    play1: '',
    store: '',
    play2: '',
    link4: '',
    istatistik: '',
  });
  const [koseGizli, setKoseGizli] = useState(false);
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [fileName, setFileName] = useState('');
  const set = (key: keyof typeof values, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard title="Sistem Ayarları">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              label="Firma Adı"
              value={values.firmaAdi}
              onChange={(e) => set('firmaAdi', e.target.value)}
            />
            <TextField
              label="İletişim E-postası"
              type="email"
              value={values.iletisimEposta}
              onChange={(e) => set('iletisimEposta', e.target.value)}
            />
            <TextField
              label="GSM No"
              value={values.gsm}
              onChange={(e) => set('gsm', e.target.value)}
            />
            <TextField
              label="Adres"
              value={values.adres}
              onChange={(e) => set('adres', e.target.value)}
            />
            <TextField
              label="Site E-posta"
              type="email"
              value={values.siteEposta}
              onChange={(e) => set('siteEposta', e.target.value)}
            />
            <TextField
              label="Site URL"
              value={values.siteUrl}
              onChange={(e) => set('siteUrl', e.target.value)}
            />
            <TextField
              label="Firma E-posta"
              type="email"
              value={values.firmaEposta}
              onChange={(e) => set('firmaEposta', e.target.value)}
            />
          </div>
          <ImagePicker
            label="Resim Seç"
            hint="Yükleme hakkında kısa not: dosya yalnızca önizlenir, sunucuya gönderilmez."
            value={logo}
            onPick={(file) => pickImage(logo, file, setLogo)}
            onClear={() => setLogo(null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button flow={false} type="button" disabled fullWidth={false} aria-describedby={BACKEND_NOTICE_ID}>
              Resimleri Yükle
            </Button>
            <span className="text-xs text-ink-muted">
              Yükleme backend bağlantısı gelince açılacak.
            </span>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Sistem Bildirimleri">
        <div className="space-y-5">
          <TextAreaField
            label="Bildirim E-Posta Adresleri"
            rows={3}
            value={values.bildirimEposta}
            onChange={(e) => set('bildirimEposta', e.target.value)}
          />
          <p className="-mt-3 text-xs text-ink-muted">Her satıra bir e-posta adresi yazın.</p>
          <TextAreaField
            label="Bildirim Kısa Numaraları"
            rows={3}
            value={values.bildirimNumara}
            onChange={(e) => set('bildirimNumara', e.target.value)}
          />
          <p className="-mt-3 text-xs text-ink-muted">Her satıra bir numara yazın.</p>
        </div>
      </ScreenCard>

      <ScreenCard
        title="Özel Sistem Kodları"
        description="Kodlar düz metin olarak saklanır; bu ekranda çalıştırılmaz."
      >
        <div className="space-y-5">
          <Alert tone="error">
            Bu alanlara yalnızca güvenilir kaynaklardan gelen kodu yapıştırın. Sayfaya eklenen
            script’ler ziyaretçilerin tarayıcısında çalışır; gizli anahtar yazılmaz.
          </Alert>
          <TextAreaField
            label="Head Kodları"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={values.head}
            onChange={(e) => set('head', e.target.value)}
          />
          <TextAreaField
            label="Body Kodları"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={values.body}
            onChange={(e) => set('body', e.target.value)}
          />
          <TextAreaField
            label="Üçüncü Kod Alanı"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={values.kod3}
            onChange={(e) => set('kod3', e.target.value)}
          />
          {/* 3. ve 4. kod alanının referans etiketi net değil; başlıklar geçici (kullanıcıya not gösterilmez). */}
          <TextAreaField
            label="Dördüncü Kod Alanı"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={values.kod4}
            onChange={(e) => set('kod4', e.target.value)}
          />
        </div>
      </ScreenCard>

      <ScreenCard title="Köşe Yazısı">
        <div className="space-y-4">
          <TextAreaField
            label="Köşe Yazısı"
            rows={2}
            value={values.koseYazisi}
            onChange={(e) => set('koseYazisi', e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Gizli</span>
              <ToggleSwitch
                label="Köşe yazısını gizle"
                checked={koseGizli}
                onChange={setKoseGizli}
              />
            </div>
            <Button flow={false} type="button" disabled fullWidth={false} aria-describedby={BACKEND_NOTICE_ID}>
              Kayıt Et
            </Button>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Uygulama Linkleri">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Google Play Linki"
            value={values.play1}
            onChange={(e) => set('play1', e.target.value)}
          />
          <TextField
            label="App Store Linki"
            value={values.store}
            onChange={(e) => set('store', e.target.value)}
          />
          <TextField
            label="İkinci Google Play Bağlantısı"
            value={values.play2}
            onChange={(e) => set('play2', e.target.value)}
          />
          <TextField
            label="Dördüncü Uygulama Bağlantısı"
            value={values.link4}
            onChange={(e) => set('link4', e.target.value)}
          />
        </div>
        <div className="mt-4">
          <SaveBar label="Değişiklikleri Kaydet" />
        </div>
      </ScreenCard>

      <ScreenCard title="Ziyaretçi İstatistikleri">
        <TextAreaField
          label="İstatistik Kodu"
          rows={3}
          className="font-mono text-xs"
          spellCheck={false}
          value={values.istatistik}
          onChange={(e) => set('istatistik', e.target.value)}
        />
      </ScreenCard>

      <ScreenCard
        title="Ana Dizin Dosya Yüklemeleri"
        description="Site köküne konacak doğrulama dosyaları."
      >
        <div className="space-y-3">
          <input
            type="file"
            aria-label="Ana dizin dosyası seç"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            className="block w-full max-w-md rounded-2xl border border-field-border bg-surface-raised p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-sm file:font-semibold"
          />
          {fileName && <p className="text-sm text-ink-muted">Seçilen dosya: {fileName}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button flow={false} type="button" disabled fullWidth={false} aria-describedby={BACKEND_NOTICE_ID}>
              Yükle
            </Button>
            <span className="text-xs text-ink-muted">
              Dosya yükleme backend bağlantısı gelince açılacak.
            </span>
          </div>
        </div>
      </ScreenCard>
    </div>
  );
}
