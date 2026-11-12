import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { TemplateVariableDto } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { SelectField } from './SiteSelect';
import { Sheet } from '../../../components/ui/Sheet';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { usePagination } from '../../../lib/usePagination';
import { TEMPLATE_VARIABLES } from '../../../mocks/ecommerce-settings';
import { downloadCsv } from '../export';
import { useSiteList } from '../hooks/useSiteList';
import { siteService } from '../services/site.service';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DeleteAction,
  DisabledAction,
  EditAction,
  EmptyState,
  LoadingRows,
  ScreenCard,
} from './Parts';

const MODULES = ['Kullanıcılar', 'Siparişler', 'Kampanyalar', 'Sistem'] as const;
const TYPES = ['E-Posta', 'Sms'] as const;

const isTemplateType = (value: string): value is TemplateVariableDto['type'] =>
  value === 'E-Posta' || value === 'Sms';

/** Demo oturumunun yerel değişken listesi: örnek kod listesi alanlara bölünür. */
const DEMO_VARIABLES: TemplateVariableDto[] = TEMPLATE_VARIABLES.map((variable) => ({
  id: variable.id,
  name: variable.name,
  type: variable.type,
  module: variable.module,
  description: variable.description,
  fields: variable.code.split(',').map((code, index) => ({
    id: `${variable.id}-${index}`,
    column: code.trim(),
    code: code.trim(),
  })),
}));

interface FieldRow {
  id: string;
  column: string;
  code: string;
}

let rowSeq = 0;
const newFieldRow = (): FieldRow => ({ id: `yeni-${++rowSeq}`, column: '', code: '' });

/** Şablon değişkenleri listesi: ID / ADI / MODÜL / TİP / DEĞİŞKENLER + sayfalama. */
export function VariablesScreen() {
  const { demo, items, loading, loaded, error, setError, refresh, reload } = useSiteList(
    DEMO_VARIABLES,
    siteService.variables,
  );
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<TemplateVariableDto | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateVariableDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = search.trim().toLocaleLowerCase('tr');
  const filtered = query
    ? items.filter(
        (variable) =>
          variable.name.toLocaleLowerCase('tr').includes(query) ||
          variable.module.toLocaleLowerCase('tr').includes(query) ||
          variable.fields.some((field) => field.code.toLocaleLowerCase('tr').includes(query)),
      )
    : items;
  const pagination = usePagination(filtered);
  const { pageItems } = pagination;

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setNotice(null);
    try {
      await siteService.deleteVariable(pendingDelete.id);
      setPendingDelete(null);
      setNotice('Değişken silindi.');
      await refresh();
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = async (message: string) => {
    setForm(null);
    setNotice(message);
    await refresh();
  };

  /** Değişken listesini CSV olarak indirir. */
  const exportCsv = () => {
    downloadCsv('sablon-degiskenleri.csv', [
      ['Ad', 'Tür', 'Modül', 'Açıklama', 'Alan Sayısı'],
      ...items.map((item) => [
        item.name,
        item.type,
        item.module,
        item.description,
        item.fields.length,
      ]),
    ]);
  };

  return (
    <ScreenCard
      title="Şablon Değişkenleri"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            fullWidth={false}
            flow={false}
            onClick={exportCsv}
            leadingIcon={<Download className="size-4" aria-hidden="true" />}
          >
            Dışa Aktar
          </Button>
          <Button
            flow={false}
            type="button"
            fullWidth={false}
            leadingIcon={<Plus className="size-4" aria-hidden="true" />}
            onClick={() => {
              setNotice(null);
              setForm('new');
            }}
          >
            Ekle
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="space-y-3">
            <Alert tone="error">{error}</Alert>
            <Button
              flow={false}
              type="button"
              variant="outline"
              fullWidth={false}
              onClick={() => void reload()}
            >
              Yeniden Yükle
            </Button>
          </div>
        ) : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <SearchField
          label="Değişken ara"
          value={search}
          onChange={(value) => {
            setSearch(value);
            pagination.setPage(1);
          }}
          placeholder="Ara"
        />
        <div className="hidden grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_5rem_minmax(0,1.6fr)_6rem] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>ID</span>
          <span>Adı</span>
          <span>Modül</span>
          <span>Tip</span>
          <span>Değişkenler</span>
          <span className="text-right">İşlem</span>
        </div>
        {loading ? (
          <LoadingRows count={4} />
        ) : !loaded ? null : filtered.length === 0 ? (
          <EmptyState>
            {query ? 'Aramayla eşleşen değişken yok.' : 'Henüz değişken yok. “Ekle” ile başlayın.'}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {pageItems.map((variable) => (
              <li key={variable.id}>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-raised px-3 py-2 sm:grid sm:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_5rem_minmax(0,1.6fr)_6rem] sm:gap-3">
                  <span className="w-7 shrink-0 text-xs font-bold text-ink-muted sm:w-auto">
                    {variable.id}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-bold sm:flex-none">
                    {variable.name}
                  </p>
                  <p className="text-xs text-ink-muted sm:text-sm">{variable.module}</p>
                  <p className="text-xs text-ink-muted sm:text-sm">{variable.type}</p>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {variable.fields.length === 0 ? (
                      <span className="text-xs text-ink-muted">—</span>
                    ) : (
                      variable.fields.map((field) => (
                        <Badge key={field.id} tone="brand">
                          #{field.code.trim()}#
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <EditAction
                      label={`${variable.name} değişkenini düzenle`}
                      onClick={() => {
                        setNotice(null);
                        setForm(variable);
                      }}
                    />
                    {demo ? (
                      <DisabledAction label={`${variable.name} değişkenini sil`} />
                    ) : (
                      <DeleteAction
                        label={`${variable.name} değişkenini sil`}
                        disabled={busy}
                        onClick={() => setPendingDelete(variable)}
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && loaded && (
          <PaginationBar
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.setPage}
            sizeText={pagination.sizeText}
            onSizeTextChange={pagination.setSizeText}
            noun="değişken"
          />
        )}
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form === 'new' ? 'Değişken Ekle' : 'Değişkeni Düzenle'}
        description={
          demo
            ? 'Test modunda kayıt kapalıdır; alanlar yalnızca yerel önizleme içindir.'
            : 'Ad, tip, modül ve değişken eşleştirmeleri.'
        }
        size="md"
      >
        {form && (
          <VariableForm
            key={form === 'new' ? 'new' : form.id}
            variable={form === 'new' ? null : form}
            demo={demo}
            onClose={() => setForm(null)}
            onSaved={handleSaved}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={!!pendingDelete}
        title="Değişkeni Sil"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” değişkeni kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : ''
        }
        confirmLabel="Sil"
        danger
        onConfirm={() => void remove()}
        onClose={() => setPendingDelete(null)}
      />
    </ScreenCard>
  );
}

function VariableForm({
  variable,
  demo,
  onClose,
  onSaved,
}: {
  variable: TemplateVariableDto | null;
  demo: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(variable?.name ?? '');
  const [type, setType] = useState<string>(variable?.type ?? '');
  const [module, setModule] = useState<string>(variable?.module ?? '');
  const [description, setDescription] = useState(variable?.description ?? '');
  const [mapping, setMapping] = useState<FieldRow[]>(() =>
    variable && variable.fields.length > 0
      ? variable.fields.map((field) => ({
          id: field.id,
          column: field.column,
          code: field.code,
        }))
      : [newFieldRow()],
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameError = touched && !name.trim() ? 'Adı zorunlu.' : undefined;
  const typeError = touched && !type ? 'Tip seçin.' : undefined;
  const moduleError = touched && !module ? 'Modül seçin.' : undefined;
  // Sunucuda kayıtlı özel bir modül varsa listede görünsün (seçim boş görünmesin).
  const moduleOptions = [
    { value: '', label: 'Modül seçiniz.' },
    ...MODULES.map((item) => ({ value: item, label: item })),
    ...(module && !MODULES.some((item) => item === module)
      ? [{ value: module, label: module }]
      : []),
  ];

  const submit = async () => {
    setTouched(true);
    if (demo || saving || !name.trim() || !module || !isTemplateType(type)) return;
    setSaving(true);
    setError(null);
    const fields = mapping
      .map((row) => ({ column: row.column.trim(), code: row.code.trim() }))
      .filter((field) => field.column !== '' || field.code !== '');
    try {
      await siteService.saveVariable(
        {
          name: name.trim(),
          type,
          module,
          description: description.trim(),
          fields,
        },
        variable?.id,
      );
      await onSaved(variable ? 'Değişken güncellendi.' : 'Değişken eklendi.');
    } catch (e) {
      setError(dataError(e));
      setSaving(false);
    }
  };

  return (
    <form
      aria-label={variable ? 'Değişken düzenleme formu' : 'Yeni değişken formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Adı"
          required
          error={nameError}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <SelectField
          label="Tip"
          value={type}
          error={typeError}
          options={[
            { value: '', label: 'Tip seçiniz.' },
            ...TYPES.map((item) => ({ value: item, label: item })),
          ]}
          onChange={setType}
        />
      </div>
      <SelectField
        label="Modül"
        value={module}
        error={moduleError}
        options={moduleOptions}
        onChange={setModule}
      />
      <TextAreaField
        label="Açıklama"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold">Değişkenler</p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-line pb-1 text-xs font-bold tracking-wide text-ink-muted uppercase">
          <span>DB Sütun</span>
          <span>Değişken</span>
          <span aria-hidden="true" />
        </div>
        {mapping.map((row, index) => (
          <div key={row.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <TextField
              label={mapping.length > 1 ? `DB Sütun ${index + 1}` : 'DB Sütun'}
              value={row.column}
              onChange={(e) =>
                setMapping((previous) =>
                  previous.map((item) =>
                    item.id === row.id ? { ...item, column: e.target.value } : item,
                  ),
                )
              }
            />
            <TextField
              label={mapping.length > 1 ? `Değişken ${index + 1}` : 'Değişken'}
              value={row.code}
              onChange={(e) =>
                setMapping((previous) =>
                  previous.map((item) =>
                    item.id === row.id ? { ...item, code: e.target.value } : item,
                  ),
                )
              }
            />
            <button
              type="button"
              aria-label={`${index + 1}. eşleştirmeyi kaldır`}
              disabled={mapping.length === 1}
              onClick={() =>
                setMapping((previous) => previous.filter((item) => item.id !== row.id))
              }
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          fullWidth={false}
          flow={false}
          leadingIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => setMapping((previous) => [...previous, newFieldRow()])}
        >
          Eşleştirme Ekle
        </Button>
      </div>

      <p className="text-xs text-ink-muted">
        Düz metin şifre gönderen şablon üretilmez; şifre alanı yalnızca ilk kayıt veya yenileme
        bağlantısı için kullanılır.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button
          flow={false}
          type="submit"
          fullWidth={false}
          disabled={demo || saving}
          loading={saving}
          loadingLabel="Kaydediliyor…"
          aria-describedby={demo ? BACKEND_NOTICE_ID : undefined}
        >
          Kaydet
        </Button>
      </div>
    </form>
  );
}
