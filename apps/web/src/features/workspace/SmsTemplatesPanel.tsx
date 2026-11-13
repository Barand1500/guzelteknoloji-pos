import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, ChevronDown, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  EMAIL_TEMPLATE_LIMIT,
  SMS_TEMPLATE_LIMIT,
  MESSAGE_EVENTS,
  MESSAGE_VARIABLES,
  messageTemplatesSchema,
  templateVariables,
  type TemplateVariableDto,
} from '@gt/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../components/ui/PaginationBar';
import { SearchField } from '../../components/ui/SearchField';
import { SelectField } from '../../components/ui/SelectField';
import { Sheet } from '../../components/ui/Sheet';
import { TextAreaField } from '../../components/ui/TextAreaField';
import { TextField } from '../../components/ui/TextField';
import { apiRequest } from '../../lib/http';
import { dataError } from '../../lib/catalog-data';
import { downloadCsv } from '../ecommerce-settings/export';
import { useWorkspace } from './workspace-context';
import { siteService } from '../ecommerce-settings/services/site.service';
import { MessageDeliveryHistory } from './MessageDeliveryHistory';

interface SmsTemplate {
  id: string;
  name: string;
  text: string;
  subject?: string;
  event?: string;
  [key: string]: unknown;
}
const names = [
  '2 Aşamalı Doğrulama',
  'B2B Firma Kayıt Bildirim',
  'B2B Hesap Onayı',
  'B2B Hesap Reddi',
  'Değişim Kabul Edildi',
  'Değişim Reddedildi',
  'Değişim Talep Edildi-Panel',
  'Fiyat Alarmı',
  'Hazırlanıyor',
  'İade Kabul Edildi',
  'İade Reddedildi',
  'Sipariş Alındı',
  'Kargoya Verildi',
  'Teslim Edildi',
];
const fold = (s: string) => s.trim().toLocaleLowerCase('tr');
const csvCell = (s: string) => (/^[\s]*[=+\-@]/.test(s) ? `'${s}` : s);

/** Kayıt biçimi korunur: işletme ayarlarının sablonlar alanında JSON liste. */
export function SmsTemplatesPanel({ channel = 'sms' }: { channel?: 'sms' | 'email' }) {
  const email = channel === 'email';
  const endpoint = `/api/hesap/ayarlar/${email ? 'site_eposta_sablonlari' : 'site_sms_sablonlari'}`;
  const templateNames = email
    ? ['Uygulama-Üyeliksiz Sipariş E-Posta Doğrulama', 'E-Posta Doğrulama', ...names]
    : names;
  const { demo, can } = useWorkspace();
  const editable = can('settings', 'save');
  const [items, setItems] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const [descending, setDescending] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [form, setForm] = useState<SmsTemplate | null>(null);
  const [selection, setSelection] = useState('');
  const [remove, setRemove] = useState<SmsTemplate | null>(null);
  const [retry, setRetry] = useState(0);
  const [variables, setVariables] = useState<TemplateVariableDto[] | null>(null);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const editorOpen = form !== null;
  useEffect(() => {
    if (!editorOpen || demo || variables !== null) return;
    let active = true;
    void siteService
      .variables()
      .then((rows) => {
        if (active) {
          setVariables(rows);
          setVariablesError(null);
        }
      })
      .catch(() => {
        if (active)
          setVariablesError(
            'Kayıtlı değişkenler yüklenemedi. Yerleşik değişkenleri kullanabilirsiniz.',
          );
      });
    return () => {
      active = false;
    };
  }, [editorOpen, demo, variables]);
  const fields = useMemo(
    () =>
      (variables ?? [])
        .filter(
          (row) =>
            row.type === (email ? 'E-Posta' : 'Sms') &&
            ['Siparişler', 'Sistem'].includes(row.module),
        )
        .flatMap((row) => row.fields),
    [variables, email],
  );
  const selectedEvent = form?.event;
  const availableBuiltins = useMemo(
    () =>
      MESSAGE_VARIABLES.filter(
        (variable) =>
          variable.key !== 'iadetutari' ||
          !selectedEvent ||
          selectedEvent.startsWith('return.') ||
          selectedEvent.startsWith('exchange.'),
      ),
    [selectedEvent],
  );
  const dummyValues = useMemo(
    () => Object.fromEntries(availableBuiltins.map((variable) => [variable.key, 'örnek'])),
    [availableBuiltins],
  );
  const supportedVariables = useMemo(
    () => templateVariables(dummyValues, fields),
    [fields, dummyValues],
  );
  const chips = useMemo(() => {
    const labels = new Map<string, string>(
      availableBuiltins.map((variable) => [variable.key, variable.label]),
    );
    for (const field of fields) {
      const code = field.code.replace(/^#|#$/g, '');
      if (Object.hasOwn(supportedVariables, code) && !labels.has(code)) labels.set(code, code);
    }
    return [...labels].map(([code, label]) => ({ code, label }));
  }, [fields, supportedVariables, availableBuiltins]);
  const unsupportedFields = fields.filter(
    (field) =>
      !Object.hasOwn(templateVariables(dummyValues, [field]), field.code.replace(/^#|#$/g, '')),
  );
  const unresolved = form?.event
    ? [...new Set(`${form.subject ?? ''} ${form.text}`.match(/#[\p{L}\p{N}_-]+#/gu) ?? [])].filter(
        (token) => !Object.hasOwn(supportedVariables, token.slice(1, -1)),
      )
    : [];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReady(false);
    setError(null);
    if (demo) {
      setItems([]);
      setLoading(false);
      setReady(true);
      return;
    }
    void apiRequest<{ values: Record<string, string> }>(endpoint)
      .then((result) => {
        const parsed: unknown = JSON.parse(result.values.sablonlar || '[]');
        if (!Array.isArray(parsed))
          throw new Error('Kayıtlı şablonlar okunamadı; veriler değiştirilmedi.');
        const list = parsed.map((item: unknown, index): SmsTemplate => {
          if (
            !item ||
            typeof item !== 'object' ||
            !('name' in item) ||
            typeof item.name !== 'string'
          )
            throw new Error('Kayıtlı şablonlardan biri okunamadı; veriler değiştirilmedi.');
          const row = item as Record<string, unknown>;
          return {
            ...row,
            id: String(row.id ?? `s${index}`),
            name: item.name,
            text: typeof row.text === 'string' ? row.text : '',
            ...(email ? { subject: typeof row.subject === 'string' ? row.subject : '' } : {}),
          };
        });
        if (new Set(list.map((i) => i.id)).size !== list.length)
          throw new Error('Kayıtlı şablon kimlikleri çakışıyor; veriler değiştirilmedi.');
        if (active) {
          setItems(list);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(dataError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, retry, endpoint, email]);

  const filtered = useMemo(
    () =>
      items
        .filter(
          (i) =>
            fold(i.name).includes(fold(query)) ||
            fold(i.text).includes(fold(query)) ||
            (email && fold(i.subject ?? '').includes(fold(query))),
        )
        .sort((a, b) => (descending ? -1 : 1) * a.name.localeCompare(b.name, 'tr')),
    [items, query, descending, email],
  );
  const size = Math.min(100, Math.max(1, Number(sizeText) || 10));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * size, current * size);
  const persist = useCallback(
    async (next: SmsTemplate[]) => {
      if (!editable || busy || !ready) return false;
      const validation = messageTemplatesSchema(channel).safeParse(next);
      if (!validation.success) {
        setError(validation.error.issues[0]?.message ?? 'Şablon bilgilerini kontrol edin.');
        return false;
      }
      const value = JSON.stringify(next);
      if (value.length > (email ? EMAIL_TEMPLATE_LIMIT : SMS_TEMPLATE_LIMIT)) {
        setError('Şablonların toplam metni çok uzun. İçerikleri kısaltın.');
        return false;
      }
      if (demo) {
        setItems(next);
        setError(null);
        setNotice('Şablonlar deneme listesinde güncellendi; sunucuya kaydedilmedi.');
        return true;
      }
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await apiRequest(endpoint, { method: 'POST', body: { values: { sablonlar: value } } });
        setItems(next);
        setNotice('Şablonlar kaydedildi.');
        return true;
      } catch (e) {
        setError(dataError(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [editable, busy, ready, endpoint, demo, channel, email],
  );
  const openEditor = (item?: SmsTemplate) => {
    setError(null);
    setNotice(null);
    setForm(item ? { ...item } : { id: crypto.randomUUID(), name: '', text: '' });
    setSelection(item ? (templateNames.includes(item.name) ? item.name : 'custom') : '');
  };
  const save = async () => {
    if (!form) return;
    if (unresolved.length) {
      setError(
        `Desteklenmeyen değişkenler: ${unresolved.join(', ')}. Otomatik gönderim için desteklenen değişkenleri kullanın.`,
      );
      return;
    }
    const clean = { ...form, name: form.name.trim(), text: form.text.trim() };
    if (email) clean.subject = clean.subject?.trim() ?? '';
    if (!clean.name || !clean.text || (email && !clean.subject?.trim())) {
      setError('Şablon ve içerik alanlarını doldurun.');
      return;
    }
    if (items.some((i) => i.id !== clean.id && fold(i.name) === fold(clean.name))) {
      setError('Bu şablon adı zaten kayıtlı. Mevcut şablonu düzenleyin.');
      return;
    }
    const next = items.some((i) => i.id === clean.id)
      ? items.map((i) => (i.id === clean.id ? clean : i))
      : [...items, clean];
    if (await persist(next)) setForm(null);
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {demo && (
        <Alert>
          Test modu: Şablonları ekleyip düzenleyebilirsiniz. Değişiklikler yalnızca bu ekranda
          kalır, sunucuya kaydedilmez.
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="outline"
          fullWidth={false}
          flow={false}
          onClick={() => setHistoryOpen((open) => !open)}
        >
          Gönderim Geçmişi
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              flow={false}
              fullWidth={false}
              className="min-h-11! shrink-0 px-4! py-2! text-sm! whitespace-nowrap"
              leadingIcon={<Download className="size-4 shrink-0" aria-hidden="true" />}
              disabled={!ready || !filtered.length || busy}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              onClick={() => setExportOpen((v) => !v)}
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                Dışa Aktar
                <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
              </span>
            </Button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 min-w-52 rounded-2xl border border-line bg-surface-raised p-2 shadow-soft"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full rounded-xl p-3 text-left text-sm font-semibold hover:bg-surface-muted"
                  onClick={() => {
                    downloadCsv(email ? 'eposta-sablonlari.csv' : 'sms-sablonlari.csv', [
                      email ? ['Şablon Adı', 'Konu', 'İçerik'] : ['Şablon Adı', 'İçerik'],
                      ...filtered.map((i) =>
                        email
                          ? [csvCell(i.name), csvCell(i.subject ?? ''), csvCell(i.text)]
                          : [csvCell(i.name), csvCell(i.text)],
                      ),
                    ]);
                    setExportOpen(false);
                  }}
                >
                  CSV olarak indir ({filtered.length})
                </button>
              </div>
            )}
          </div>
          <Button
            flow={false}
            fullWidth={false}
            className="min-h-11! shrink-0 px-4! py-2! text-sm! whitespace-nowrap"
            leadingIcon={<Plus className="size-4 shrink-0" aria-hidden="true" />}
            disabled={!editable || !ready || busy}
            onClick={() => openEditor()}
          >
            Ekle
          </Button>
        </div>
      </div>
      {historyOpen && (
        <MessageDeliveryHistory key={`${channel}-${demo}`} channel={channel} demo={demo} />
      )}
      <SearchField
        label="Şablon ara"
        value={query}
        onChange={(v) => {
          setQuery(v);
          setPage(1);
        }}
      />
      {error && !form && <Alert tone="error">{error}</Alert>}
      {!loading && !ready && (
        <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
          Tekrar Dene
        </Button>
      )}
      {notice && <Alert>{notice}</Alert>}
      {loading ? (
        <p role="status">Şablonlar yükleniyor…</p>
      ) : (
        ready && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface-muted/50">
                  <tr>
                    <th scope="col" aria-sort={descending ? 'descending' : 'ascending'}>
                      <button
                        type="button"
                        className="inline-flex min-h-12 items-center gap-2 px-4 text-xs font-bold tracking-wide text-ink-muted"
                        onClick={() => setDescending((v) => !v)}
                      >
                        ŞABLON ADI
                        <ArrowDownUp className="size-4" />
                      </button>
                    </th>
                    {email && (
                      <th scope="col" className="px-4 text-xs text-ink-muted">
                        KONU
                      </th>
                    )}
                    <th scope="col" className="w-24 px-3">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-muted/50"
                      onDoubleClick={() => editable && !busy && openEditor(item)}
                    >
                      <td className="px-4 py-3 font-semibold">{item.name}</td>
                      {email && <td className="px-4 py-3 text-ink-muted">{item.subject ?? ''}</td>}
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`${item.name} şablonunu düzenle`}
                            disabled={!editable || busy}
                            onClick={() => openEditor(item)}
                            className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-brand-ink disabled:opacity-40"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${item.name} şablonunu sil`}
                            disabled={!editable || !can('settings', 'delete') || busy}
                            onClick={() => {
                              setError(null);
                              setRemove(item);
                            }}
                            className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={email ? 3 : 2} className="p-8 text-center text-ink-muted">
                        {query
                          ? 'Aramanıza uygun şablon yok.'
                          : 'Henüz şablon yok. Ekle ile şablon oluşturabilirsiniz.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              total={filtered.length}
              from={filtered.length ? (current - 1) * size + 1 : 0}
              to={Math.min(current * size, filtered.length)}
              page={current}
              pageCount={pages}
              onPageChange={setPage}
              sizeText={sizeText}
              onSizeTextChange={(v) => {
                setSizeText(v);
                setPage(1);
              }}
              noun="şablon"
            />
          </>
        )
      )}
      {form && (
        <Sheet
          open
          size={email ? 'lg' : 'md'}
          title={items.some((i) => i.id === form.id) ? 'Şablon Düzenle' : 'Şablon Ekle'}
          permission="save"
          onClose={() => {
            if (!busy) setForm(null);
          }}
        >
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
              <SelectField
                label="Şablon"
                value={selection}
                options={[
                  { value: '', label: 'Şablon seçiniz' },
                  ...templateNames.map((name) => ({ value: name, label: name })),
                  { value: 'custom', label: 'Özel Şablon' },
                ]}
                onChange={(value) => {
                  setSelection(value);
                  setForm((f) => (f ? { ...f, name: value === 'custom' ? '' : value } : f));
                }}
              />
              {selection === 'custom' && (
                <TextField
                  label="Şablon Adı"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                />
              )}
              <SelectField
                label="Gönderim Olayı"
                value={form.event ?? ''}
                options={[{ value: '', label: 'Otomatik gönderim kapalı' }, ...MESSAGE_EVENTS]}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, event } : current))
                }
              />
              <p className="text-sm text-ink-muted">
                Yalnızca seçilen olay gerçekleştiğinde otomatik gönderilir. Olay seçilmezse otomatik
                gönderim yapılmaz.
              </p>
              <div>
                <p className="text-sm font-bold">Kullanılabilir Değişkenler:</p>
                {form.event ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chips.map(({ code, label }) => (
                      <button
                        key={code}
                        type="button"
                        className="rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-muted"
                        onClick={() =>
                          setForm((current) =>
                            current ? { ...current, text: current.text + `#${code}#` } : current,
                          )
                        }
                      >
                        {label} #{code}#
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-ink-muted">
                    Değişkenleri görmek için gönderim olayı seçin.
                  </p>
                )}
                {variablesError && <p className="mt-2 text-sm text-ink-muted">{variablesError}</p>}
                {unsupportedFields.length > 0 && (
                  <p className="mt-2 text-sm text-ink-muted">
                    Bazı kayıtlı değişkenlerin sütunları desteklenmiyor:{' '}
                    {unsupportedFields.map((field) => field.code).join(', ')}. Yalnızca desteklenen
                    sipariş ve sistem alanları kullanılabilir.
                  </p>
                )}
                {unresolved.length > 0 && (
                  <p role="status" className="mt-2 text-sm text-danger">
                    Çözümlenemeyen değişkenler: {unresolved.join(', ')}
                  </p>
                )}
              </div>
              {email && (
                <TextField
                  label="Konu"
                  hint="Alıcının gelen kutusunda göreceği e-posta başlığı."
                  required
                  maxLength={250}
                  value={form.subject ?? ''}
                  onChange={(e) => setForm((f) => (f ? { ...f, subject: e.target.value } : f))}
                />
              )}
              <TextAreaField
                label="İçerik"
                required
                rows={email ? 12 : 5}
                maxLength={email ? 64000 : 4000}
                value={form.text}
                onChange={(e) => setForm((f) => (f ? { ...f, text: e.target.value } : f))}
              />
            </fieldset>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                fullWidth={false}
                flow={false}
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Kapat
              </Button>
              <Button
                type="submit"
                fullWidth={false}
                loading={busy}
                disabled={
                  unresolved.length > 0 ||
                  !selection ||
                  !form.name.trim() ||
                  !form.text.trim() ||
                  (email && !form.subject?.trim())
                }
              >
                Kaydet
              </Button>
            </div>
          </form>
        </Sheet>
      )}
      <ConfirmSheet
        open={remove !== null}
        danger
        title="Şablon Silinsin Mi?"
        description={`${remove?.name ?? ''} şablonu silinecek.`}
        confirmLabel={busy ? 'Siliniyor…' : 'Sil'}
        onClose={() => {
          if (!busy) setRemove(null);
        }}
        onConfirm={() => {
          if (remove)
            void persist(items.filter((i) => i.id !== remove.id)).then((ok) => {
              if (ok) setRemove(null);
            });
        }}
      >
        {error && <Alert tone="error">{error}</Alert>}
      </ConfirmSheet>
    </div>
  );
}
