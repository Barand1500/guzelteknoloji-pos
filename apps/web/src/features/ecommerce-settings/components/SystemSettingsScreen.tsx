import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { BACKEND_NOTICE_ID, SaveBar, ScreenCard } from './Parts';

/**
 * Sistem Ayarları (e-ticaret): site kimliği/iletişim alanları Genel Ayarlar'a taşındı.
 * Burada yalnızca bildirimler, özel kodlar, uygulama linkleri, köşe yazısı, istatistik ve
 * kök dizin dosyaları kalır. Hiçbir alan sunucuya gönderilmez; kodlar çalıştırılmaz.
 */
export function SystemSettingsScreen() {
  const [values, setValues] = useState({
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
  const [fileName, setFileName] = useState('');
  const set = (key: keyof typeof values, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
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
