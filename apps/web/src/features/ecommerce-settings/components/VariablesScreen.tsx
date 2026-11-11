import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { usePagination } from '../../../lib/usePagination';
import { TEMPLATE_VARIABLES, type TemplateVariable } from '../../../mocks/ecommerce-settings';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DisabledAction,
  EditAction,
  EmptyState,
  ScreenCard,
} from './Parts';

const MODULES = ['Kullanıcılar', 'Siparişler', 'Kampanyalar', 'Sistem'] as const;
const TYPES = ['E-Posta', 'Sms'] as const;

/** Şablon değişkenleri listesi: ID / ADI / MODÜL / TİP / DEĞİŞKENLER + sayfalama. */
export function VariablesScreen() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<TemplateVariable | 'new' | null>(null);
  const query = search.trim().toLocaleLowerCase('tr');
  const filtered = TEMPLATE_VARIABLES.filter(
    (variable) =>
      !query ||
      variable.name.toLocaleLowerCase('tr').includes(query) ||
      variable.module.toLocaleLowerCase('tr').includes(query) ||
      variable.code.toLocaleLowerCase('tr').includes(query),
  );
  const pagination = usePagination(filtered);
  const { pageItems } = pagination;

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
            disabled
            aria-describedby={BACKEND_NOTICE_ID}
            leadingIcon={<Download className="size-4" aria-hidden="true" />}
          >
            Dışa Aktar
          </Button>
          <Button flow={false}
            type="button"
            fullWidth={false}
            leadingIcon={<Plus className="size-4" aria-hidden="true" />}
            onClick={() => setForm('new')}
          >
            Ekle
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
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
        {filtered.length === 0 ? (
          <EmptyState>Aramayla eşleşen değişken yok.</EmptyState>
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
                    {variable.code.split(',').map((code) => (
                      <Badge key={code} tone="brand">
                        #{code.trim()}#
                      </Badge>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <EditAction
                      label={`${variable.name} değişkenini düzenle`}
                      onClick={() => setForm(variable)}
                    />
                    <DisabledAction label={`${variable.name} değişkenini sil`} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
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
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form === 'new' ? 'Değişken Ekle' : 'Değişkeni Düzenle'}
        description="Kayıt backend bağlantısı gelince açılacak."
        size="md"
      >
        {form && (
          <VariableForm
            key={form === 'new' ? 'new' : form.id}
            variable={form === 'new' ? null : form}
            onClose={() => setForm(null)}
          />
        )}
      </Sheet>
    </ScreenCard>
  );
}

function VariableForm({
  variable,
  onClose,
}: {
  variable: TemplateVariable | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(variable?.name ?? '');
  const [type, setType] = useState<string>(variable?.type ?? '');
  const [module, setModule] = useState<string>(variable?.module ?? '');
  const [mapping, setMapping] = useState<{ id: string; column: string; code: string }[]>(
    variable
      ? [{ id: '1', column: variable.code.split(',')[0]?.trim() ?? '', code: variable.code }]
      : [{ id: '1', column: '', code: '' }],
  );
  const [touched, setTouched] = useState(false);
  const nameError = touched && !name.trim() ? 'Adı zorunlu.' : undefined;
  const typeError = touched && !type ? 'Tip seçin.' : undefined;
  const moduleError = touched && !module ? 'Modül seçin.' : undefined;

  return (
    <form
      aria-label={variable ? 'Değişken düzenleme formu' : 'Yeni değişken formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
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
          options={[{ value: '', label: 'Tip seçiniz.' }, ...TYPES.map((item) => ({ value: item, label: item }))]}
          onChange={setType}
        />
      </div>
      <SelectField
        label="Modül"
        value={module}
        error={moduleError}
        options={[
          { value: '', label: 'Modül seçiniz.' },
          ...MODULES.map((item) => ({ value: item, label: item })),
        ]}
        onChange={setModule}
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
          onClick={() =>
            setMapping((previous) => [
              ...previous,
              { id: String(Date.now()), column: '', code: '' },
            ])
          }
        >
          Eşleştirme Ekle
        </Button>
      </div>

      <p className="text-xs text-ink-muted">
        Düz metin şifre gönderen şablon üretilmez; şifre alanı yalnızca ilk kayıt veya yenileme
        bağlantısı için kullanılır.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button flow={false} type="submit" fullWidth={false} disabled aria-describedby={BACKEND_NOTICE_ID}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
