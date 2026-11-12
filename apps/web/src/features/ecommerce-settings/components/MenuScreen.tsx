import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { MenuEntryDto, MenuEntryDraftInput } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { SelectField } from './SiteSelect';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { MENU_ENTRIES, MENU_GROUPS, type MenuGroupKey } from '../../../mocks/ecommerce-settings';
import { useWorkspace } from '../../workspace/workspace-context';
import { siteService } from '../services/site.service';
import { Badge, EditAction, EmptyState, ScreenCard, SortableRow } from './Parts';

type Grouped = Record<MenuGroupKey, MenuEntryDto[]>;

const groupEntries = (entries: readonly MenuEntryDto[]): Grouped =>
  Object.fromEntries(
    MENU_GROUPS.map((group) => [group.key, entries.filter((e) => e.group === group.key)]),
  ) as Grouped;

/** Demo oturumunda gösterilen örnek menü; sıra alanı eklenir, sunucuya yazılmaz. */
const demoMenu: MenuEntryDto[] = MENU_ENTRIES.map((entry, index) => ({ ...entry, order: index }));

/**
 * Menü Yönetimi: üst menü, alt menü ve üç alt menü bloğu; arama ve satır işlemleri.
 * Gerçek oturumda liste `siteService.menu()` ile yüklenir; demo oturumunda örnek kayıtlar
 * yerel olarak düzenlenir ve hiçbir API çağrısı yapılmaz.
 */
export function MenuScreen() {
  const { demo } = useWorkspace();
  const [items, setItems] = useState<MenuEntryDto[]>(() => (demo ? [...demoMenu] : []));
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MenuEntryDto | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ entry: MenuEntryDto | null } | null>(null);
  const query = search.trim().toLocaleLowerCase('tr');
  const groups = useMemo(() => groupEntries(items), [items]);
  // İlk yüklemede iskelet; sonraki yenilemelerde eski liste görünür kalır.
  const skeleton = loading && items.length === 0;

  const refresh = useCallback(() => {
    setLoading(true);
    setReload((count) => count + 1);
  }, []);

  useEffect(() => {
    if (demo) return;
    let active = true;
    void siteService
      .menu()
      .then((list) => {
        if (!active) return;
        setItems(list);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(dataError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, reload]);

  const openForm = (entry: MenuEntryDto | null) => setForm({ entry });

  /** Kaydet: demo oturumunda listeyi yerel günceller, gerçek oturumda API'ye yazar. */
  const save = async (draft: MenuEntryDraftInput, id?: string) => {
    if (demo) {
      setItems((previous) =>
        id
          ? previous.map((entry) => (entry.id === id ? { ...entry, ...draft } : entry))
          : [...previous, { id: `demo-${Date.now()}`, ...draft }],
      );
      return;
    }
    await siteService.saveMenu(draft, id);
    refresh();
  };

  /**
   * Menü sırası grup içindedir: yeni sıra ekranda hemen gösterilir, tek istekle sunucuya yazılır.
   * İstek düşerse eski sıra geri gelir.
   */
  const reorder = async (group: MenuGroupKey, next: MenuEntryDto[]) => {
    const previous = items;
    const ordered = next.map((entry, index) => ({ ...entry, order: index }));
    setItems([...items.filter((entry) => entry.group !== group), ...ordered]);
    if (demo) return;
    try {
      await siteService.reorderMenu(ordered.map((entry) => entry.id));
      setError(null);
    } catch (cause: unknown) {
      setItems(previous);
      setError(dataError(cause));
    }
  };

  /** Satır silme: onay istenmez; demo oturumunda yalnızca listeden çıkarılır. */
  const remove = async (entry: MenuEntryDto) => {
    if (deleting) return;
    setError(null);
    setDeleting(entry.id);
    try {
      if (demo) {
        setItems((previous) => previous.filter((item) => item.id !== entry.id));
      } else {
        await siteService.deleteMenu(entry.id);
        refresh();
      }
    } catch (cause: unknown) {
      setError(dataError(cause));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <ScreenCard
      title="Menü Yönetimi"
      actions={
        <Button
          flow={false}
          type="button"
          fullWidth={false}
          leadingIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => openForm(null)}
        >
          Ekle
        </Button>
      }
    >
      <div className="space-y-3">
        {error ? (
          <Alert tone="error">
            {error}
            <button type="button" className="ml-3 underline" onClick={refresh}>
              Tekrar Dene
            </button>
          </Alert>
        ) : null}
        <SearchField label="Menüde ara" value={search} onChange={setSearch} placeholder="Ara" />

        <div className="hidden grid-cols-[minmax(0,1fr)_6rem] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Adı / Link</span>
          <span className="text-right">Yeni Sekme</span>
        </div>

        {skeleton ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            <span className="sr-only">Menü yükleniyor…</span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
            ))}
          </div>
        ) : error && items.length === 0 ? null : (
          MENU_GROUPS.map((groupInfo) => {
            const all = groups[groupInfo.key];
            const visible = query
              ? all.filter(
                  (entry) =>
                    entry.label.toLocaleLowerCase('tr').includes(query) ||
                    entry.url.toLocaleLowerCase('tr').includes(query),
                )
              : all;
            return (
              <details
                key={groupInfo.key}
                open={groupInfo.key === 'ust'}
                className="rounded-2xl border border-line bg-surface-raised"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-bold">
                  {groupInfo.label}
                  <Badge>{all.length}</Badge>
                  <span className="ml-auto text-xs font-semibold text-ink-muted">
                    {query
                      ? 'Arama sırasında sıralama kapalı'
                      : all.length > 0
                        ? 'Sıralamak için tutup sürükleyin'
                        : 'Boş'}
                  </span>
                </summary>
                <div className="space-y-2 border-t border-line p-3">
                  {visible.length === 0 ? (
                    <EmptyState>
                      {query ? 'Aramayla eşleşen öğe yok.' : 'Bu blokta öğe yok.'}
                    </EmptyState>
                  ) : (
                    <SortableList
                      label={groupInfo.label}
                      items={visible}
                      getId={(entry) => entry.id}
                      getLabel={(entry) => entry.label}
                      disabled={!!query}
                      onReorder={(next) => void reorder(groupInfo.key, next)}
                      renderItem={(entry, context) => (
                        <SortableRow
                          context={context}
                          title={entry.label}
                          meta={entry.url}
                          badges={
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge tone={entry.active ? 'brand' : 'muted'}>
                                {entry.active ? 'Aktif' : 'Pasif'}
                              </Badge>
                              <span className="w-14 text-right text-sm text-ink-muted">
                                {entry.newTab ? 'Evet' : 'Hayır'}
                              </span>
                            </div>
                          }
                          actions={
                            <div className="flex shrink-0 items-center">
                              <EditAction
                                label={`${entry.label} menü öğesini düzenle`}
                                onClick={() => openForm(entry)}
                              />
                              <DeleteAction
                                label={`${entry.label} menü öğesini sil`}
                                busy={deleting === entry.id}
                                onClick={() => setPendingDelete(entry)}
                              />
                            </div>
                          }
                        />
                      )}
                    />
                  )}
                </div>
              </details>
            );
          })
        )}
        {/* Sıra sürükle-bırakta anında kaydedilir; ayrıca "Kaydet" düğmesi yoktur. */}
        <p className="text-xs text-ink-muted">
          {query
            ? 'Arama sırasında sıralama kapalıdır; sırayı değiştirmek için aramayı temizleyin.'
            : 'Sıra, satırı sürüklediğinizde kaydedilir.'}
        </p>
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.entry ? 'Menü Öğesini Düzenle' : 'Menü Öğesi Ekle'}
        description="Menü öğesinin adı, bağlantısı ve görünürlüğü."
        size="md"
      >
        {form && (
          <MenuForm
            key={form.entry ? form.entry.id : 'new'}
            entry={form.entry}
            nextOrder={(group) => groups[group].length}
            onSave={save}
            onClose={() => setForm(null)}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={!!pendingDelete}
        title="Menü Öğesini Sil"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” menü öğesi kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : ''
        }
        confirmLabel="Sil"
        danger
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void remove(target);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </ScreenCard>
  );
}

interface MenuFormProps {
  entry: MenuEntryDto | null;
  /** Yeni öğenin sırası: seçilen gruptaki mevcut öğe sayısı. */
  nextOrder: (group: MenuGroupKey) => number;
  onSave: (draft: MenuEntryDraftInput, id?: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Menü öğesi Ekle / Düzenle formu. Kaydet, `MenuEntryDraftInput` gövdesini üretir; sıra
 * düzenlemede korunur, yeni kayıtta seçilen grubun sonuna eklenir.
 */
function MenuForm({ entry, nextOrder, onSave, onClose }: MenuFormProps) {
  const [label, setLabel] = useState(entry?.label ?? '');
  const [url, setUrl] = useState(entry?.url ?? '');
  const [group, setGroup] = useState<MenuGroupKey>(entry?.group ?? 'ust');
  const [newTab, setNewTab] = useState(entry?.newTab ?? false);
  const [active, setActive] = useState(entry?.active ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const error = touched && !label.trim() ? 'Menü adı zorunlu.' : undefined;

  const submit = async () => {
    setTouched(true);
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    setSaving(true);
    setProblem(null);
    try {
      await onSave(
        {
          group,
          label: cleanLabel,
          url: url.trim(),
          newTab,
          active,
          // Grup değişirse eski sıra taşınmaz; yeni grubun sonuna eklenir.
          order: entry?.group === group ? (entry?.order ?? nextOrder(group)) : nextOrder(group),
        },
        entry?.id,
      );
      onClose();
    } catch (cause: unknown) {
      setProblem(dataError(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      aria-label={entry ? 'Menü öğesi düzenleme formu' : 'Yeni menü öğesi formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving) void submit();
      }}
    >
      <SelectField
        label="Menü Grubu"
        value={group}
        options={MENU_GROUPS.map((item) => ({ value: item.key, label: item.label }))}
        onChange={(value) => setGroup(value as MenuGroupKey)}
      />
      <TextField
        label="Adı"
        required
        error={error}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      <TextField
        label="Link"
        hint="Örn. /sayfa/hakkimizda"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Yeni sekme</span>
          <ToggleSwitch label="Yeni sekmede aç" checked={newTab} onChange={setNewTab} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Aktif</span>
          <ToggleSwitch label="Aktif" checked={active} onChange={setActive} />
        </div>
      </div>
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button
          flow={false}
          type="submit"
          fullWidth={false}
          loading={saving}
          loadingLabel="Kaydediliyor…"
        >
          Kaydet
        </Button>
      </div>
    </form>
  );
}

/** Satır silme düğmesi: istek sürerken pasif, hata ekranın üstündeki uyarıda gösterilir. */
function DeleteAction({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}
