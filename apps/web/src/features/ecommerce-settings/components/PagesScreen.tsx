import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { usePagination } from '../../../lib/usePagination';
import {
  LEGAL_DOC_OPTIONS,
  SITE_PAGES,
  legalDocLabel,
  type LegalDocType,
  type SitePage,
} from '../../../mocks/ecommerce-settings';
import { RichTextField } from './RichTextField';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DisabledAction,
  EditAction,
  EmptyState,
  ScreenCard,
  SortableRow,
  reorderPage,
} from './Parts';

/** Sayfalar listesi: 9 referans satırı, arama, sıralama, sayfalama ve satır işlemleri. */
export function PagesScreen() {
  const [items, setItems] = useState<SitePage[]>(() => [...SITE_PAGES]);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState(false);
  const [form, setForm] = useState<SitePage | 'new' | null>(null);
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

  return (
    <ScreenCard
      title="Sayfalar"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Sıralama</span>
            <ToggleSwitch
              label="Sıralamayı aç"
              checked={sorting}
              onChange={setSorting}
            />
          </div>
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
          label="Sayfa ara"
          value={search}
          onChange={(value) => {
            setSearch(value);
            pagination.setPage(1);
          }}
          placeholder="Ara"
        />
        {filtered.length === 0 ? (
          <EmptyState>
            {query ? 'Aramayla eşleşen sayfa yok.' : 'Henüz sayfa yok. “Ekle” ile başlayın.'}
          </EmptyState>
        ) : (
          <SortableList
            label="Sayfalar"
            items={pageItems}
            getId={(page) => page.id}
            getLabel={(page) => page.title}
            disabled={!!query || !sorting}
            onReorder={(next) => setItems(reorderPage(items, pageItems, next))}
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
                    <DisabledAction label={`${page.title} sayfasını sil`} />
                  </div>
                }
              />
            )}
          />
        )}
        {query && (
          <p className="text-xs text-ink-muted">
            Arama sırasında sıralama kapalıdır; sırayı değiştirmek için aramayı temizleyin.
          </p>
        )}
        {!sorting && !query && (
          <p className="text-xs text-ink-muted">
            Sırayı değiştirmek için “Sıralama” anahtarını açın.
          </p>
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
          noun="sayfa"
        />
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form === 'new' ? 'Sayfa Ekle' : 'Sayfayı Düzenle'}
        description="Kayıt backend bağlantısı gelince açılacak."
        size="xl"
      >
        {form && (
          <PageForm
            key={form === 'new' ? 'new' : form.id}
            page={form === 'new' ? null : form}
            onClose={() => setForm(null)}
          />
        )}
      </Sheet>
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

/** Sayfa Ekle / Düzenle formu: ad, zengin içerik ve yasal bağlantı radyoları. */
function PageForm({ page, onClose }: { page: SitePage | null; onClose: () => void }) {
  const [title, setTitle] = useState(page?.title ?? '');
  const [content, setContent] = useState(page?.content ?? '');
  const [legal, setLegal] = useState<LegalDocType>(page?.legal ?? 'yok');
  const [touched, setTouched] = useState(false);
  const error = touched && !title.trim() ? 'Sayfa adı zorunlu.' : undefined;

  return (
    <form
      aria-label={page ? 'Sayfa düzenleme formu' : 'Yeni sayfa formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
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
      <RichTextField
        label="Sayfa İçeriği"
        value={content}
        onChange={setContent}
        rows={12}
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

      <Alert tone="info">
        <span id="sayfa-form-notice">
          Kayıt backend bağlantısı gelince açılacak; form yalnızca taslak tutar.
        </span>
      </Alert>
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button flow={false} type="submit" fullWidth={false} disabled aria-describedby="sayfa-form-notice">
          Kaydet
        </Button>
      </div>
    </form>
  );
}
