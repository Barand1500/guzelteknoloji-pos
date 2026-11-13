import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { useWorkspace } from '../../workspace/workspace-context';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePublishSaveAction } from '../../app-shell/save-action';
import { fileToDataUrl, siteService } from '../services/site.service';
import { ScreenCard } from './Parts';

const defaults = {
  head: '',
  body: '',
  kod3: '',
  kod4: '',
  play1: '',
  store: '',
  play2: '',
  link4: '',
};

/**
 * Sistem Ayarları (e-ticaret): site kimliği/iletişim alanları Genel Ayarlar'a taşındı.
 * Burada yalnızca bildirimler, özel kodlar, uygulama linkleri, köşe yazısı ve
 * kök dizin dosyaları kalır. Alanlar `site_system` bölümüne kaydedilir; kodlar çalıştırılmaz.
 */
export function SystemSettingsScreen() {
  const { values, setValue, loading, ready, saving, error, message, save } = useSiteSettings(
    'site_system',
    defaults,
  );
  // Kaydet düğmesi sayfada değil, yüzen adadaki disket düğmesinde (Dock).
  usePublishSaveAction({ onSave: () => void save(), saving, disabled: loading || !ready });
  const { demo } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const v = (key: keyof typeof defaults) => values[key] ?? '';

  return (
    <div className="flex flex-col gap-4">
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
            label="Head Kodu"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={v('head')}
            onChange={(e) => setValue('head', e.target.value)}
          />
          <TextAreaField
            label="Body Kodu"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={v('body')}
            onChange={(e) => setValue('body', e.target.value)}
          />
          <TextAreaField
            label="Etbis Kodu"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={v('kod3')}
            onChange={(e) => setValue('kod3', e.target.value)}
          />
          <TextAreaField
            label="TR Güvenlik Damgası Kodu"
            rows={4}
            className="font-mono text-xs"
            spellCheck={false}
            value={v('kod4')}
            onChange={(e) => setValue('kod4', e.target.value)}
          />
        </div>
      </ScreenCard>

      <ScreenCard title="Uygulama Linkleri">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="App Store Linki"
            value={v('store')}
            onChange={(e) => setValue('store', e.target.value)}
          />
          <TextField
            label="App Store MacOS Linki"
            value={v('play2')}
            onChange={(e) => setValue('play2', e.target.value)}
          />
          <TextField
            label="Google Play Linki"
            value={v('play1')}
            onChange={(e) => setValue('play1', e.target.value)}
          />
          <TextField
            label="Windows Store Linki"
            value={v('link4')}
            onChange={(e) => setValue('link4', e.target.value)}
          />
        </div>
      </ScreenCard>



      <ScreenCard
        title="Ana Dizin Dosya Yüklemeleri"
        description="Site köküne konacak doğrulama dosyaları."
      >
        <div className="space-y-3">
          <input
            type="file"
            aria-label="Ana dizin dosyası seç"
            accept=".html,.htm,.txt,.xml"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setUploadMessage(null);
              setUploadError(null);
            }}
            className="block w-full max-w-md rounded-2xl border border-field-border bg-surface-raised p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-sm file:font-semibold"
          />
          {file && <p className="text-sm text-ink-muted">Seçilen dosya: {file.name}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              fullWidth={false}
              flow={false}
              loading={uploading}
              disabled={!file || uploading}
              onClick={() =>
                void (async () => {
                  if (!file || uploading) return;
                  if (demo) {
                    setUploadMessage('Test modunda dosya yüklenmez.');
                    return;
                  }
                  setUploading(true);
                  setUploadError(null);
                  setUploadMessage(null);
                  try {
                    const dataUrl = await fileToDataUrl(file);
                    const result = await siteService.uploadRootFile(file.name, dataUrl);
                    setUploadMessage(
                      `${result.name} yüklendi. Dosya sunucuda işletmenin kök klasöründe duruyor; site yayına alınınca sunulacak.`,
                    );
                    setFile(null);
                  } catch (e) {
                    setUploadError(dataError(e));
                  } finally {
                    setUploading(false);
                  }
                })()
              }
            >
              Yükle
            </Button>
            <span className="text-xs text-ink-muted">HTML, TXT veya XML · en çok 1 MB.</span>
          </div>
          {uploadError && <Alert tone="error">{uploadError}</Alert>}
          {uploadMessage && <Alert tone="info">{uploadMessage}</Alert>}
        </div>
      </ScreenCard>

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="info">{message}</Alert>}
    </div>
  );
}
