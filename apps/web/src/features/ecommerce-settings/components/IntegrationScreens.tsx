import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { Badge, FieldGrid, SaveBar, ScreenCard } from './Parts';

/** ERP Entegrasyon Bilgileri: referanstaki alan sırası ve adları korunur; test/kayıt kapalı. */
export function ErpScreen() {
  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState({
    apiUrl: '',
    server: '',
    database: '',
    username: '',
    password: '',
  });
  const set = (key: keyof typeof values, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  return (
    <ScreenCard
      title="ERP Entegrasyon Bilgileri"
      description="Vega erp entegrasyonunu bu sayfadan gerçekleştiriniz."
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Durum</span>
          <ToggleSwitch
            label="ERP entegrasyonu aktif"
            checked={enabled}
            onChange={setEnabled}
          />
          <Badge tone={enabled ? 'brand' : 'muted'}>{enabled ? 'Açık' : 'Kapalı'}</Badge>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField
          label="API URL"
          required
          value={values.apiUrl}
          onChange={(e) => set('apiUrl', e.target.value)}
        />
        <FieldGrid>
          <TextField
            label="Sunucu"
            required
            value={values.server}
            onChange={(e) => set('server', e.target.value)}
          />
          <TextField
            label="Veritabanı"
            required
            value={values.database}
            onChange={(e) => set('database', e.target.value)}
          />
          <TextField
            label="Kullanıcı Adı"
            required
            value={values.username}
            onChange={(e) => set('username', e.target.value)}
          />
          <TextField
            label="Şifre"
            required
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </FieldGrid>
        <Alert tone="info">
          Bağlantı bilgileri yalnızca sunucuda şifreli saklanacak; bu ekranda gerçek anahtar
          tutulmaz ve bağlantı testi yapılmaz.
        </Alert>
        <SaveBar label="Değişiklikleri Kaydet" />
      </div>
    </ScreenCard>
  );
}

/** Google & Meta XML: tek durum anahtarı, bilgi notu ve örnek adres. */
export function XmlScreen() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard
        title="Google & Meta XML"
        description="Xml durumunu kontrol edebilir ve görüntüleyebilirsiniz."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Durum</span>
            <ToggleSwitch label="XML feed aktif" checked={enabled} onChange={setEnabled} />
            <Badge tone={enabled ? 'brand' : 'muted'}>{enabled ? 'Açık' : 'Kapalı'}</Badge>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert tone="info">
            Sadece Google ile eşleştirilmiş kategorilerdeki ürünler ve barkodlu ürünler XML
            verisinde yer alır.
          </Alert>
          <SaveBar label="Değişiklikleri Kaydet" />
        </div>
      </ScreenCard>

      <ScreenCard
        title="Feed Adresi"
        description="Aşağıdaki adres örnektir; yeni site kurulana kadar çalışır bir feed değildir."
      >
        <p className="break-all rounded-2xl bg-surface-muted px-4 py-3 font-mono text-sm">
          https://guzelteknoloji.com/google-meta-xml
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Gerçek adres, site ve backend bağlantısı hazır olduğunda burada gösterilecek.
        </p>
      </ScreenCard>
    </div>
  );
}
