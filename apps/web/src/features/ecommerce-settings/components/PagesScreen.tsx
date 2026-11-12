import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { SitePageDto, SitePageDraftInput } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { usePagination } from '../../../lib/usePagination';
import {
  LEGAL_DOC_OPTIONS,
  SITE_PAGES,
  legalDocLabel,
  type LegalDocType,
} from '../../../mocks/ecommerce-settings';
import { useWorkspace } from '../../workspace/workspace-context';
import { downloadCsv } from '../export';
import { siteService } from '../services/site.service';
import { RichTextField } from './RichTextField';
import { Badge, EditAction, EmptyState, ScreenCard, SortableRow, reorderPage } from './Parts';

/** Demo oturumunda gösterilen örnek sayfalar; sıra alanı eklenir, sunucuya yazılmaz. */
const demoPages: SitePageDto[] = SITE_PAGES.map((page, index) => ({ ...page, order: index }));

const TR_LETTERS: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/** Sayfa adından bağlantı üretir: "Hakkımızda" → "hakkimizda". */
function slugify(title: string): string {
  return title
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (letter) => TR_LETTERS[letter] ?? letter)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Yeni sayfanın bağlantısını listede benzersiz yapar: hakkimizda → hakkimizda-2. */
function uniqueSlug(slug: string, pages: readonly SitePageDto[]): string {
  const taken = new Set(pages.map((page) => page.slug));
  if (!taken.has(slug)) return slug;
  const root = slug.slice(0, 116);
  let suffix = 2;
  while (taken.has(`${root}-${suffix}`)) suffix += 1;
  return `${root}-${suffix}`;
}

/**
 * Sayfalar listesi: 9 referans satırı, arama, sıralama, sayfalama ve satır işlemleri.
 * Gerçek oturumda liste `siteService.pages()` ile yüklenir; demo oturumunda örnek kayıtlar
 * yerel olarak düzenlenir ve hiçbir API çağrısı yapılmaz.
 */
export function PagesScreen() {
  const { demo } = useWorkspace();
  const [items, setItems] = useState<SitePageDto[]>(() => (demo ? [...demoPages] : []));
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SitePageDto | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<SitePageDto | 'new' | null>(null);
  const query = search.trim().toLocaleLowerCase('tr');
  const filtered = query
    ? items.filter(
        (page) =>
          page.title.toLocaleLowerCase('tr').includes(query) ||
          page.slug.toLocaleLowerCase('tr').includes(query),
      )
    : items;
  const pagination = usePagination(filtered);
  const { pageItems } = pagination;
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
      .pages()
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

  /** Kaydet: demo oturumunda listeyi yerel günceller, gerçek oturumda API'ye yazar. */
  const save = async (draft: SitePageDraftInput, id?: string) => {
    // Yeni sayfada bağlantı addan üretilir; aynı ad varsa sonuna sıra numarası eklenir.
    const next = id ? draft : { ...draft, slug: uniqueSlug(draft.slug, items) };
    if (demo) {
      setItems((previous) =>
        id
          ? previous.map((page) => (page.id === id ? { ...page, ...next } : page))
          : [...previous, { id: `demo-${Date.now()}`, ...next }],
      );
      return;
    }
    await siteService.savePage(next, id);
    refresh();
  };

  /**
   * Sürükle-bırak: yeni sıra önce ekranda gösterilir, sonra tek istekte sunucuya yazılır.
   * İstek düşerse eski sıra geri gelir; böylece ekranda görünen sıra her zaman kayıtlıdır.
   */
  const reorder = async (next: SitePageDto[]) => {
    const previous = items;
    const updated = reorderPage(items, pageItems, next);
    setItems(updated);
    if (demo) return;
    try {
      await siteService.reorderPages(updated.map((page) => page.id));
      setError(null);
    } catch (cause: unknown) {
      setItems(previous);
      setError(dataError(cause));
    }
  };

  /** Satır silme: onay istenmez; demo oturumunda yalnızca listeden çıkarılır. */
  const remove = async (page: SitePageDto) => {
    if (deleting) return;
    setError(null);
    setDeleting(page.id);
    try {
      if (demo) {
        setItems((previous) => previous.filter((item) => item.id !== page.id));
      } else {
        await siteService.deletePage(page.id);
        refresh();
      }
    } catch (cause: unknown) {
      setError(dataError(cause));
    } finally {
      setDeleting(null);
    }
  };

  /** Listeyi CSV olarak indirir (Excel'de Türkçe karakterler bozulmaz). */
  const exportCsv = () => {
    downloadCsv('sayfalar.csv', [
      ['Başlık', 'Bağlantı', 'Yasal Bağlantı', 'Yayında', 'Sıra'],
      ...items.map((page) => [
        page.title,
        `/sayfa/${page.slug}`,
        legalDocLabel(page.legal) ?? '',
        page.published ? 'Evet' : 'Hayır',
        page.order + 1,
      ]),
    ]);
  };

  return (
    <ScreenCard
      title="Sayfalar"
      actions={
        <div className="flex flex-wrap items-center gap-3">
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
            onClick={() => setForm('new')}
          >
            Ekle
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert tone="error">
            {error}
            <button type="button" className="ml-3 underline" onClick={refresh}>
              Tekrar Dene
            </button>
          </Alert>
        ) : null}
        <SearchField
          label="Sayfa ara"
          value={search}
          onChange={(value) => {
            setSearch(value);
            pagination.setPage(1);
          }}
          placeholder="Ara"
        />
        {skeleton ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            <span className="sr-only">Sayfalar yükleniyor…</span>
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-[4.25rem] animate-pulse rounded-2xl bg-surface-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          error && items.length === 0 ? null : (
            <EmptyState>
              {query ? 'Aramayla eşleşen sayfa yok.' : 'Henüz sayfa yok. “Ekle” ile başlayın.'}
            </EmptyState>
          )
        ) : (
          <SortableList
            label="Sayfalar"
            items={pageItems}
            getId={(page) => page.id}
            getLabel={(page) => page.title}
            disabled={!!query}
            onReorder={(next) => void reorder(next)}
            renderItem={(page, context) => (
              <SortableRow
                context={context}
                title={page.title}
                meta={`Sıra ${pagination.start + context.index + 1} · /sayfa/${page.slug}${
                  page.legal !== 'yok' ? ` · ${legalDocLabel(page.legal)}` : ''
                }`}
                badges={
                  <Badge tone={page.published ? 'brand' : 'muted'}>
                    {page.published ? 'Yayında' : 'Taslak'}
                  </Badge>
                }
                actions={
                  <div className="flex shrink-0 items-center">
                    <EditAction
                      label={`${page.title} sayfasını düzenle`}
                      onClick={() => setForm(page)}
                    />
                    <DeleteAction
                      label={`${page.title} sayfasını sil`}
                      busy={deleting === page.id}
                      onClick={() => setPendingDelete(page)}
                    />
                  </div>
                }
              />
            )}
          />
        )}
        {query ? (
          <p className="text-xs text-ink-muted">
            Arama sırasında sıralama kapalıdır; sırayı değiştirmek için aramayı temizleyin.
          </p>
        ) : (
          <p className="text-xs text-ink-muted">Sıra, satırı sürüklediğinizde kaydedilir.</p>
        )}
        {!skeleton && (
          <PaginationBar
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.setPage}
            sizeText={pagination.sizeText}
            onSizeTextChange={pagination.setSizeText}
            noun="sayfa"
          />
        )}
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form === 'new' ? 'Sayfa Ekle' : 'Sayfayı Düzenle'}
        description="Sayfa adı, içeriği ve yasal bağlantısı."
        size="xl"
      >
        {form && (
          <PageForm
            key={form === 'new' ? 'new' : form.id}
            page={form === 'new' ? null : form}
            nextOrder={items.length}
            onSave={save}
            onClose={() => setForm(null)}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={!!pendingDelete}
        title="Sayfayı Sil"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” sayfası kalıcı olarak silinecek. Bu işlem geri alınamaz.`
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

const legalOptions: { value: LegalDocType; label: string }[] = [
  { value: 'yok', label: 'Bağlantı yok' },
  ...LEGAL_DOC_OPTIONS.filter((option) => option.value !== 'yok').map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

interface PageFormProps {
  page: SitePageDto | null;
  /** Yeni sayfanın sırası: mevcut listenin uzunluğu. */
  nextOrder: number;
  onSave: (draft: SitePageDraftInput, id?: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Sayfa Ekle / Düzenle formu: ad, zengin içerik ve yasal bağlantı radyoları.
 * Kaydet, `SitePageDraftInput` gövdesini üretir; bağlantı (slug) düzenlemede korunur,
 * yeni kayıtta sayfa adından üretilir. Yeni sayfalar taslak olarak açılır.
 */
function PageForm({ page, nextOrder, onSave, onClose }: PageFormProps) {
  const { demo } = useWorkspace();
  const [title, setTitle] = useState(page?.title ?? '');
  const [content, setContent] = useState(page?.content ?? '');
  const [legal, setLegal] = useState<LegalDocType>(page?.legal ?? 'yok');
  // Yayın durumu formdan yönetilir; yoksa yeni sayfa kalıcı olarak "Taslak" kalıyordu.
  const [published, setPublished] = useState(page?.published ?? false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const error = touched && !title.trim() ? 'Sayfa adı zorunlu.' : undefined;

  const submit = async () => {
    setTouched(true);
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const slug = page?.slug ?? slugify(cleanTitle);
    if (!slug) {
      setProblem('Sayfa adından bir bağlantı üretilemedi; farklı bir ad yazın.');
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      await onSave(
        {
          title: cleanTitle,
          slug,
          content,
          legal,
          published,
          order: page?.order ?? nextOrder,
        },
        page?.id,
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
      aria-label={page ? 'Sayfa düzenleme formu' : 'Yeni sayfa formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving) void submit();
      }}
    >
      <TextField
        label="Sayfa Adı"
        required
        error={error}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Yayında</span>
        <ToggleSwitch label="Sayfa yayında" checked={published} onChange={setPublished} />
        <span className="text-sm text-ink-muted">{published ? 'Yayında' : 'Taslak'}</span>
      </div>
      <RichTextField
        label="Sayfa İçeriği"
        value={content}
        onChange={setContent}
        rows={12}
        hint="İçerik HTML olarak saklanır."
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Yasal Bağlantı</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {legalOptions.map((option) => {
            const active = legal === option.value;
            return (
              <label
                key={option.value}
                className={[
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600',
                  option.value === 'yok' ? 'sm:col-span-2' : '',
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-ink'
                    : 'border-line hover:border-brand-500',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="yasal-baglanti"
                  value={option.value}
                  checked={active}
                  onChange={() => setLegal(option.value)}
                  className="size-4 accent-brand-600"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {problem ? <Alert tone="error">{problem}</Alert> : null}
      <Alert tone="info">
        <span>
          {demo
            ? 'Test modunda değişiklikler yalnızca bu ekranda tutulur; sunucuya yazılmaz.'
            : 'Bağlantı (slug) ilk kayıtta sayfa adından üretilir; sonradan ad değişse de bağlantı sabit kalır.'}
        </span>
      </Alert>
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
