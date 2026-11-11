import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SearchField } from '../../../components/ui/SearchField';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import {
  MENU_ENTRIES,
  MENU_GROUPS,
  type MenuEntry,
  type MenuGroupKey,
} from '../../../mocks/ecommerce-settings';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DisabledAction,
  EditAction,
  EmptyState,
  SaveBar,
  ScreenCard,
  SortableRow,
} from './Parts';

type Grouped = Record<MenuGroupKey, MenuEntry[]>;

const groupEntries = (entries: readonly MenuEntry[]): Grouped =>
  Object.fromEntries(
    MENU_GROUPS.map((group) => [group.key, entries.filter((e) => e.group === group.key)]),
  ) as Grouped;

/** Menü Yönetimi: üst menü, alt menü ve üç alt menü bloğu; arama ve satır işlemleri. */
export function MenuScreen() {
  const [groups, setGroups] = useState<Grouped>(() => groupEntries(MENU_ENTRIES));
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ entry: MenuEntry | null } | null>(null);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [group, setGroup] = useState<MenuGroupKey>('ust');
  const [newTab, setNewTab] = useState(false);
  const [active, setActive] = useState(true);

  const openForm = (entry: MenuEntry | null) => {
    setForm({ entry });
    setLabel(entry?.label ?? '');
    setUrl(entry?.url ?? '');
    setGroup(entry?.group ?? 'ust');
    setNewTab(entry?.newTab ?? false);
    setActive(entry?.active ?? true);
  };

  const query = search.trim().toLocaleLowerCase('tr');

  return (
    <ScreenCard
      title="Menü Yönetimi"
      actions={
        <Button flow={false}
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
        <SearchField
          label="Menüde ara"
          value={search}
          onChange={setSearch}
          placeholder="Ara"
        />

        <div className="hidden grid-cols-[minmax(0,1fr)_6rem] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Adı / Link</span>
          <span className="text-right">Yeni Sekme</span>
        </div>

        {MENU_GROUPS.map((groupInfo) => {
          const all = groups[groupInfo.key];
          const items = query
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
                  {all.length > 0 ? 'Sıralamak için tutup sürükleyin' : 'Boş'}
                </span>
              </summary>
              <div className="space-y-2 border-t border-line p-3">
                {items.length === 0 ? (
                  <EmptyState>
                    {query ? 'Aramayla eşleşen öğe yok.' : 'Bu blokta öğe yok.'}
                  </EmptyState>
                ) : (
                  <SortableList
                    label={groupInfo.label}
                    items={items}
                    getId={(entry) => entry.id}
                    getLabel={(entry) => entry.label}
                    disabled={!!query}
                    onReorder={(next) =>
                      setGroups((previous) => ({ ...previous, [groupInfo.key]: next }))
                    }
                    renderItem={(entry, context) => (
                      <SortableRow
                        context={context}
                        title={entry.label}
                        meta={entry.url}
                        badges={
                          <span className="w-20 shrink-0 text-right text-sm text-ink-muted">
                            {entry.newTab ? 'Evet' : 'Hayır'}
                          </span>
                        }
                        actions={
                          <div className="flex shrink-0 items-center">
                            <EditAction
                              label={`${entry.label} menü öğesini düzenle`}
                              onClick={() => openForm(entry)}
                            />
                            <DisabledAction label={`${entry.label} menü öğesini sil`} />
                          </div>
                        }
                      />
                    )}
                  />
                )}
              </div>
            </details>
          );
        })}
        {query && (
          <p className="text-xs text-ink-muted">
            Arama sırasında sıralama kapalıdır; sırayı değiştirmek için aramayı temizleyin.
          </p>
        )}
        <SaveBar label="Değişiklikleri Kaydet" />
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.entry ? 'Menü Öğesini Düzenle' : 'Menü Öğesi Ekle'}
        description="Menü öğesinin adı, bağlantısı ve görünürlüğü."
        size="md"
      >
        <div className="space-y-5">
          <SelectField
            label="Menü Grubu"
            value={group}
            options={MENU_GROUPS.map((item) => ({ value: item.key, label: item.label }))}
            onChange={(value) => setGroup(value as MenuGroupKey)}
          />
          <TextField label="Adı" value={label} onChange={(e) => setLabel(e.target.value)} />
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
          <div className="flex flex-wrap items-center gap-3">
            <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={() => setForm(null)}>
              Kapat
            </Button>
            <Button flow={false} type="button" disabled fullWidth={false} aria-describedby={BACKEND_NOTICE_ID}>
              Kaydet
            </Button>
          </div>
        </div>
      </Sheet>
    </ScreenCard>
  );
}
