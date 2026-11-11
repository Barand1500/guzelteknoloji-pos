import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import {
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Mail,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  SETTINGS_PAGES,
  WORKSPACE_RESOURCES,
  type RolePermission,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceLog,
  type SettingsResult,
} from '@gt/shared';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SearchField } from '../../components/ui/SearchField';
import { SelectField } from '../../components/ui/SelectField';
import { Sheet } from '../../components/ui/Sheet';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { Alert } from '../../components/ui/Alert';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { apiRequest } from '../../lib/http';
import { dataError } from '../../lib/catalog-data';
import { useSession } from '../auth/hooks/session-context';
import { useWorkspace } from './workspace-context';
import { UnsavedChanges } from './UnsavedChanges';
import { visibleLogChanges } from './log-display';
import { RobotChallenge } from '../auth/components/RobotChallenge';

const base = '/api/hesap';
const post = <T,>(path: string, body: unknown = {}) =>
  apiRequest<T>(base + path, { method: 'POST', body });
const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-40';
const panel = 'rounded-3xl border border-line bg-surface-raised p-4 sm:p-6';
const tabStyle = (active: boolean) =>
  `flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${active ? 'border-brand-700 text-brand-ink' : 'border-transparent text-ink-muted hover:text-ink'}`;
function SettingsTabs({ pathname }: { pathname: string }) {
  const tabs = [
    {
      key: 'general',
      label: 'Genel',
      icon: Settings,
      active: pathname.endsWith('/ayarlar') || pathname.endsWith('/general'),
    },
    { key: 'images', label: 'Görseller', icon: ImageIcon, active: pathname.endsWith('/images') },
    {
      key: 'entegrasyonlar',
      label: 'Entegrasyonlar',
      icon: Mail,
      active:
        /\/(smtp|imap|google|cloudflare|whatsapp|recaptcha|entegrasyonlar|iletisim|robot-dogrulama|sosyal-giris)$/.test(
          pathname,
        ),
    },
  ];
  return (
    <div className="space-y-1">
      <nav aria-label="Ayar bölümleri" className="flex overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={`/uygulama/ayarlar/${t.key}`}
            aria-current={t.active ? 'page' : undefined}
            className={tabStyle(t.active)}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        ))}
      </nav>
      {tabs[2]?.active && (
        <nav aria-label="Entegrasyonlar" className="flex overflow-x-auto border-b border-line">
          {[
            ['iletisim', 'İletişim'],
            ['robot-dogrulama', 'Doğrulama'],
            ['sosyal-giris', 'Hızlı Giriş'],
          ].map(([key, label]) => (
            <Link
              key={key}
              to={`/uygulama/ayarlar/${key}`}
              aria-current={
                pathname.endsWith(`/${key}`) ||
                (key === 'iletisim' && /\/(smtp|imap|whatsapp|entegrasyonlar)$/.test(pathname)) ||
                (key === 'robot-dogrulama' && /\/(cloudflare|recaptcha)$/.test(pathname)) ||
                (key === 'sosyal-giris' && pathname.endsWith('/google'))
                  ? 'page'
                  : undefined
              }
              className={tabStyle(
                pathname.endsWith(`/${key}`) ||
                  (key === 'iletisim' && /\/(smtp|imap|whatsapp|entegrasyonlar)$/.test(pathname)) ||
                  (key === 'robot-dogrulama' && /\/(cloudflare|recaptcha)$/.test(pathname)) ||
                  (key === 'sosyal-giris' && pathname.endsWith('/google')),
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function Frame({
  children,
  description,
  demoContent = false,
}: {
  children: ReactNode;
  back?: string;
  description?: string;
  demoContent?: boolean;
}) {
  const { demo } = useWorkspace();
  const { pathname } = useLocation();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {pathname.includes('/ayarlar') && <SettingsTabs pathname={pathname} />}
      {description && <p className="text-sm text-ink-muted">{description}</p>}
      {demo && !demoContent ? (
        <Alert tone="info">Hesap yönetimi için kendi hesabınızla giriş yapın.</Alert>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      )}
    </div>
  );
}
function useRows<T>(path: string, initial: T) {
  const [initialValue] = useState(() => initial);
  const revision = useRef(0);
  const [state, setState] = useState({
    path: '',
    value: initialValue,
    error: null as string | null,
  });
  const reload = useCallback(async () => {
    const request = ++revision.current;
    try {
      const value = await apiRequest<T>(base + path);
      if (request === revision.current) setState({ path, value, error: null });
    } catch (e) {
      if (request === revision.current)
        setState({ path, value: initialValue, error: dataError(e) });
    }
  }, [path, initialValue]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return reload();
    });
    const current = revision;
    return () => {
      active = false;
      current.current++;
    };
  }, [reload]);
  return {
    value: state.path === path ? state.value : initialValue,
    loading: state.path !== path,
    error: state.path === path ? state.error : null,
    reload,
  };
}
function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}) {
  return error ? (
    <div className="space-y-3">
      <Alert tone="error">{error}</Alert>
      <Button flow={false} variant="outline" fullWidth={false} onClick={() => void retry()}>
        Tekrar Dene
      </Button>
    </div>
  ) : loading ? (
    <p role="status" className="py-8 text-center text-ink-muted">
      Yükleniyor…
    </p>
  ) : null;
}
function FormSheet({
  title,
  children,
  onClose,
  onSave,
  dirty = true,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => Promise<void>;
  dirty?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leave, setLeave] = useState(false);
  const close = () => {
    if (!busy) {
      if (dirty) setLeave(true);
      else onClose();
    }
  };
  return (
    <>
      <Sheet open title={title} onClose={close} size="lg">
        <UnsavedChanges dirty={dirty && !busy} />
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            void onSave()
              .then(onClose)
              .catch((err: unknown) => setError(dataError(err)))
              .finally(() => setBusy(false));
          }}
        >
          {error && <Alert tone="error">{error}</Alert>}
          {children}
          <div className="flex gap-3 pt-2">
            <Button flow={false} type="button" variant="outline" onClick={onClose} disabled={busy}>
              Vazgeç
            </Button>
            <Button flow={false} type="submit" loading={busy}>
              Kaydet
            </Button>
          </div>
        </form>
      </Sheet>
      <ConfirmSheet
        open={leave}
        title="Kaydedilmemiş Değişiklikler"
        description="Yaptığınız değişiklikler kaybolacak. Kaydetmeden ayrılmak istiyor musunuz?"
        confirmLabel="Kaydetmeden Ayrıl"
        cancelLabel="Düzenlemeye Devam Et"
        onConfirm={onClose}
        onClose={() => setLeave(false)}
      />
    </>
  );
}

export function ProfilePage() {
  const { data, refresh, demo } = useWorkspace();
  const { session, setAuthenticated } = useSession();
  const [name, setName] = useState(data?.user.name ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState(false);
  useEffect(() => {
    if (data?.user.name) setName(data.user.name);
  }, [data?.user.name]);
  return (
    <Frame description={data?.business.name} demoContent>
      {!demo && <UnsavedChanges dirty={!busy && name !== (data?.user.name ?? '')} />}
      <section className={`${panel} w-full`}>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-xl font-extrabold text-brand-ink">
            {(name || data?.user.email || 'K').slice(0, 2).toLocaleUpperCase('tr')}
          </div>
          <div>
            <h2 className="text-xl font-extrabold">Profil Bilgileri</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {data?.owner ? 'İşletme Sahibi' : 'İşletme Kullanıcısı'}
            </p>
          </div>
        </div>
        <form
          className="grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            setMessage(null);
            void post('/profil', { name })
              .then(async () => {
                if (session.user) setAuthenticated({ ...session.user, displayName: name });
                await refresh();
                setMessage('Profil bilgileriniz kaydedildi.');
              })
              .catch((e) => setError(dataError(e)))
              .finally(() => setBusy(false));
          }}
        >
          {error && <Alert tone="error">{error}</Alert>}
          {message && <Alert tone="info">{message}</Alert>}
          <TextField
            label="Ad Soyad"
            value={name}
            maxLength={120}
            required
            readOnly={demo}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField label="E-posta" value={data?.user.email ?? ''} readOnly />
          {!demo && (
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button flow={false} type="submit" fullWidth={false} loading={busy}>
                Kaydet
              </Button>
              <Button
                flow={false}
                type="button"
                variant="outline"
                fullWidth={false}
                onClick={() => setPassword(true)}
              >
                {data?.hasPassword === false ? 'Şifre Oluştur' : 'Şifreyi Değiştir'}
              </Button>
            </div>
          )}
        </form>
      </section>
      {!demo && password && (
        <PasswordForm
          hasPassword={data?.hasPassword !== false}
          onSaved={refresh}
          onClose={() => setPassword(false)}
        />
      )}
    </Frame>
  );
}
function PasswordForm({
  hasPassword,
  onSaved,
  onClose,
}: {
  hasPassword: boolean;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const eye = (key: string, label: string) => (
    <button
      type="button"
      className={iconButton}
      aria-label={`${label} ${visible[key] ? 'Gizle' : 'Göster'}`}
      aria-pressed={!!visible[key]}
      onClick={() => setVisible({ ...visible, [key]: !visible[key] })}
    >
      {visible[key] ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
  return (
    <FormSheet
      title={hasPassword ? 'Şifreyi Değiştir' : 'Şifre Oluştur'}
      onClose={onClose}
      dirty={!!current || !!password || !!repeat}
      onSave={async () => {
        if (password !== repeat) throw new Error('Şifreler aynı olmalı.');
        await post('/profil/sifre', { current, password });
        await onSaved();
      }}
    >
      {!hasPassword && (
        <p className="text-sm text-ink-muted">
          E-posta ve şifreyle de giriş yapmak için şifre oluşturabilirsiniz. Google şifreniz
          istenmez.
        </p>
      )}
      {hasPassword && (
        <TextField
          type={visible.current ? 'text' : 'password'}
          label="Mevcut Şifre"
          trailing={eye('current', 'Mevcut Şifre')}
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      )}
      <TextField
        type={visible.password ? 'text' : 'password'}
        label="Yeni Şifre"
        trailing={eye('password', 'Yeni Şifre')}
        autoComplete="new-password"
        minLength={10}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        type={visible.repeat ? 'text' : 'password'}
        label="Yeni Şifre Tekrar"
        trailing={eye('repeat', 'Yeni Şifre Tekrar')}
        autoComplete="new-password"
        required
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
      />
      <p className="text-sm text-ink-muted">
        Yeni şifre en az 10 karakter olmalı. Diğer cihazların oturumları kapatılır.
      </p>
    </FormSheet>
  );
}

export function UsersPage() {
  const { can, data } = useWorkspace();
  const rows = useRows<WorkspaceMember[]>('/kullanicilar', []);
  const roles = useRows<WorkspaceRole[]>('/roller', []);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<WorkspaceMember | 'new' | null>(null);
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filtered = rows.value.filter((r) =>
    `${r.name} ${r.email} ${r.roleName}`
      .toLocaleLowerCase('tr')
      .includes(search.toLocaleLowerCase('tr')),
  );
  return (
    <Frame description="İşletmenizde kimlerin erişimi olduğunu yönetin.">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <SearchField
            label="Kullanıcı Ara"
            value={search}
            onChange={setSearch}
            placeholder="Ad, e-posta veya rol ara…"
          />
        </div>
        {can('users', 'save') && (
          <Button
            flow={false}
            fullWidth={false}
            leadingIcon={<Plus className="size-4" />}
            onClick={() => setEditing('new')}
          >
            Kullanıcı Ekle
          </Button>
        )}
      </div>
      <LoadState {...rows} retry={rows.reload} />
      {error && <Alert tone="error">{error}</Alert>}
      {!rows.loading && !rows.error && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface-raised">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-ink-muted">
              <tr>
                {['Kullanıcı', 'Rol', 'Durum', 'İşlemler'].map((t) => (
                  <th key={t} className="px-5 py-4 font-semibold">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-bold">{r.name}</p>
                    <p className="mt-1 text-xs text-ink-muted">{r.email}</p>
                  </td>
                  <td className="px-5 py-4">{r.roleName}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${r.active ? 'bg-brand-50 text-brand-ink' : 'bg-surface-muted text-ink-muted'}`}
                    >
                      {!r.active ? 'Erişim Kapalı' : r.pending ? 'Giriş Bekleniyor' : 'Aktif'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {!r.owner && r.email !== data?.user.email && (
                      <div className="flex">
                        {can('users', 'save') && (
                          <button
                            className={iconButton}
                            aria-label={`${r.name} düzenle`}
                            onClick={() => setEditing(r)}
                          >
                            <Pencil className="size-4" />
                          </button>
                        )}
                        {can('users', 'delete') && (
                          <button
                            className={iconButton}
                            aria-label={`${r.name} erişimini kaldır`}
                            onClick={() => setRemoving(r)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-8 text-center text-sm text-ink-muted">Eşleşen kullanıcı yok.</p>
          )}
        </div>
      )}
      {editing && (
        <MemberForm
          member={editing === 'new' ? null : editing}
          roles={roles.value}
          onClose={() => setEditing(null)}
          onSaved={rows.reload}
        />
      )}
      <ConfirmSheet
        open={!!removing}
        title={removing?.pending ? 'Kullanıcı Eklemeyi İptal Et' : 'Kullanıcı Erişimini Kaldır'}
        description="İşletmenin ürünleri ve diğer kayıtları korunur. Bu kişinin işletmeye erişimi kaldırılır."
        danger
        confirmLabel="Erişimi Kaldır"
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing)
            void post(`/kullanicilar/${removing.id}/sil`)
              .then(() => {
                setRemoving(null);
                return rows.reload();
              })
              .catch((e) => {
                setRemoving(null);
                setError(dataError(e));
              });
        }}
      />
    </Frame>
  );
}
function MemberForm({
  member,
  roles,
  onClose,
  onSaved,
}: {
  member: WorkspaceMember | null;
  roles: WorkspaceRole[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    name: member?.name ?? '',
    email: member?.email ?? '',
    roleId: member?.roleId ? String(member.roleId) : '',
    active: member?.active ?? true,
  });
  return (
    <FormSheet
      title={member ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Ekle'}
      onClose={onClose}
      dirty={
        JSON.stringify(draft) !==
        JSON.stringify({
          name: member?.name ?? '',
          email: member?.email ?? '',
          roleId: member?.roleId ? String(member.roleId) : '',
          active: member?.active ?? true,
        })
      }
      onSave={async () => {
        if (!draft.roleId) throw new Error('Bir rol seçin.');
        const { email, ...values } = draft;
        await post(member ? `/kullanicilar/${member.id}` : '/kullanicilar', {
          ...values,
          roleId: Number(draft.roleId),
          ...(!member ? { email } : {}),
        });
        await onSaved();
      }}
    >
      <TextField
        label="Ad Soyad"
        required
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <TextField
        type="email"
        label="E-posta"
        required
        readOnly={!!member}
        value={draft.email}
        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
      />
      <SelectField
        label="Rol"
        value={draft.roleId}
        options={[
          { value: '', label: 'Rol Seçin' },
          ...roles.map((r) => ({ value: String(r.id), label: r.name })),
        ]}
        onChange={(roleId) => setDraft({ ...draft, roleId })}
      />
      {!roles.length && (
        <p className="text-sm text-ink-muted">
          Önce{' '}
          <Link to="/uygulama/roller" className="font-semibold text-brand-ink underline">
            bir rol oluşturun
          </Link>
          .
        </p>
      )}
      <SelectField
        label="Erişim"
        value={draft.active ? 'active' : 'inactive'}
        options={[
          { value: 'active', label: 'Açık' },
          { value: 'inactive', label: 'Kapalı' },
        ]}
        onChange={(v) => setDraft({ ...draft, active: v === 'active' })}
      />
      {!member && (
        <p className="text-sm text-ink-muted">
          Kişi bu e-posta adresiyle giriş yapıp adresini doğruladığında işletmenize katılır. Kayıt
          oluşturmak e-posta göndermez.
        </p>
      )}
    </FormSheet>
  );
}

export function RolesPage() {
  const { can } = useWorkspace();
  const rows = useRows<WorkspaceRole[]>('/roller', []);
  const [editing, setEditing] = useState<WorkspaceRole | 'new' | null>(null);
  const [removing, setRemoving] = useState<WorkspaceRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Frame description="Her bölüm için görüntüleme, kaydetme ve silme yetkilerini belirleyin.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">İşletme sahibinin erişimi her zaman korunur.</p>
        {can('roles', 'save') && (
          <Button
            flow={false}
            fullWidth={false}
            leadingIcon={<Plus className="size-4" />}
            onClick={() => setEditing('new')}
          >
            Rol Ekle
          </Button>
        )}
      </div>
      <LoadState {...rows} retry={rows.reload} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
        {rows.value.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-0"
          >
            <ShieldCheck className="size-5 text-brand-ink" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{r.name}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {r.users} kullanıcı · {r.permissions.filter((p) => p.read).length} bölüm
              </p>
            </div>
            {can('roles', 'save') && (
              <button
                className={iconButton}
                aria-label={`${r.name} düzenle`}
                onClick={() => setEditing(r)}
              >
                <Pencil className="size-4" />
              </button>
            )}
            {can('roles', 'delete') && (
              <button
                className={iconButton}
                aria-label={`${r.name} sil`}
                onClick={() => setRemoving(r)}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {!rows.loading && !rows.value.length && (
          <p className="p-8 text-center text-sm text-ink-muted">Henüz rol oluşturulmadı.</p>
        )}
      </div>
      {editing && (
        <RoleForm
          role={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={rows.reload}
        />
      )}
      <ConfirmSheet
        open={!!removing}
        title="Rolü Sil"
        description="Kullanıcılara atanmış roller silinemez. Bu rolü silmek istiyor musunuz?"
        danger
        confirmLabel="Sil"
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing)
            void post(`/roller/${removing.id}/sil`)
              .then(() => {
                setRemoving(null);
                return rows.reload();
              })
              .catch((e) => {
                setRemoving(null);
                setError(dataError(e));
              });
        }}
      />
    </Frame>
  );
}
function RoleForm({
  role,
  onClose,
  onSaved,
}: {
  role: WorkspaceRole | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { can } = useWorkspace();
  const [name, setName] = useState(role?.name ?? '');
  const [permissions, setPermissions] = useState<RolePermission[]>(
    WORKSPACE_RESOURCES.map(
      (r) =>
        role?.permissions.find((p) => p.resource === r.key) ?? {
          resource: r.key,
          read: false,
          save: false,
          delete: false,
        },
    ),
  );
  const toggle = (resource: string, action: 'read' | 'save' | 'delete', value: boolean) =>
    setPermissions(
      permissions.map((p) =>
        p.resource !== resource
          ? p
          : {
              ...p,
              [action]: value,
              ...(action === 'read' && !value
                ? { save: false, delete: false }
                : action !== 'read' && value
                  ? { read: true }
                  : {}),
            },
      ),
    );
  const actions = ['read', 'save', 'delete'] as const;
  const selectable = (resource: RolePermission['resource'], action: (typeof actions)[number]) =>
    (resource !== 'logs' || action === 'read') && can(resource, action);
  const allSelected = permissions.every((p) =>
    actions.every((action) => !selectable(p.resource, action) || p[action]),
  );
  const selectAll = () =>
    setPermissions(
      permissions.map((p) => ({
        resource: p.resource,
        read: !allSelected && selectable(p.resource, 'read'),
        save: !allSelected && selectable(p.resource, 'save'),
        delete: !allSelected && selectable(p.resource, 'delete'),
      })),
    );
  return (
    <FormSheet
      title={role ? 'Rolü Düzenle' : 'Rol Ekle'}
      dirty={
        name !== (role?.name ?? '') ||
        permissions.some((p) => {
          const previous = role?.permissions.find((v) => v.resource === p.resource);
          return (
            p.read !== (previous?.read ?? false) ||
            p.save !== (previous?.save ?? false) ||
            p.delete !== (previous?.delete ?? false)
          );
        })
      }
      onClose={onClose}
      onSave={async () => {
        await post(role ? `/roller/${role.id}` : '/roller', {
          name,
          permissions: permissions.map((p) => ({
            resource: p.resource,
            read: p.read,
            save: p.save,
            delete: p.delete,
          })),
        });
        await onSaved();
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            label="Rol Adı"
            required
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button
          flow={false}
          variant="outline"
          fullWidth={false}
          className="h-14 shrink-0 px-3 text-sm"
          onClick={selectAll}
        >
          {allSelected ? 'Seçimi Temizle' : 'Tümünü Seç'}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-80 text-sm">
          <thead className="bg-surface-muted text-xs text-ink-muted">
            <tr>
              <th className="p-3 text-left">Bölüm</th>
              {['Görüntüle', 'Kaydet', 'Sil'].map((t) => (
                <th className="p-3 text-center" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKSPACE_RESOURCES.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <th className="p-3 text-left font-semibold">{r.label}</th>
                {(['read', 'save', 'delete'] as const).map((action, i) => (
                  <td className="text-center" key={action}>
                    {r.key === 'logs' && action !== 'read' ? (
                      <span aria-hidden="true">—</span>
                    ) : (
                      <label className="inline-flex size-11 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-brand-700"
                          aria-label={`${r.label} ${['Görüntüle', 'Kaydet', 'Sil'][i]}`}
                          checked={permissions.find((p) => p.resource === r.key)![action]}
                          disabled={!selectable(r.key, action)}
                          onChange={(e) => toggle(r.key, action, e.target.checked)}
                        />
                      </label>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormSheet>
  );
}

export function SettingsIndexPage({ integrations = false }: { integrations?: boolean }) {
  return <SettingsPage initialSection={integrations ? 'iletisim' : 'general'} />;
}

interface FullSettings extends SettingsResult {
  system?: { smtp: boolean; google: boolean };
  googleRedirect?: string;
  webhookUrl?: string;
}
function SecretSettingField({
  label,
  value,
  configured,
  section,
  field,
  onChange,
}: {
  label: string;
  value: string | undefined;
  configured: boolean;
  section: string;
  field: string;
  onChange: (value: string) => void;
}) {
  const { can } = useWorkspace();
  const [cached, setCached] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const mask = '••••••••';
  const current = value ?? (configured ? (cached ?? mask) : '');
  const toggle = async () => {
    if (visible) return setVisible(false);
    if (current !== mask) return setVisible(true);
    setLoading(true);
    setError(undefined);
    try {
      const result = await post<{ value: string }>(`/ayarlar/${section}/gizli/${field}`);
      setCached(result.value);
      setVisible(true);
    } catch (e) {
      setError(dataError(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <TextField
      label={label}
      type={visible ? 'text' : 'password'}
      autoComplete="new-password"
      value={current}
      error={error}
      onFocus={(e) => {
        if (current === mask) e.target.select();
      }}
      onChange={(e) => {
        const next = e.target.value.replaceAll('•', '');
        setCached(next);
        onChange(next);
      }}
      trailing={
        <button
          type="button"
          className={iconButton}
          disabled={loading || !can('settings', 'save')}
          aria-label={visible ? `${label} Gizle` : `${label} Göster`}
          aria-pressed={visible}
          onClick={() => void toggle()}
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
    />
  );
}
export function SettingsPage({ initialSection = 'general' }: { initialSection?: string }) {
  const { section: parameter } = useParams();
  const section = parameter ?? initialSection;
  if (['iletisim', 'robot-dogrulama', 'sosyal-giris'].includes(section))
    return <IntegrationGroupPage key={section} group={section} />;
  return <SettingsPageContent key={section} section={section} />;
}
const IntegrationDirtyContext = createContext<{
  reportDirty: (section: string, dirty: boolean) => void;
  reportRobotEnabled: (section: 'cloudflare' | 'recaptcha', enabled: boolean) => void;
  activeRobot: string | null;
  selectRobot: (section: string | null) => void;
} | null>(null);

function EmbeddedSettings({
  children,
}: {
  children: ReactNode;
  back?: string;
  description?: string;
}) {
  return <div className="h-full min-w-0 space-y-4">{children}</div>;
}

function IntegrationGroupPage({ group }: { group: string }) {
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [robotStates, setRobotStates] = useState<
    Record<'cloudflare' | 'recaptcha', boolean | null>
  >({
    cloudflare: null,
    recaptcha: null,
  });
  const [activeRobot, setActiveRobot] = useState<string | null>(null);
  const reportDirty = useCallback((section: string, value: boolean) => {
    setDirty((previous) =>
      previous[section] === value ? previous : { ...previous, [section]: value },
    );
  }, []);
  const reportRobotEnabled = useCallback(
    (section: 'cloudflare' | 'recaptcha', enabled: boolean) => {
      setRobotStates((previous) =>
        previous[section] === enabled ? previous : { ...previous, [section]: enabled },
      );
    },
    [],
  );
  useEffect(() => {
    if (robotStates.cloudflare === null || robotStates.recaptcha === null) return;
    setActiveRobot(
      robotStates.cloudflare ? 'cloudflare' : robotStates.recaptcha ? 'recaptcha' : null,
    );
  }, [robotStates]);
  const sections =
    group === 'iletisim'
      ? ['smtp', 'imap', 'whatsapp']
      : group === 'sosyal-giris'
        ? ['google']
        : ['cloudflare', 'recaptcha'];
  return (
    <Frame
      description={
        group === 'iletisim'
          ? 'E-posta ve WhatsApp bağlantılarınızı yönetin.'
          : group === 'robot-dogrulama'
            ? 'Girişte kullanılacak robot doğrulama sağlayıcısını yapılandırın.'
            : 'Google ve Apple hesabıyla giriş bağlantıları.'
      }
    >
      <IntegrationDirtyContext.Provider
        value={{
          reportDirty,
          reportRobotEnabled,
          activeRobot,
          selectRobot: setActiveRobot,
        }}
      >
        <UnsavedChanges dirty={Object.values(dirty).some(Boolean)} />
        {group === 'iletisim' ? (
          <>
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {['smtp', 'imap'].map((section) => (
                <SettingsPageContent key={section} section={section} embedded />
              ))}
            </div>
            <SettingsPageContent section="whatsapp" embedded />
          </>
        ) : group === 'robot-dogrulama' ? (
          <>
            <p className="text-sm text-ink-muted">
              Robot doğrulamada aynı anda yalnızca bir sağlayıcı etkin olabilir. Etkinleştirip
              kaydettiğinizde diğeri kapanır.
            </p>
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {sections.map((section) => (
                <SettingsPageContent key={section} section={section} embedded />
              ))}
            </div>
          </>
        ) : (
          sections.map((section) => (
            <SettingsPageContent key={section} section={section} embedded />
          ))
        )}
        {group === 'sosyal-giris' && <SocialLoginStatus />}
      </IntegrationDirtyContext.Provider>
    </Frame>
  );
}

function SocialLoginStatus() {
  const state = useRows<{
    google: boolean;
    apple: boolean;
    appleRedirect: string;
    googleRedirect: string;
  }>('/sosyal-giris', {
    google: false,
    apple: false,
    appleRedirect: '',
    googleRedirect: '',
  });
  return (
    <section className={`${panel} space-y-4`}>
      <h2 className="text-xl font-extrabold">Apple ile Giriş</h2>
      <LoadState {...state} retry={state.reload} />
      {!state.loading && !state.error && (
        <>
          <p className="font-semibold">
            {state.value.apple
              ? 'Apple ile giriş yapılandırılmış.'
              : 'Apple ile giriş henüz yapılandırılmamış.'}
          </p>
          <p className="text-sm text-ink-muted">
            Apple giriş ayarları sunucudaki APPLE_CLIENT_ID ve APPLE_CLIENT_SECRET ile yönetilir.
          </p>
          <p className="text-sm text-ink-muted">Apple Developer dönüş adresi:</p>
          <p className="break-all font-mono text-xs">{state.value.appleRedirect}</p>
          <p className="text-sm text-ink-muted">
            Google ile genel giriş{' '}
            {state.value.google
              ? 'sunucuda yapılandırılmıştır'
              : 'sunucuda henüz yapılandırılmamıştır'}
            . Yukarıdaki işletme bağlantısı ayrı kaydedilir.
          </p>
        </>
      )}
    </section>
  );
}

function SettingsPageContent({
  section,
  embedded = false,
}: {
  section: string;
  embedded?: boolean;
}) {
  const integration = useContext(IntegrationDirtyContext);
  const reportDirty = integration?.reportDirty;
  const page = SETTINGS_PAGES.find((p) => p.key === section);
  const { can, refresh } = useWorkspace();
  const rows = useRows<FullSettings>(`/ayarlar/${page?.key ?? 'general'}`, {
    values: {},
    configured: [],
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftSource, setDraftSource] = useState<FullSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const [challengeToken, setChallengeToken] = useState('');
  const [challengeRevision, setChallengeRevision] = useState(0);
  const defaultValues: Record<string, string> = {
    ...rows.value.values,
    ...(section === 'smtp'
      ? {
          host: rows.value.values.host || 'smtp.example.com',
          port: rows.value.values.port || '587',
        }
      : section === 'imap'
        ? {
            host: rows.value.values.host || 'imap.example.com',
            port: rows.value.values.port || '993',
          }
        : {}),
  };
  const dirty =
    !busy &&
    draftSource === rows.value &&
    !!page &&
    page.fields.some((field) => (draft[field.key] ?? '') !== (defaultValues[field.key] ?? ''));
  useEffect(() => {
    reportDirty?.(section, dirty);
    return () => reportDirty?.(section, false);
  }, [reportDirty, section, dirty]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        setDraft(defaultValues);
        setDraftSource(rows.value);
      }
    });
    return () => {
      active = false;
    };
  }, [rows.value]);
  useEffect(() => {
    if (section === 'cloudflare' || section === 'recaptcha')
      integration?.reportRobotEnabled(section, rows.value.values.enabled === 'true');
  }, [integration?.reportRobotEnabled, rows.value, section]);
  useEffect(() => {
    if (
      (section === 'cloudflare' || section === 'recaptcha') &&
      integration?.activeRobot &&
      integration.activeRobot !== section
    )
      setDraft((previous) =>
        previous.enabled === 'true' ? { ...previous, enabled: 'false' } : previous,
      );
  }, [integration?.activeRobot, section]);
  if (!page)
    return (
      <Frame>
        <Alert tone="info">Ayar sayfası bulunamadı.</Alert>
      </Frame>
    );
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };
  const Layout = embedded ? EmbeddedSettings : Frame;
  return (
    <Layout
      back={section === 'general' ? '/uygulama/ayarlar' : '/uygulama/ayarlar/entegrasyonlar'}
      description={page.description}
    >
      <LoadState {...rows} retry={rows.reload} />
      {!rows.loading && !rows.error && draftSource === rows.value && (
        <form
          aria-label={page.title}
          className={`${panel} w-full ${embedded ? 'flex h-full flex-col gap-5' : 'space-y-5'}`}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(async () => {
              await post(`/ayarlar/${page.key}`, { values: draft });
              await rows.reload();
              await refresh();
              setMessage('Ayarlar kaydedildi.');
            });
          }}
        >
          {!embedded && (
            <UnsavedChanges
              dirty={
                !busy &&
                draftSource === rows.value &&
                page.fields.some((f) => (draft[f.key] ?? '') !== (defaultValues[f.key] ?? ''))
              }
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{page.title}</h2>
            {page.fields.some((f) => f.key === 'enabled') && (
              <fieldset
                disabled={busy || !can('settings', 'save')}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <span>{draft.enabled === 'true' ? 'Aktif' : 'Pasif'}</span>
                <ToggleSwitch
                  label={
                    section === 'whatsapp'
                      ? 'WhatsApp Entegrasyonunu Etkinleştir'
                      : 'Doğrulamayı Etkinleştir'
                  }
                  checked={draft.enabled === 'true'}
                  onChange={(value) => {
                    setDraft({ ...draft, enabled: String(value) });
                    if (section === 'cloudflare' || section === 'recaptcha')
                      integration?.selectRobot(value ? section : null);
                  }}
                />
              </fieldset>
            )}
          </div>
          {embedded && <p className="text-sm text-ink-muted">{page.description}</p>}
          {rows.value.source && (
            <p className="text-xs text-ink-muted">
              Kullanılan ayar:{' '}
              {rows.value.source === 'database'
                ? 'Bu işletmenin kayıtlı bilgileri'
                : rows.value.source === 'environment'
                  ? 'Sunucudaki ortak ayarlar'
                  : 'Henüz tanımlanmadı'}
            </p>
          )}
          {section === 'images' && (
            <p className="text-sm text-ink-muted">
              Açık olduğunda görselin kenarlarına bağlı beyaz arka plan temizlenir. Özgün dosya
              korunur; kapattığınızda özgün görsel gösterilir.
            </p>
          )}
          {(section === 'cloudflare' || section === 'recaptcha') && (
            <p className="text-sm text-ink-muted">
              Site anahtarını ve gizli anahtarı sağlayıcınızdan alın; bu uygulamanın alan adını izin
              verilen alanlara ekleyin. Birini etkinleştirdiğinizde diğeri kapanır. Bu ayar
              işletmenize kayıtlı kullanıcıların e-posta girişinde uygulanır.
            </p>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          {message && <Alert tone="info">{message}</Alert>}
          {params.has('google') && (
            <Alert tone="info">
              {params.get('google') === 'baglandi'
                ? 'Google bağlantısı kuruldu.'
                : 'Google bağlantısı tamamlanamadı. Ayarları kontrol edip yeniden deneyin.'}
            </Alert>
          )}
          <fieldset
            disabled={!can('settings', 'save') || busy}
            className="grid gap-5 sm:grid-cols-2"
          >
            {page.fields
              .filter((f) => f.key !== 'enabled')
              .map((f) => {
                const type = 'type' in f ? f.type : undefined;
                return (
                  <div key={f.key} className={f.key === 'address' ? 'sm:col-span-2' : ''}>
                    {section === 'images' ? (
                      <div className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
                        <span className="font-semibold">{f.label}</span>
                        <ToggleSwitch
                          label={f.label}
                          checked={draft[f.key] === 'true'}
                          onChange={(v) => setDraft({ ...draft, [f.key]: String(v) })}
                        />
                      </div>
                    ) : type === 'boolean' ? (
                      <SelectField
                        label={f.label}
                        value={draft[f.key] ?? 'false'}
                        options={[
                          { value: 'true', label: 'Evet' },
                          {
                            value: 'false',
                            label: f.key === 'secure' ? 'Hayır (STARTTLS)' : 'Hayır',
                          },
                        ]}
                        onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                      />
                    ) : type === 'secret' ? (
                      <SecretSettingField
                        key={`${section}/${f.key}`}
                        label={f.label}
                        value={draft[f.key]}
                        configured={rows.value.configured.includes(f.key)}
                        section={section}
                        field={f.key}
                        onChange={(value) => setDraft({ ...draft, [f.key]: value })}
                      />
                    ) : (
                      <TextField
                        label={f.label}
                        value={draft[f.key] ?? ''}
                        numeric={type === 'port' ? 'integer' : undefined}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
          </fieldset>
          {section === 'imap' && (
            <p className="text-sm text-ink-muted">
              IMAP bağlantısı TLS ile şifrelenir. Standart port 993’tür.
            </p>
          )}
          {(section === 'cloudflare' || section === 'recaptcha') &&
            rows.value.values.siteKey &&
            rows.value.configured.includes('secretKey') && (
              <div className="space-y-3 rounded-2xl border border-line p-4">
                <p className="text-sm font-semibold">Kayıtlı Anahtarlarla Doğrulama Testi</p>
                <RobotChallenge
                  key={challengeRevision}
                  config={{ provider: section, siteKey: rows.value.values.siteKey }}
                  onToken={setChallengeToken}
                />
                <Button
                  flow={false}
                  type="button"
                  variant="outline"
                  fullWidth={false}
                  disabled={busy || !challengeToken || !can('settings', 'save')}
                  onClick={() =>
                    void run(async () => {
                      try {
                        const result = await post<{ message: string }>(`/ayarlar/${section}/test`, {
                          challengeToken,
                        });
                        setMessage(result.message);
                      } finally {
                        setChallengeToken('');
                        setChallengeRevision((n) => n + 1);
                      }
                    })
                  }
                >
                  Doğrulamayı Test Et
                </Button>
              </div>
            )}
          {section === 'whatsapp' && (
            <details className="space-y-3 rounded-2xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Gelen WhatsApp Kurulumu
              </summary>
              <p className="text-sm text-ink-muted">
                Meta uygulamanızda bu adresi webhook olarak ekleyin. Doğrulama belirteci yukarıdaki
                değerle aynı olmalı; messages alanına abone olun.
              </p>
              <p className="break-all font-mono text-xs">{rows.value.webhookUrl}</p>
              <p className="text-xs text-ink-muted">
                Webhook imzaları Uygulama Gizli Anahtarı ile doğrulanır. Mesaj içeriği saklanmaz;
                gelen mesaj ve teslimat bildirimi sayıları loglanır.
              </p>
            </details>
          )}
          {(section === 'smtp' || section === 'imap') &&
            draft.allowInvalidCertificate === 'true' && (
              <p className="text-xs text-ink-muted">
                Bu bağlantıda TLS şifrelemesi sürer; sertifikayla sunucu kimliği doğrulanmaz.
              </p>
            )}
          {section === 'google' && (
            <div className="space-y-2 rounded-2xl bg-surface-muted p-4 text-sm">
              <p className="font-semibold">
                {rows.value.googleConnected ? 'Google Bağlı' : 'Google Bağlı Değil'}
              </p>
              <p className="text-ink-muted">Google Cloud yönlendirme adresi:</p>
              <p className="break-all font-mono text-xs">{rows.value.googleRedirect}</p>
              <p className="text-xs text-ink-muted">
                Bu adres Google Cloud’daki istemcinin “Yetkili yönlendirme URI’leri” listesiyle
                birebir eşleşmeli. Girişte çalışan aynı istemci kullanılıyorsa mevcut giriş dönüş
                adresi kullanılır.
              </p>
            </div>
          )}
          {can('settings', 'save') && (
            <div className={`flex flex-wrap gap-3 ${embedded ? 'mt-auto' : ''}`}>
              <Button flow={false} type="submit" fullWidth={false} loading={busy}>
                Kaydet
              </Button>
              {(section === 'smtp' || section === 'imap' || section === 'whatsapp') && (
                <Button
                  flow={false}
                  type="button"
                  variant="outline"
                  fullWidth={false}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await post<{ message?: string }>(`/ayarlar/${section}/test`);
                      setMessage(
                        section === 'whatsapp'
                          ? (result.message ?? 'Meta bağlantısı doğrulandı.')
                          : 'Kayıtlı bağlantı doğrulandı. E-posta gönderilmedi.',
                      );
                    })
                  }
                >
                  Kayıtlı Bağlantıyı Test Et
                </Button>
              )}
              {section === 'google' && (
                <>
                  <Button
                    flow={false}
                    type="button"
                    variant="outline"
                    fullWidth={false}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const r = await post<{ url: string }>('/google/baglan');
                        window.location.assign(r.url);
                      })
                    }
                  >
                    Google’a Bağlan
                  </Button>
                  {rows.value.googleConnected && (
                    <Button
                      flow={false}
                      type="button"
                      variant="ghost"
                      fullWidth={false}
                      disabled={busy || !can('settings', 'delete')}
                      onClick={() =>
                        void run(async () => {
                          await post('/google/ayir');
                          await rows.reload();
                          setMessage('Google bağlantısı kaldırıldı.');
                        })
                      }
                    >
                      Bağlantıyı Kaldır
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </form>
      )}
      {section === 'whatsapp' && !rows.loading && !rows.error && can('settings', 'save') && (
        <WhatsAppMessageForm />
      )}
    </Layout>
  );
}

function normalizeRecipient(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  if (/^0\d{10}$/.test(digits)) return `+90${digits.slice(1)}`;
  if (/^5\d{9}$/.test(digits)) return `+90${digits}`;
  return digits ? `+${digits}` : '';
}

function formatRecipient(value: string) {
  const normalized = normalizeRecipient(value);
  return normalized.replace(/^(\+90)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');
}

function WhatsAppMessageForm() {
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className={`${panel} space-y-4`}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setResult('');
        setError('');
        void post<{ message: string }>('/ayarlar/whatsapp/mesaj', {
          to: normalizeRecipient(to),
          text,
        })
          .then((value) => setResult(value.message))
          .catch((failure) => setError(dataError(failure)))
          .finally(() => setBusy(false));
      }}
    >
      <h2 className="text-lg font-bold">WhatsApp Mesajı Gönder</h2>
      <p className="text-sm text-ink-muted">
        Mesaj, kayıtlı Meta hesabınızdan gönderilir. Serbest metin mesajları için alıcıyla Meta’nın
        izin verdiği açık bir görüşme bulunmalı.
      </p>
      {result && <Alert tone="info">{result}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <TextField
        label="Alıcı Telefon Numarası"
        type="tel"
        autoComplete="tel"
        hint="Örnek: +90 5XX XXX XX XX"
        required
        value={to}
        onChange={(e) => setTo(e.target.value)}
        onBlur={() => setTo(formatRecipient(to))}
        maxLength={32}
      />
      <TextField
        label="Mesaj"
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4096}
      />
      <Button flow={false} type="submit" loading={busy} fullWidth={false}>
        Mesaj Gönder
      </Button>
    </form>
  );
}

export function LogsPage() {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<WorkspaceLog | null>(null);
  const rows = useRows<{ items: WorkspaceLog[]; total: number }>(`/loglar?page=${page}`, {
    items: [],
    total: 0,
  });
  const label = (key: string) =>
    WORKSPACE_RESOURCES.find((r) => r.key === key)?.label ??
    ({ profile: 'Profil' } as Record<string, string>)[key] ??
    key;
  return (
    <Frame description="İşletmedeki işlemler ve değişiklikler">
      <LoadState {...rows} retry={rows.reload} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface-raised">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-ink-muted">
            <tr>
              {['Tarih / Saat', 'Kullanıcı', 'Bölüm', 'İşlem', 'Sonuç'].map((t) => (
                <th className="px-5 py-4" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.value.items.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-5 py-4 text-xs text-ink-muted">
                  {new Date(r.time).toLocaleString('tr-TR')}
                </td>
                <td className="px-5 py-4 font-semibold">{r.user}</td>
                <td className="px-5 py-4">{label(r.section)}</td>
                <td className="px-5 py-4">
                  <button
                    className="min-h-10 font-semibold text-brand-ink underline-offset-4 hover:underline"
                    onClick={() => setDetail(r)}
                  >
                    {r.action}
                  </button>
                </td>
                <td className="px-5 py-4 text-xs">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.loading && !rows.value.items.length && (
          <p className="p-8 text-center text-sm text-ink-muted">Henüz işlem kaydı yok.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised p-4 text-sm text-ink-muted">
        <span>{rows.value.total} kayıt</span>
        <div className="flex items-center gap-3">
          <Button
            flow={false}
            variant="outline"
            fullWidth={false}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Önceki
          </Button>
          <span>{page}</span>
          <Button
            flow={false}
            variant="outline"
            fullWidth={false}
            disabled={page * 30 >= rows.value.total}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </Button>
        </div>
      </div>
      {detail && (
        <Sheet
          open
          title={`${label(detail.section)} · ${detail.action}`}
          description={`${detail.user} · ${new Date(detail.time).toLocaleString('tr-TR')}`}
          onClose={() => setDetail(null)}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm font-semibold">{detail.status}</p>
            {visibleLogChanges(detail.changes).length ? (
              <div className="space-y-3">
                {visibleLogChanges(detail.changes).map((c, i) => (
                  <div key={i} className="rounded-2xl border border-line p-4">
                    <p className="mb-2 text-sm font-bold break-words">{c.field}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-ink-muted">Önceki</p>
                        <p className="text-sm break-all">{c.before ?? '—'}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-ink-muted">Yeni</p>
                        <p className="text-sm break-all">{c.after ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                Bu işlem için alan değişikliği kaydı bulunmuyor.
              </p>
            )}
            <p className="text-xs text-ink-muted">
              Şifreler, gizli anahtarlar ve e-posta içerikleri kaydedilmez.
            </p>
          </div>
        </Sheet>
      )}
    </Frame>
  );
}
