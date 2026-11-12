import { ArrowUp, Check, Home, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import type { SeoRedirectDraft, SeoRedirectDto, SeoRowDto } from '../types';

/** Tablo hücrelerindeki satır içi alanların ortak görünümü (tema token'larıyla). */
const cellInput =
  'w-full rounded-xl border border-field-border bg-surface-raised px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-brand-600 focus:outline-none';

interface RowActions {
  onSave: (id: string, input: { seoTitle: string; seoDescription: string }) => Promise<void>;
  onAddRedirect: (id: string, draft: SeoRedirectDraft) => Promise<void>;
  onUpdateRedirect: (redirectId: string, input: { seoTitle: string; seoDescription: string }) => Promise<void>;
  onRemoveRedirect: (redirectId: string) => Promise<void>;
}

/** Satır içi başlık/açıklama çifti: boşken kayıttaki değer, yazınca düzenleme; kaydetince temizlenir. */
function useFieldEdit(row: { seoTitle: string; seoDescription: string }) {
  const [titleEdit, setTitleEdit] = useState<string | null>(null);
  const [descriptionEdit, setDescriptionEdit] = useState<string | null>(null);
  const title = titleEdit ?? row.seoTitle;
  const description = descriptionEdit ?? row.seoDescription;
  const dirty = titleEdit !== null || descriptionEdit !== null;
  const clear = () => {
    setTitleEdit(null);
    setDescriptionEdit(null);
  };
  return {
    title,
    description,
    dirty,
    onTitle: setTitleEdit,
    onDescription: setDescriptionEdit,
    clear,
  };
}

function Fields({
  owner,
  edit,
  saving,
  onSave,
}: {
  owner: string;
  edit: ReturnType<typeof useFieldEdit>;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <td className="px-3 py-2">
        <input
          aria-label={`${owner} için SEO Başlığı`}
          className={cellInput}
          maxLength={250}
          value={edit.title}
          onChange={(e) => edit.onTitle(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <textarea
          aria-label={`${owner} için SEO Açıklaması`}
          className={`${cellInput} min-h-20 resize-y`}
          maxLength={1000}
          rows={2}
          placeholder="Description"
          value={edit.description}
          onChange={(e) => edit.onDescription(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        {edit.dirty ? (
          <button
            type="button"
            aria-label="Kaydet"
            disabled={saving}
            onClick={onSave}
            className="mx-auto flex size-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            <Check className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </td>
    </>
  );
}

/** Masaüstü: URL | TITLE | DESCRIPTION tablosu; 301 satırları ana satırın altında kırmızı bloktur. */
export function SeoTableRow({ row, actions }: { row: SeoRowDto; actions: RowActions }) {
  const edit = useFieldEdit(row);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      await actions.onSave(row.id, { seoTitle: edit.title.trim(), seoDescription: edit.description.trim() });
      edit.clear();
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr className="align-top transition-colors hover:bg-brand-50/40">
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            <Home className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="truncate font-bold text-brand-800" title={row.address}>
              {row.address}
            </span>
          </span>
          {problem ? (
            <p role="alert" className="mt-1 text-xs font-semibold text-danger">
              {problem}
            </p>
          ) : null}
        </td>
        <Fields owner={row.name} edit={edit} saving={saving} onSave={() => void save()} />
        <td className="px-2 py-2">
          <button
            type="button"
            aria-label={`${row.name} için 301 yönlendirme ekle`}
            onClick={() => setAdding(true)}
            className="mx-auto flex size-9 items-center justify-center rounded-full bg-success-soft text-success transition-colors hover:bg-success/20"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </td>
      </tr>
      {row.redirects.map((r) => (
        <RedirectTableRow key={r.id} redirect={r} actions={actions} />
      ))}
      {adding ? (
        <RedirectSheet
          onClose={() => setAdding(false)}
          onSave={async (draft) => {
            await actions.onAddRedirect(row.id, draft);
            setAdding(false);
          }}
        />
      ) : null}
    </>
  );
}

/** 301 satırı: eski adres + kendi başlık/açıklaması düzenlenebilir; çöp ile silinir. */
function RedirectTableRow({ redirect, actions }: { redirect: SeoRedirectDto; actions: RowActions }) {
  const edit = useFieldEdit(redirect);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await actions.onUpdateRedirect(redirect.id, {
        seoTitle: edit.title.trim(),
        seoDescription: edit.description.trim(),
      });
      edit.clear();
    } catch {
      // Sunucu hatasında düzenleme korunur; yeniden denenebilir.
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-danger-soft/40 align-top">
      <td className="py-2 pl-12 pr-3">
        <span className="flex items-center gap-2">
          <ArrowUp className="size-4 shrink-0 text-danger" aria-hidden="true" />
          <span className="shrink-0 rounded-md bg-danger px-1.5 py-px text-[0.6875rem] font-extrabold text-surface">
            301
          </span>
          <span className="truncate font-mono text-xs font-bold text-danger" title={redirect.from}>
            {redirect.from}
          </span>
        </span>
      </td>
      <Fields owner={redirect.from} edit={edit} saving={saving} onSave={() => void save()} />
      <td className="px-2 py-2">
        <button
          type="button"
          aria-label={`${redirect.from} yönlendirmesini sil`}
          onClick={() => setRemoving(true)}
          className="mx-auto flex size-9 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/10"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
        <ConfirmSheet
          open={removing}
          danger
          title="301 Yönlendirmeyi Sil"
          description="Bu eski adres yeniden kullanılamaz; silme geri alınamaz."
          confirmLabel="Sil"
          onClose={() => setRemoving(false)}
          onConfirm={() => {
            void actions.onRemoveRedirect(redirect.id).catch(() => undefined);
            setRemoving(false);
          }}
        />
      </td>
    </tr>
  );
}

/** Telefon: tablo sığmaz; her kayıt adres + alanlar + 301 bloklarıyla yığılır. */
export function SeoStackRow({ row, actions }: { row: SeoRowDto; actions: RowActions }) {
  const edit = useFieldEdit(row);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      await actions.onSave(row.id, { seoTitle: edit.title.trim(), seoDescription: edit.description.trim() });
      edit.clear();
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <Home className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-bold text-brand-800" title={row.address}>
          {row.address}
        </span>
        <button
          type="button"
          aria-label={`${row.name} için 301 yönlendirme ekle`}
          onClick={() => setAdding(true)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>
      <input
        aria-label={`${row.name} için SEO Başlığı`}
        className={cellInput}
        maxLength={250}
        value={edit.title}
        onChange={(e) => edit.onTitle(e.target.value)}
      />
      <textarea
        aria-label={`${row.name} için SEO Açıklaması`}
        className={`${cellInput} min-h-20 resize-y`}
        maxLength={1000}
        rows={2}
        placeholder="Description"
        value={edit.description}
        onChange={(e) => edit.onDescription(e.target.value)}
      />
      {edit.dirty ? (
        <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void save()} className="self-start">
          Kaydet
        </Button>
      ) : null}
      {problem ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      {row.redirects.map((r) => (
        <RedirectStackBlock key={r.id} redirect={r} actions={actions} />
      ))}
      {adding ? (
        <RedirectSheet
          onClose={() => setAdding(false)}
          onSave={async (draft) => {
            await actions.onAddRedirect(row.id, draft);
            setAdding(false);
          }}
        />
      ) : null}
    </li>
  );
}

function RedirectStackBlock({ redirect, actions }: { redirect: SeoRedirectDto; actions: RowActions }) {
  const edit = useFieldEdit(redirect);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await actions.onUpdateRedirect(redirect.id, {
        seoTitle: edit.title.trim(),
        seoDescription: edit.description.trim(),
      });
      edit.clear();
    } catch {
      // Sunucu hatasında düzenleme korunur; yeniden denenebilir.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-danger/20 bg-danger-soft px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ArrowUp className="size-4 shrink-0 text-danger" aria-hidden="true" />
        <span className="shrink-0 rounded-md bg-danger px-1.5 py-px text-[0.6875rem] font-extrabold text-surface">
          301
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-danger" title={redirect.from}>
          {redirect.from}
        </span>
        <button
          type="button"
          aria-label={`${redirect.from} yönlendirmesini sil`}
          onClick={() => setRemoving(true)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger/10"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <input
        aria-label={`${redirect.from} için SEO Başlığı`}
        className={cellInput}
        maxLength={250}
        value={edit.title}
        onChange={(e) => edit.onTitle(e.target.value)}
      />
      <textarea
        aria-label={`${redirect.from} için SEO Açıklaması`}
        className={`${cellInput} min-h-20 resize-y`}
        maxLength={1000}
        rows={2}
        placeholder="Description"
        value={edit.description}
        onChange={(e) => edit.onDescription(e.target.value)}
      />
      {edit.dirty ? (
        <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void save()} className="self-start">
          Kaydet
        </Button>
      ) : null}
      <ConfirmSheet
        open={removing}
        danger
        title="301 Yönlendirmeyi Sil"
        description="Bu eski adres yeniden kullanılamaz; silme geri alınamaz."
        confirmLabel="Sil"
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          void actions.onRemoveRedirect(redirect.id).catch(() => undefined);
          setRemoving(false);
        }}
      />
    </div>
  );
}

/** 301 yönlendirme ekleme: eski adres zorunlu ("/" ile başlar), başlık/açıklama isteğe bağlı. */
export function RedirectSheet({
  onSave,
  onClose,
}: {
  onSave: (draft: SeoRedirectDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [from, setFrom] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = from.trim();
    if (!value) return setError('Eski adres gerekli.');
    if (!value.startsWith('/')) return setError('Eski adres "/" ile başlamalı.');
    setSaving(true);
    try {
      await onSave({ from: value, seoTitle: title.trim(), seoDescription: description.trim() });
    } catch (e) {
      setError(dataError(e));
      setSaving(false);
    }
  };

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      size="md"
      title="301 Yönlendirme Ekle"
      description="Eski adres bu sayfaya kalıcı olarak yönlendirilir."
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Eski Adres"
          value={from}
          error={error}
          maxLength={300}
          onChange={(e) => {
            setFrom(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <TextField
          label="SEO Başlığı"
          value={title}
          maxLength={250}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextAreaField
          label="SEO Açıklaması"
          rows={2}
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-3 border-t border-line pt-4">
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
          <Button flow={false} loading={saving} loadingLabel="Ekleniyor…" onClick={() => void submit()}>
            Ekle
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export type { RowActions };
