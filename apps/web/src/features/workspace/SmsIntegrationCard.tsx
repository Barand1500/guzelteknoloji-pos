import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/SelectField';
import { TextField } from '../../components/ui/TextField';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';

const panel = 'rounded-3xl border border-line bg-surface-raised p-4 sm:p-6';

/**
 * SMS entegrasyonu, Entegrasyonlar > İletişim altında SMTP/IMAP/WhatsApp ile birlikte durur.
 * Gerçek SMS gönderimi ve kayıt backend bağlantısı gelince açılacak; bu ekran yalnızca hazırlıktır.
 */
export function SmsIntegrationCard() {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState('netgsm');
  const [values, setValues] = useState({
    apiUrl: '',
    username: '',
    apiKey: '',
    sender: '',
    testNumber: '',
  });
  const set = (key: keyof typeof values, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  return (
    <section aria-label="SMS" className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold">SMS</h2>
          <p className="text-sm text-ink-muted">
            Bildirim SMS’leri için servis sağlayıcı bilgileri.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Durum</span>
          <ToggleSwitch
            label="SMS entegrasyonu aktif"
            checked={enabled}
            onChange={setEnabled}
          />
          <span className="text-sm text-ink-muted">{enabled ? 'Aktif' : 'Pasif'}</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Sağlayıcı"
          value={provider}
          options={[
            { value: 'netgsm', label: 'Netgsm' },
            { value: 'iletimerkezi', label: 'İletimerkezi' },
            { value: 'mutlucell', label: 'Mutlucell' },
            { value: 'twilio', label: 'Twilio' },
            { value: 'diger', label: 'Diğer' },
          ]}
          onChange={setProvider}
        />
        <TextField
          label="API Adresi"
          hint="Sağlayıcı varsayılanı kullanılacaksa boş bırakılabilir."
          value={values.apiUrl}
          onChange={(e) => set('apiUrl', e.target.value)}
        />
        <TextField
          label="Kullanıcı / Hesap Adı"
          value={values.username}
          onChange={(e) => set('username', e.target.value)}
        />
        <TextField
          label="API Anahtarı / Şifre"
          type="password"
          autoComplete="new-password"
          value={values.apiKey}
          onChange={(e) => set('apiKey', e.target.value)}
        />
        <TextField
          label="Gönderici Başlığı"
          hint="Operatör tarafından onaylanmış başlık."
          value={values.sender}
          onChange={(e) => set('sender', e.target.value)}
        />
        <TextField
          label="Test Telefon Numarası"
          value={values.testNumber}
          onChange={(e) => set('testNumber', e.target.value)}
        />
      </div>

      <Alert tone="info">
        <span id="sms-backend-notice">
          Kaydetme ve test gönderimi backend bağlantısı gelince açılacak. API anahtarı maskeli
          tutulur; bu ekranda gerçek değer saklanmaz.
        </span>
      </Alert>

      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" disabled fullWidth={false} aria-describedby="sms-backend-notice">
          Test SMS Gönder
        </Button>
        <span className="text-xs text-ink-muted">
          SMS ayarları, backend bağlantısı gelince sayfanın altındaki kaydet ile saklanacak.
        </span>
      </div>
    </section>
  );
}
