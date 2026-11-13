import { Alert } from '../../../components/ui/Alert';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useWorkspace } from '../../workspace/workspace-context';
import { usePublishSaveAction } from '../../app-shell/save-action';
import { Badge, FieldGrid, ScreenCard } from './Parts';

const erpDefaults = {
  enabled: 'false',
  apiUrl: '',
  server: '',
  database: '',
  username: '',
  password: '',
};

const xmlDefaults = { enabled: 'false', productUrlTemplate: '' };

/** ERP Entegrasyon Bilgileri: alanlar `site_erp` bölümüne kaydedilir; test bağlantısı yapılmaz. */
export function ErpScreen() {
  const { values, setValue, loading, ready, saving, error, message, save } = useSiteSettings(
    'site_erp',
    erpDefaults,
  );
  const enabled = values.enabled === 'true';
  const v = (key: keyof typeof erpDefaults) => values[key] ?? '';
  // Ekranda "required" işaretli alanlar gerçekten zorunlu olsun; boş bilgiyle aktif edilmesin.
  const eksik =
    !v('apiUrl').trim() || !v('server').trim() || !v('database').trim() || !v('username').trim();
  // Kaydet düğmesi sayfada değil, yüzen adadaki disket düğmesinde (Dock).
  usePublishSaveAction({
    onSave: () => void save(),
    saving,
    disabled: loading || !ready || (enabled && eksik),
  });

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard
        title="ERP Entegrasyon Bilgileri"
        description="ERP bağlantı bilgilerini bu sayfadan yönetin."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Durum</span>
            <ToggleSwitch
              label="ERP entegrasyonu aktif"
              checked={enabled}
              onChange={(checked) => setValue('enabled', String(checked))}
            />
            <Badge tone={enabled ? 'brand' : 'muted'}>{enabled ? 'Aktif' : 'Pasif'}</Badge>
          </div>
        }
      >
        <div className="space-y-5">
          <TextField
            label="API URL"
            required
            value={v('apiUrl')}
            onChange={(e) => setValue('apiUrl', e.target.value)}
          />
          <FieldGrid>
            <TextField
              label="Sunucu"
              required
              value={v('server')}
              onChange={(e) => setValue('server', e.target.value)}
            />
            <TextField
              label="Veritabanı"
              required
              value={v('database')}
              onChange={(e) => setValue('database', e.target.value)}
            />
            <TextField
              label="Kullanıcı Adı"
              required
              value={v('username')}
              onChange={(e) => setValue('username', e.target.value)}
            />
            <TextField
              label="Şifre"
              type="password"
              autoComplete="new-password"
              hint="Boş bırakılırsa kayıtlı şifre korunur."
              value={v('password')}
              onChange={(e) => setValue('password', e.target.value)}
            />
          </FieldGrid>
          <Alert tone="info">
            Şifre sunucuda şifreli saklanır. Bu ekran bağlantı bilgilerini kaydeder; gerçek veri
            aktarımı için ERP servis bağlantısının tamamlanması gerekir.
          </Alert>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </ScreenCard>
      {enabled && eksik && (
        <Alert tone="error">API URL, sunucu, veritabanı ve kullanıcı adı zorunlu.</Alert>
      )}
      {message && <Alert tone="info">{message}</Alert>}
    </div>
  );
}

/** Google & Meta XML: tek durum anahtarı (`site_xml`), bilgi notu ve örnek adres. */
export function XmlScreen() {
  const { values, setValue, loading, ready, saving, error, message, feedUrl, save } =
    useSiteSettings('site_xml', xmlDefaults);
  const { data } = useWorkspace();
  // Adres API'den gelmezse işletme kimliğinden türetilir; ekran "yükleniyor"da kalmaz.
  const address =
    feedUrl ??
    (data?.business.id
      ? `${window.location.origin}/api/site-feed/${data.business.id}/google.xml`
      : null);
  // Kaydet düğmesi sayfada değil, yüzen adadaki disket düğmesinde (Dock).
  usePublishSaveAction({
    onSave: () => void save(),
    saving,
    disabled: loading || !ready,
  });
  const enabled = values.enabled === 'true';

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard
        title="Google & Meta XML"
        description="Xml durumunu kontrol edebilir ve görüntüleyebilirsiniz."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Durum</span>
            <ToggleSwitch
              label="XML feed aktif"
              checked={enabled}
              onChange={(checked) => setValue('enabled', String(checked))}
            />
            <Badge tone={enabled ? 'brand' : 'muted'}>{enabled ? 'Aktif' : 'Pasif'}</Badge>
          </div>
        }
      >
        <Alert tone="info">
          Sadece Google ile eşleştirilmiş kategorilerdeki ürünler ve barkodlu ürünler XML verisinde
          yer alır.
        </Alert>
      </ScreenCard>

      <ScreenCard
        title="Feed Adresi"
        description="Bu adresi Google Merchant Center veya Meta Commerce Manager kataloğuna ekleyin."
      >
        <p className="break-all rounded-2xl bg-surface-muted px-4 py-3 font-mono text-sm">
          {address ?? '—'}
        </p>
      </ScreenCard>

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="info">{message}</Alert>}
    </div>
  );
}
