import { useState } from 'react';
import { LayoutTemplate, Plus } from 'lucide-react';
import { WIDGET_LAYOUTS, type WidgetDto } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SelectField } from './SiteSelect';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError, imageAddress } from '../../../lib/catalog-data';
import { WIDGETS, WIDGET_TYPES } from '../../../mocks/ecommerce-settings';
import { useSiteList } from '../hooks/useSiteList';
import { fileToDataUrl, siteService } from '../services/site.service';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import { WidgetLayoutPicker } from './WidgetLayoutPicker';
import { WidgetDataPicker } from './WidgetDataPicker';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DeleteAction,
  DisabledAction,
  EditAction,
  EmptyState,
  LoadingRows,
  ScreenCard,
  SortableRow,
} from './Parts';

/** Demo oturumunun yerel widget listesi (referansta boştur; sunucuya yazılmaz). */
const DEMO_WIDGETS: WidgetDto[] = WIDGETS.map((widget, index) => ({
  ...widget,
  order: index,
  imageId: null,
  imageUrl: null,
  settings: {},
}));

/**
 * Widget Yönetimi: sıralama sürükle-bırakla anında kaydedilir; widget görseli
 * `/api/site/gorseller` ucuna yüklenir ve kimliği widget kaydına yazılır.
 */
export function WidgetsScreen() {
  const { demo, items, setItems, loading, loaded, error, setError, refresh, reload } = useSiteList(
    DEMO_WIDGETS,
    siteService.widgets,
  );
  const [form, setForm] = useState<WidgetDto | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WidgetDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setNotice(null);
    try {
      await siteService.deleteWidget(pendingDelete.id);
      setPendingDelete(null);
      setNotice('Widget silindi.');
      await refresh();
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };

  /** Sıra ekranda hemen gösterilir, tek istekte yazılır; istek düşerse eski sıra geri gelir. */
  const reorder = async (next: WidgetDto[]) => {
    const previous = items;
    const ordered = next.map((widget, index) => ({ ...widget, order: index }));
    setItems(ordered);
    if (demo) return;
    setBusy(true);
    setNotice(null);
    try {
      await siteService.reorderWidgets(ordered.map((widget) => widget.id));
    } catch (e) {
      setItems(previous);
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

  const nextOrder = loaded ? items.reduce((max, widget) => Math.max(max, widget.order + 1), 0) : 0;

  return (
    <ScreenCard
      title="Widget Yönetimi"
      actions={
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
      }
    >
      <div className="space-y-3">
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
        <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Resim / Başlık</span>
          <span>Durum</span>
          <span className="text-right">İşlem</span>
        </div>
        {loading ? (
          <LoadingRows />
        ) : !loaded ? null : items.length === 0 ? (
          <EmptyState>Henüz widget yok.</EmptyState>
        ) : (
          <>
            <SortableList
              label="Widgetlar"
              items={items}
              getId={(widget) => widget.id}
              getLabel={(widget) => widget.name}
              disabled={busy}
              onReorder={(next) => void reorder(next)}
              renderItem={(widget, context) => (
                <SortableRow
                  context={context}
                  title={
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                        {widget.imageUrl ? (
                          <img
                            src={imageAddress(widget.imageUrl) ?? widget.imageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <LayoutTemplate className="size-4 text-ink-muted" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{widget.title || widget.name}</span>
                        <span className="block truncate text-xs font-medium text-ink-muted">
                          {widget.name}
                        </span>
                      </span>
                    </span>
                  }
                  meta={widget.imageUrl ? 'Görsel yüklendi' : 'Görsel yok'}
                  badges={
                    <Badge tone={widget.visible ? 'brand' : 'muted'}>
                      {widget.visible ? 'Görünür' : 'Gizli'}
                    </Badge>
                  }
                  actions={
                    <div className="flex shrink-0 items-center justify-end gap-1">
                      <EditAction
                        label={`${widget.name} widget'ını düzenle`}
                        onClick={() => {
                          setNotice(null);
                          setForm(widget);
                        }}
                      />
                      {demo ? (
                        <DisabledAction label={`${widget.name} widget'ını sil`} />
                      ) : (
                        <DeleteAction
                          label={`${widget.name} widget'ını sil`}
                          disabled={busy}
                          onClick={() => setPendingDelete(widget)}
                        />
                      )}
                    </div>
                  }
                />
              )}
            />
            <p className="text-xs text-ink-muted">Sıra, satırı sürüklediğinizde kaydedilir.</p>
          </>
        )}
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form === 'new' ? 'Widget Ekle' : "Widget'ı Düzenle"}
        description={
          demo
            ? 'Test modunda kayıt kapalıdır; alanlar yalnızca yerel önizleme içindir.'
            : 'Widget türü, görseli ve görünürlüğü.'
        }
        size="lg"
      >
        {form && (
          <WidgetForm
            key={form === 'new' ? 'new' : form.id}
            widget={form === 'new' ? null : form}
            order={nextOrder}
            demo={demo}
            onClose={() => setForm(null)}
            onSaved={handleSaved}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={!!pendingDelete}
        title="Widget'ı Sil"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” widget'ı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
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

function WidgetForm({
  widget,
  order,
  demo,
  onClose,
  onSaved,
}: {
  widget: WidgetDto | null;
  order: number;
  demo: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(widget?.name ?? '');
  const [type, setType] = useState<WidgetDto['type']>(widget?.type ?? 'slider');
  const [title, setTitle] = useState(widget?.title ?? '');
  const [settings, setSettings] = useState<Record<string, string>>(() => ({ ...widget?.settings }));
  const layout = settings.duzen ?? '';
  const setSetting = (key: string, value: string) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
  const [secondImage, setSecondImage] = useState<PickedImage | null>(() =>
    widget?.settings.ikinciGorselId
      ? {
          name: 'Kayıtlı görsel',
          url: imageAddress(`/api/site/gorseller/${widget.settings.ikinciGorselId}`) ?? '',
        }
      : null,
  );
  const [visible, setVisible] = useState(widget?.visible ?? true);
  const [image, setImage] = useState<PickedImage | null>(() =>
    widget?.imageUrl
      ? { name: 'Kayıtlı görsel', url: imageAddress(widget.imageUrl) ?? widget.imageUrl }
      : null,
  );
  const [imageId, setImageId] = useState<string | null>(widget?.imageId ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const nameError = touched && !name.trim() ? 'Widget adı gerekli.' : undefined;

  /** Gerçek oturumda dosya Base64'e çevrilip yüklenir; dönen kimlik widget kaydına yazılır. */
  const chooseImage = async (file: File | undefined, second = false) => {
    if (!file) return;
    if (demo) {
      pickImage(second ? secondImage : image, file, second ? setSecondImage : setImage);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await siteService.uploadImage('widget', await fileToDataUrl(file));
      if (second) {
        setSetting('ikinciGorselId', uploaded.id);
        setSecondImage({ name: file.name, url: imageAddress(uploaded.url) ?? uploaded.url });
      } else {
        setImageId(uploaded.id);
        setImage({ name: file.name, url: imageAddress(uploaded.url) ?? uploaded.url });
      }
    } catch (e) {
      setError(dataError(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setTouched(true);
    if (demo || saving || uploading || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await siteService.saveWidget(
        {
          name: name.trim(),
          type,
          title: title.trim(),
          visible,
          order: widget?.order ?? order,
          imageId,
          settings,
        },
        widget?.id,
      );
      await onSaved(widget ? 'Widget güncellendi.' : 'Widget eklendi.');
    } catch (e) {
      setError(dataError(e));
      setSaving(false);
    }
  };

  return (
    <form
      aria-label={widget ? 'Widget düzenleme formu' : 'Yeni widget formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <WidgetLayoutPicker
        value={layout}
        onChange={(value) => {
          const selected = WIDGET_LAYOUTS.find((item) => item.value === value)!;
          setType(selected.type);
          setSettings((previous) => ({
            ...previous,
            duzen: value,
            veriTuru: value === 'sekmeli-urun' ? 'kategori' : 'urun',
            veriKimlikleri:
              previous.veriTuru === (value === 'sekmeli-urun' ? 'kategori' : 'urun')
                ? (previous.veriKimlikleri ?? '')
                : '',
          }));
        }}
      />
      <TextField
        label="Widget Adı"
        required
        error={nameError}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      {!layout && (
        <SelectField
          label="Widget Türü"
          value={type}
          options={WIDGET_TYPES}
          onChange={(value) => setType(value as WidgetDto['type'])}
        />
      )}
      <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
      {layout && !layout.includes('banner') && (
        <WidgetDataPicker
          key={layout === 'sekmeli-urun' ? 'kategori' : 'urun'}
          type={layout === 'sekmeli-urun' ? 'kategori' : 'urun'}
          ids={settings.veriKimlikleri ?? ''}
          demo={demo}
          onChange={(value) => setSetting('veriKimlikleri', value)}
        />
      )}
      {layout && (
        <>
          <TextAreaField
            label="Açıklama"
            value={settings.aciklama ?? ''}
            maxLength={2000}
            onChange={(event) => setSetting('aciklama', event.target.value)}
          />
          <TextField
            label="Bağlantı"
            hint="Örn. /kampanyalar veya https://example.com"
            value={settings.link ?? ''}
            maxLength={300}
            onChange={(event) => setSetting('link', event.target.value)}
          />
        </>
      )}
      <ImagePicker
        label="Widget Görseli"
        hint="Genişlik en çok 1600 piksel; kare veya yatay görsel önerilir."
        value={image}
        busy={uploading}
        note={
          demo
            ? undefined
            : imageId
              ? 'Görsel sunucuya yüklendi.'
              : 'Görsel seçmezseniz widget simgeyle gösterilir.'
        }
        onPick={(file) => void chooseImage(file)}
        onClear={() => {
          setImage(null);
          setImageId(null);
        }}
      />
      {layout === 'ikili-banner' && (
        <>
          <ImagePicker
            label="İkinci Banner Görseli"
            value={secondImage}
            busy={uploading}
            onPick={(file) => void chooseImage(file, true)}
            onClear={() => {
              setSecondImage(null);
              setSetting('ikinciGorselId', '');
            }}
          />
          <TextField
            label="İkinci Banner Başlığı"
            value={settings.ikinciBaslik ?? ''}
            maxLength={120}
            onChange={(event) => setSetting('ikinciBaslik', event.target.value)}
          />
          <TextField
            label="İkinci Banner Bağlantısı"
            value={settings.ikinciLink ?? ''}
            maxLength={300}
            onChange={(event) => setSetting('ikinciLink', event.target.value)}
          />
        </>
      )}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Görünürlük</span>
        <ToggleSwitch label="Widget görünür" checked={visible} onChange={setVisible} />
        <span className="text-sm text-ink-muted">{visible ? 'Görünür' : 'Gizli'}</span>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button
          flow={false}
          type="submit"
          fullWidth={false}
          disabled={demo || saving || uploading}
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
