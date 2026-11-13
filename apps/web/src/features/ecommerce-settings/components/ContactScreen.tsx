import { useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { usePublishSaveAction } from '../../app-shell/save-action';
import { formatTrPhone } from '../../../lib/phone';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { FieldGrid, ScreenCard } from './Parts';

const defaults = {
  unvan: '',
  tip: 'tuzel',
  vergiNo: '',
  vergiDairesi: '',
  adres: '',
  eposta: '',
  telefon: '',
  gsm: '',
  fax: '',
  harita: '',
  yolTarifi: '',
  facebook: '',
  x: '',
  instagram: '',
  youtube: '',
  pinterest: '',
  subeler: '',
};

interface Branch {
  id: string;
  name: string;
  address: string;
  manager: string;
  email: string;
  phone: string;
  gsm: string;
  fax: string;
  map: string;
  route: string;
}

const emptyBranch = (): Branch => ({
  id: `b${Date.now()}`,
  name: '',
  address: '',
  manager: '',
  email: '',
  phone: '',
  gsm: '',
  fax: '',
  map: '',
  route: '',
});

/** JSON metninden şube listesi; bozuk kayıt sessizce atlanır. */
function parseBranches(raw: string): Branch[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => ({
        id: String(item.id ?? `b${index}`),
        name: String(item.name ?? ''),
        address: String(item.address ?? ''),
        manager: String(item.manager ?? ''),
        email: String(item.email ?? ''),
        phone: String(item.phone ?? ''),
        gsm: String(item.gsm ?? ''),
        fax: String(item.fax ?? ''),
        map: String(item.map ?? ''),
        route: String(item.route ?? ''),
      }));
  } catch {
    return [];
  }
}

/**
 * İletişim Bilgileri: işletmenin vitrinde görünen ünvan, adres, telefon, sosyal bağlantıları ve
 * şubeleri. Alanlar `site_iletisim` bölümüne kaydedilir; Kaydet yüzen adadadır.
 * Şubeler aynı bölümde `subeler` alanında JSON metni olarak tutulur.
 */
export function ContactScreen() {
  const { values, setValue, loading, ready, saving, error, message, save } = useSiteSettings(
    'site_iletisim',
    defaults,
  );
  usePublishSaveAction({ onSave: () => void save(), saving, disabled: loading || !ready });
  const v = (key: keyof typeof defaults) => values[key] ?? '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<Branch>(emptyBranch);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setBranches(parseBranches(values.subeler ?? ''));
  }, [values.subeler]);

  const commit = (next: Branch[]) => {
    setBranches(next);
    setValue('subeler', JSON.stringify(next));
  };
  const setField = (key: keyof Branch, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      commit(branches.map((item) => (item.id === editingId ? { ...form, id: editingId } : item)));
    } else {
      commit([...branches, form]);
    }
    setForm(emptyBranch());
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard title="Firma Bilgileri" description="Vitrinde ve faturalarda görünen bilgiler.">
        <FieldGrid>
          <TextField
            label="Ünvan"
            value={v('unvan')}
            onChange={(e) => setValue('unvan', e.target.value)}
          />
          <SelectField
            label="Tip"
            value={v('tip')}
            options={[
              { value: 'tuzel', label: 'Tüzel' },
              { value: 'gercek', label: 'Gerçek' },
            ]}
            onChange={(value) => setValue('tip', value)}
          />
          <TextField
            label="Vergi Numarası"
            value={v('vergiNo')}
            onChange={(e) => setValue('vergiNo', e.target.value)}
          />
          <TextField
            label="Vergi Dairesi"
            value={v('vergiDairesi')}
            onChange={(e) => setValue('vergiDairesi', e.target.value)}
          />
        </FieldGrid>
      </ScreenCard>

      <ScreenCard title="İletişim">
        <div className="space-y-5">
          <TextAreaField
            label="Adres"
            rows={3}
            value={v('adres')}
            onChange={(e) => setValue('adres', e.target.value)}
          />
          <FieldGrid>
            <TextField
              label="E-Posta"
              type="email"
              value={v('eposta')}
              onChange={(e) => setValue('eposta', e.target.value)}
            />
            <TextField
              label="Telefon"
              value={v('telefon')}
              onChange={(e) => setValue('telefon', formatTrPhone(e.target.value))}
            />
            <TextField
              label="Gsm"
              value={v('gsm')}
              onChange={(e) => setValue('gsm', formatTrPhone(e.target.value))}
            />
            <TextField
              label="Fax"
              value={v('fax')}
              onChange={(e) => setValue('fax', formatTrPhone(e.target.value))}
            />
          </FieldGrid>
        </div>
      </ScreenCard>

      <ScreenCard title="Konum">
        <div className="space-y-5">
          <TextAreaField
            label="Harita Iframe Kodu"
            rows={3}
            className="font-mono text-xs"
            spellCheck={false}
            value={v('harita')}
            onChange={(e) => setValue('harita', e.target.value)}
          />
          <TextAreaField
            label="Yol Tarifi Linki"
            rows={2}
            className="font-mono text-xs"
            spellCheck={false}
            value={v('yolTarifi')}
            onChange={(e) => setValue('yolTarifi', e.target.value)}
          />
        </div>
      </ScreenCard>

      <ScreenCard title="Sosyal Bağlantılar">
        <FieldGrid>
          <TextField
            label="Facebook Linki"
            value={v('facebook')}
            onChange={(e) => setValue('facebook', e.target.value)}
          />
          <TextField
            label="X Linki"
            value={v('x')}
            onChange={(e) => setValue('x', e.target.value)}
          />
          <TextField
            label="Instagram Linki"
            value={v('instagram')}
            onChange={(e) => setValue('instagram', e.target.value)}
          />
          <TextField
            label="Youtube Linki"
            value={v('youtube')}
            onChange={(e) => setValue('youtube', e.target.value)}
          />
          <TextField
            label="Pinterest Linki"
            value={v('pinterest')}
            onChange={(e) => setValue('pinterest', e.target.value)}
          />
        </FieldGrid>
      </ScreenCard>

      <ScreenCard title="Şubeler" description="Mağaza ve ofislerin adres ve yetkili bilgileri.">
        <div className="space-y-5">
          {branches.length > 0 && (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {branches.map((branch) => (
                <li key={branch.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{branch.name}</p>
                    <p className="truncate text-xs text-ink-muted">{branch.address}</p>
                  </div>
                  <Button
                    flow={false}
                    type="button"
                    variant="outline"
                    fullWidth={false}
                    onClick={() => {
                      setForm({ ...branch });
                      setEditingId(branch.id);
                    }}
                  >
                    Düzenle
                  </Button>
                  <Button
                    flow={false}
                    type="button"
                    variant="danger"
                    fullWidth={false}
                    onClick={() => commit(branches.filter((item) => item.id !== branch.id))}
                  >
                    Sil
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <FieldGrid>
            <TextField
              label="Şube Adı"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            <TextField
              label="Yetkili Ad Soyad"
              value={form.manager}
              onChange={(e) => setField('manager', e.target.value)}
            />
            <TextField
              label="E-Posta"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
            <TextField
              label="Telefon"
              value={form.phone}
              onChange={(e) => setField('phone', formatTrPhone(e.target.value))}
            />
            <TextField
              label="Gsm"
              value={form.gsm}
              onChange={(e) => setField('gsm', formatTrPhone(e.target.value))}
            />
            <TextField
              label="Fax"
              value={form.fax}
              onChange={(e) => setField('fax', formatTrPhone(e.target.value))}
            />
          </FieldGrid>
          <TextAreaField
            label="Adres"
            rows={2}
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
          />
          <TextAreaField
            label="Harita Iframe Kodu"
            rows={2}
            className="font-mono text-xs"
            spellCheck={false}
            value={form.map}
            onChange={(e) => setField('map', e.target.value)}
          />
          <TextField
            label="Yol Tarifi Linki"
            value={form.route}
            onChange={(e) => setField('route', e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              flow={false}
              type="button"
              fullWidth={false}
              disabled={!form.name.trim()}
              onClick={submit}
            >
              {editingId ? 'Şubeyi Güncelle' : 'Şube Ekle'}
            </Button>
            {editingId && (
              <Button
                flow={false}
                type="button"
                variant="outline"
                fullWidth={false}
                onClick={() => {
                  setForm(emptyBranch());
                  setEditingId(null);
                }}
              >
                Vazgeç
              </Button>
            )}
          </div>
        </div>
      </ScreenCard>

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="info">{message}</Alert>}
    </div>
  );
}
